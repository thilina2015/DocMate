const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DB_PATH = process.env.VERCEL ? "/tmp/docmate.db" : path.join(__dirname, "docmate.db");
const UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : path.join(__dirname, "uploads");

try { if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}

let db;
try { db = new sqlite3.Database(DB_PATH); } catch (e) { db = { run: () => {}, get: () => {}, all: () => {}, serialize: (cb) => cb() }; }

if (db && db.serialize) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, name TEXT, email TEXT UNIQUE, password_hash TEXT, approved INTEGER DEFAULT 1)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctor_profiles (user_id INTEGER PRIMARY KEY, doctor_id TEXT, hospital TEXT, specialization TEXT, service_duration TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS patient_profiles (user_id INTEGER PRIMARY KEY, dob TEXT, blood_group TEXT, past_injuries TEXT, past_illness TEXT, weight REAL, height REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctor_updates (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_user_id INTEGER, doctor_user_id INTEGER, title TEXT, illness TEXT, medicines TEXT, notes TEXT, report_file TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  });
}

app.set("view engine", "ejs");
// PATH FIX: No "../" because server.js is in the root
app.set("views", path.join(__dirname, "frontend", "views"));
app.use(express.static(path.join(__dirname, "frontend", "public")));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let sessionStore;
try { sessionStore = new SQLiteStore({ db: "sessions.db", dir: process.env.VERCEL ? "/tmp" : __dirname }); } catch (e) { sessionStore = undefined; }

app.use(session({
    store: sessionStore,
    secret: "docmate_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 6 }
}));

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session.user) return res.redirect("/login");
        if (!roles.includes(req.session.user.role)) return res.status(403).send("Forbidden");
        next();
    };
}

app.use((req, res, next) => {
    res.locals.me = req.session.user || null;
    res.locals.flash = req.session.flash || null;
    req.session.flash = null;
    next();
});

// Routes
app.get("/", (req, res) => res.render("home"));
app.get("/login", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.redirect("/login");
        req.session.user = user;
        res.redirect(user.role === "patient" ? "/patient/profile" : "/doctor");
    });
});

app.get("/patient/profile", requireRole("patient"), (req, res) => {
    db.get(`SELECT * FROM users u LEFT JOIN patient_profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.session.user.id], (err, profile) => {
        db.all(`SELECT * FROM doctor_updates WHERE patient_user_id = ?`, [req.session.user.id], (e2, updates) => {
            res.render("patient_profile", { profile, updates });
        });
    });
});

if (!process.env.VERCEL) { app.listen(PORT, () => console.log(`Run on ${PORT}`)); }
module.exports = app;

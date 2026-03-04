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

// Use /tmp for Vercel or local directory
const DB_PATH = process.env.VERCEL 
  ? "/tmp/docmate.db" 
  : path.join(__dirname, "docmate.db");
const UPLOAD_DIR = process.env.VERCEL 
  ? "/tmp/uploads" 
  : path.join(__dirname, "uploads");

try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  console.log("Could not create uploads directory:", e.message);
}

let db;
try {
  db = new sqlite3.Database(DB_PATH);
} catch (e) {
  console.error("Database initialization error:", e.message);
  db = { run: () => {}, get: () => {}, all: () => {}, serialize: (cb) => cb() };
}

if (db && db.serialize) {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS doctor_profiles (
        user_id INTEGER PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        hospital TEXT NOT NULL,
        specialization TEXT NOT NULL,
        service_duration TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        user_id INTEGER PRIMARY KEY,
        dob TEXT,
        blood_group TEXT,
        past_injuries TEXT,
        past_illness TEXT,
        weight REAL,
        height REAL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS doctor_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_user_id INTEGER NOT NULL,
        doctor_user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        illness TEXT,
        medicines TEXT,
        notes TEXT,
        report_file TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_user_id) REFERENCES users(id),
        FOREIGN KEY(doctor_user_id) REFERENCES users(id)
      )
    `);

    const adminEmail = "admin@docmate.local";
    const adminPass = "admin123";

    db.get(`SELECT id FROM users WHERE email = ?`, [adminEmail], (err, row) => {
      if (!row) {
        const hash = bcrypt.hashSync(adminPass, 10);
        db.run(
          `INSERT INTO users (role, name, email, password_hash, approved) VALUES (?, ?, ?, ?, 1)`,
          ["admin", "DocMate Admin", adminEmail, hash]
        );
      }
    });
  });
}

// --- FIXED PATHS START HERE ---
app.set("view engine", "ejs");
// Removed "../" because server.js is in the same folder as the frontend folder
app.set("views", path.join(__dirname, "frontend", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Removed "../" because server.js is in the same folder as the frontend folder
app.use(express.static(path.join(__dirname, "frontend", "public")));
app.use("/uploads", express.static(UPLOAD_DIR));
// --- FIXED PATHS END HERE ---

let sessionStore;
try {
  sessionStore = new SQLiteStore({ 
    db: process.env.VERCEL ? "sessions.db" : "sessions.db", 
    dir: process.env.VERCEL ? "/tmp" : __dirname 
  });
} catch (e) {
  console.log("SQLiteStore failed, using memory store:", e.message);
  sessionStore = undefined;
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "docmate_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 6 }
  })
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// Auth Middleware & Helpers
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect("/login");
    if (!roles.includes(req.session.user.role)) return res.status(403).send("Forbidden");
    next();
  };
}

function setFlash(req, msg, type = "info") {
  req.session.flash = { msg, type };
}
function consumeFlash(req) {
  const f = req.session.flash;
  req.session.flash = null;
  return f;
}

app.use((req, res, next) => {
  res.locals.me = req.session.user || null;
  res.locals.flash = consumeFlash(req);
  next();
});

// Routes
app.get("/health", (req, res) => res.status(200).json({ ok: true }));
app.get("/", (req, res) => res.render("home"));
app.get("/register", (req, res) => res.render("register_choice"));
app.get("/register/patient", (req, res) => res.render("register_patient"));
app.get("/register/doctor", (req, res) => res.render("register_doctor"));

app.post("/register/patient", async (req, res) => {
  const { name, email, password, dob, blood_group, past_injuries, past_illness, weight, height } = req.body;
  if (!name || !email || !password) {
    setFlash(req, "Please fill required fields.", "warning");
    return res.redirect("/register/patient");
  }
  const hash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (role, name, email, password_hash, approved) VALUES (?, ?, ?, ?, 1)`,
    ["patient", name.trim(), String(email).toLowerCase(), hash],
    function (err) {
      if (err) {
        setFlash(req, "Email already exists.", "warning");
        return res.redirect("/register/patient");
      }
      db.run(
        `INSERT INTO patient_profiles (user_id, dob, blood_group, past_injuries, past_illness, weight, height) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [this.lastID, dob, blood_group, past_injuries, past_illness, weight, height],
        () => {
          setFlash(req, "Account created. Please login.", "success");
          res.redirect("/login");
        }
      );
    }
  );
});

app.post("/register/doctor", async (req, res) => {
  const { name, email, password, doctor_id, hospital, specialization, service_duration } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (role, name, email, password_hash, approved) VALUES (?, ?, ?, ?, 0)`,
    ["doctor", name.trim(), String(email).toLowerCase(), hash],
    function (err) {
      if (err) {
        setFlash(req, "Email already exists.", "warning");
        return res.redirect("/register/doctor");
      }
      db.run(
        `INSERT INTO doctor_profiles (user_id, doctor_id, hospital, specialization, service_duration) VALUES (?, ?, ?, ?, ?)`,
        [this.lastID, doctor_id, hospital, specialization, service_duration],
        () => {
          setFlash(req, "Submitted. Wait for admin approval.", "info");
          res.redirect("/login");
        }
      );
    }
  );
});

app.get("/login", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [String(email).toLowerCase()], async (err, user) => {
    if (err || !user || !(await bcrypt.compare(password, user.password_hash))) {
      setFlash(req, "Invalid credentials.", "warning");
      return res.redirect("/login");
    }
    if (user.role === "doctor" && user.approved === 0) {
      setFlash(req, "Account not approved yet.", "warning");
      return res.redirect("/login");
    }
    req.session.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    res.redirect(user.role === "patient" ? "/patient/profile" : (user.role === "doctor" ? "/doctor" : "/admin"));
  });
});

app.post("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

app.get("/patient/profile", requireRole("patient"), (req, res) => {
  db.get(`SELECT u.*, p.* FROM users u LEFT JOIN patient_profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.session.user.id], (err, profile) => {
    db.all(`SELECT du.*, doc.name AS doctor_name FROM doctor_updates du JOIN users doc ON doc.id = du.doctor_user_id WHERE du.patient_user_id = ? ORDER BY du.created_at DESC`, [req.session.user.id], (e2, updates) => {
      res.render("patient_profile", { profile, updates: updates || [] });
    });
  });
});

app.get("/doctor", requireRole("doctor"), (req, res) => {
  db.get(`SELECT u.*, d.* FROM users u LEFT JOIN doctor_profiles d ON d.user_id = u.id WHERE u.id = ?`, [req.session.user.id], (err, doctor) => {
    res.render("doctor_dashboard", { doctor, results: null, q: "" });
  });
});

app.get("/doctor/search", requireRole("doctor"), (req, res) => {
  const q = `%${req.query.q}%`;
  db.all(`SELECT id, name, email FROM users WHERE role = 'patient' AND (name LIKE ? OR CAST(id AS TEXT) LIKE ?)`, [q, q], (err, results) => {
    db.get(`SELECT u.*, d.* FROM users u LEFT JOIN doctor_profiles d ON d.user_id = u.id WHERE u.id = ?`, [req.session.user.id], (e2, doctor) => {
      res.render("doctor_dashboard", { doctor, results, q: req.query.q });
    });
  });
});

app.get("/doctor/patient/:id", requireRole("doctor"), (req, res) => {
  db.get(`SELECT u.*, p.* FROM users u LEFT JOIN patient_profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.params.id], (err, patient) => {
    db.all(`SELECT du.*, doc.name AS doctor_name FROM doctor_updates du JOIN users doc ON doc.id = du.doctor_user_id WHERE du.patient_user_id = ? ORDER BY du.created_at DESC`, [req.params.id], (e2, updates) => {
      res.render("doctor_patient_view", { patient, updates: updates || [] });
    });
  });
});

app.post("/doctor/patient/:id/update", requireRole("doctor"), upload.single("report_file"), (req, res) => {
  const reportFile = req.file ? `/uploads/${req.file.filename}` : null;
  db.run(`INSERT INTO doctor_updates (patient_user_id, doctor_user_id, title, illness, medicines, notes, report_file) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.params.id, req.session.user.id, req.body.title, req.body.illness, req.body.medicines, req.body.notes, reportFile],
    () => {
      setFlash(req, "Update added.", "success");
      res.redirect(`/doctor/patient/${req.params.id}`);
    }
  );
});

app.get("/admin", requireRole("admin"), (req, res) => {
  db.all(`SELECT u.*, d.* FROM users u LEFT JOIN doctor_profiles d ON d.user_id = u.id WHERE u.role = 'doctor' ORDER BY u.approved ASC`, (err, doctors) => {
    res.render("admin_dashboard", { doctors });
  });
});

app.post("/admin/approve/:id", requireRole("admin"), (req, res) => {
  db.run(`UPDATE users SET approved = 1 WHERE id = ?`, [req.params.id], () => res.redirect("/admin"));
});

// Final Deployment Setup
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`DocMate running on port ${PORT}`));
}

module.exports = app;
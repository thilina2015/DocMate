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

const DB_PATH = path.join(__dirname, "docmate.db");
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const db = new sqlite3.Database(DB_PATH);

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
    if (err) console.log(err);
    if (!row) {
      const hash = bcrypt.hashSync(adminPass, 10);
      db.run(
        `INSERT INTO users (role, name, email, password_hash, approved) VALUES (?, ?, ?, ?, 1)`,
        ["admin", "DocMate Admin", adminEmail, hash],
        (e) => {
          if (e) console.log(e);
          else console.log("Admin created: admin@docmate.local / admin123");
        }
      );
    }
  });
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: __dirname }),
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

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

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
        setFlash(req, "Email already exists or invalid data.", "warning");
        return res.redirect("/register/patient");
      }
      const userId = this.lastID;

      db.run(
        `INSERT INTO patient_profiles (user_id, dob, blood_group, past_injuries, past_illness, weight, height)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          dob || null,
          blood_group || null,
          past_injuries || null,
          past_illness || null,
          weight ? Number(weight) : null,
          height ? Number(height) : null
        ],
        () => {
          setFlash(req, "Patient account created. Please login.", "success");
          res.redirect("/login");
        }
      );
    }
  );
});

app.post("/register/doctor", async (req, res) => {
  const { name, email, password, doctor_id, hospital, specialization, service_duration } = req.body;

  if (!name || !email || !password || !doctor_id || !hospital || !specialization || !service_duration) {
    setFlash(req, "Please fill all doctor registration fields.", "warning");
    return res.redirect("/register/doctor");
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (role, name, email, password_hash, approved) VALUES (?, ?, ?, ?, 0)`,
    ["doctor", name.trim(), String(email).toLowerCase(), hash],
    function (err) {
      if (err) {
        setFlash(req, "Email already exists or invalid data.", "warning");
        return res.redirect("/register/doctor");
      }
      const userId = this.lastID;

      db.run(
        `INSERT INTO doctor_profiles (user_id, doctor_id, hospital, specialization, service_duration)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, doctor_id, hospital, specialization, service_duration],
        () => {
          setFlash(req, "Doctor registration submitted. Wait for admin approval.", "info");
          res.redirect("/login");
        }
      );
    }
  );
});

app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [String(email || "").toLowerCase()], async (err, user) => {
    if (err || !user) {
      setFlash(req, "Invalid email or password.", "warning");
      return res.redirect("/login");
    }

    const ok = await bcrypt.compare(password || "", user.password_hash);
    if (!ok) {
      setFlash(req, "Invalid email or password.", "warning");
      return res.redirect("/login");
    }

    if (user.role === "doctor" && user.approved === 0) {
      setFlash(req, "Your doctor account is not approved yet.", "warning");
      return res.redirect("/login");
    }

    req.session.user = { id: user.id, role: user.role, name: user.name, email: user.email };

    if (user.role === "patient") return res.redirect("/patient/profile");
    if (user.role === "doctor") return res.redirect("/doctor");
    return res.redirect("/admin");
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/patient/profile", requireRole("patient"), (req, res) => {
  const uid = req.session.user.id;

  db.get(
    `SELECT u.id, u.name, u.email, p.*
     FROM users u
     LEFT JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [uid],
    (err, profile) => {
      if (err || !profile) return res.status(404).send("Profile not found");

      db.all(
        `SELECT du.*, doc.name AS doctor_name
         FROM doctor_updates du
         JOIN users doc ON doc.id = du.doctor_user_id
         WHERE du.patient_user_id = ?
         ORDER BY du.created_at DESC`,
        [uid],
        (e2, updates) => res.render("patient_profile", { profile, updates: updates || [] })
      );
    }
  );
});

app.get("/patient/profile/edit", requireRole("patient"), (req, res) => {
  const uid = req.session.user.id;
  db.get(
    `SELECT u.id, u.name, u.email, p.*
     FROM users u
     LEFT JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [uid],
    (err, profile) => {
      if (err || !profile) return res.status(404).send("Profile not found");
      res.render("patient_edit", { profile });
    }
  );
});

app.post("/patient/profile/edit", requireRole("patient"), (req, res) => {
  const uid = req.session.user.id;
  const { name, dob, blood_group, past_injuries, past_illness, weight, height } = req.body;

  db.run(`UPDATE users SET name = ? WHERE id = ?`, [name || "Patient", uid], () => {
    db.run(
      `UPDATE patient_profiles
       SET dob = ?, blood_group = ?, past_injuries = ?, past_illness = ?, weight = ?, height = ?
       WHERE user_id = ?`,
      [
        dob || null,
        blood_group || null,
        past_injuries || null,
        past_illness || null,
        weight ? Number(weight) : null,
        height ? Number(height) : null,
        uid
      ],
      () => {
        req.session.user.name = name || req.session.user.name;
        setFlash(req, "Profile updated.", "success");
        res.redirect("/patient/profile");
      }
    );
  });
});

app.get("/doctor", requireRole("doctor"), (req, res) => {
  const uid = req.session.user.id;
  db.get(
    `SELECT u.id, u.name, u.email, d.*
     FROM users u
     LEFT JOIN doctor_profiles d ON d.user_id = u.id
     WHERE u.id = ?`,
    [uid],
    (err, doctor) => res.render("doctor_dashboard", { doctor, results: null, q: "" })
  );
});

app.get("/doctor/search", requireRole("doctor"), (req, res) => {
  const q = String(req.query.q || "").trim();
  const uid = req.session.user.id;

  db.get(
    `SELECT u.id, u.name, u.email, d.*
     FROM users u
     LEFT JOIN doctor_profiles d ON d.user_id = u.id
     WHERE u.id = ?`,
    [uid],
    (err, doctor) => {
      if (!q) return res.render("doctor_dashboard", { doctor, results: [], q: "" });

      const like = `%${q}%`;
      db.all(
        `SELECT u.id, u.name, u.email
         FROM users u
         WHERE u.role = 'patient'
           AND (CAST(u.id AS TEXT) LIKE ? OR u.name LIKE ?)
         ORDER BY u.id DESC
         LIMIT 30`,
        [like, like],
        (e2, results) => res.render("doctor_dashboard", { doctor, results: results || [], q })
      );
    }
  );
});

app.get("/doctor/patient/:id", requireRole("doctor"), (req, res) => {
  const patientId = Number(req.params.id);

  db.get(
    `SELECT u.id, u.name, u.email, p.*
     FROM users u
     LEFT JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = ? AND u.role = 'patient'`,
    [patientId],
    (err, patient) => {
      if (err || !patient) return res.status(404).send("Patient not found");

      db.all(
        `SELECT du.*, doc.name AS doctor_name
         FROM doctor_updates du
         JOIN users doc ON doc.id = du.doctor_user_id
         WHERE du.patient_user_id = ?
         ORDER BY du.created_at DESC`,
        [patientId],
        (e2, updates) => res.render("doctor_patient_view", { patient, updates: updates || [] })
      );
    }
  );
});

app.post("/doctor/patient/:id/update", requireRole("doctor"), upload.single("report_file"), (req, res) => {
  const patientId = Number(req.params.id);
  const doctorId = req.session.user.id;

  const { title, illness, medicines, notes } = req.body;
  const reportFile = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title) {
    setFlash(req, "Title is required.", "warning");
    return res.redirect(`/doctor/patient/${patientId}`);
  }

  db.run(
    `INSERT INTO doctor_updates (patient_user_id, doctor_user_id, title, illness, medicines, notes, report_file)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patientId, doctorId, title, illness || null, medicines || null, notes || null, reportFile],
    (err) => {
      if (err) {
        setFlash(req, "Could not add update. Try again.", "warning");
        return res.redirect(`/doctor/patient/${patientId}`);
      }
      setFlash(req, "Update added to patient profile.", "success");
      res.redirect(`/doctor/patient/${patientId}`);
    }
  );
});

app.get("/admin", requireRole("admin"), (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.email, u.approved, d.doctor_id, d.hospital, d.specialization, d.service_duration
     FROM users u
     LEFT JOIN doctor_profiles d ON d.user_id = u.id
     WHERE u.role = 'doctor'
     ORDER BY u.approved ASC, u.id DESC`,
    [],
    (err, doctors) => res.render("admin_dashboard", { doctors: doctors || [] })
  );
});

app.post("/admin/approve/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  db.run(`UPDATE users SET approved = 1 WHERE id = ? AND role = 'doctor'`, [id], () => {
    setFlash(req, "Doctor approved.", "success");
    res.redirect("/admin");
  });
});

app.post("/admin/reject/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  db.run(`DELETE FROM doctor_profiles WHERE user_id = ?`, [id], () => {
    db.run(`DELETE FROM users WHERE id = ? AND role = 'doctor'`, [id], () => {
      setFlash(req, "Doctor rejected and removed.", "info");
      res.redirect("/admin");
    });
  });
});

const server =app.listen(PORT, "0.0.0.0", () => {
  console.log(`DocMate running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

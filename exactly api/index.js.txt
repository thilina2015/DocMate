const express = require("express");
const app = express();

app.use(express.json());

// test route
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "DocMate backend working on Vercel" });
});

// IMPORTANT: no app.listen() here
module.exports = app;
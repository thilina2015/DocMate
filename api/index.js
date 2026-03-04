// Export the complete backend server for Vercel serverless function
let app;
try {
  app = require("../backend/server.js");
} catch (error) {
  console.error("Failed to load server:", error);
  // Fallback minimal app if server fails to load
  const express = require("express");
  app = express();
  app.get("/", (req, res) => {
    res.status(500).json({ error: "Server failed to initialize", message: error.message });
  });
}

module.exports = app;
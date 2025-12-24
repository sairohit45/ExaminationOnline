/**
 * MySQL Backend Server for Online Exam
 * FINAL WORKING VERSION
 */

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = 3001;

// ===============================
// Middleware
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// Root Route
// ===============================
app.get("/", (req, res) => {
  res.send("Online Exam Backend is running 🚀");
});

// ===============================
// MySQL Connection
// ===============================
const pool = mysql.createPool({
  host: "mysql.railway.internal",
  user: "root",
  password: "password",   // 🔴 change if needed
  database: "exam_db",
  port: 3306,
});

// ===============================
// Test Database Connection
// ===============================
app.get("/api/test", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "Database connected successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ===============================
// Submit Exam Response
// ===============================
app.post("/api/submit-exam", async (req, res) => {
  try {
    console.log("REQUEST BODY:", req.body);

    const {
      roll_number,
      name,
      department = "",
      section = "",
      score,
      total_questions,
      was_tab_switched = 0,
    } = req.body;

    // Validation
    if (!roll_number || !name || score == null || total_questions == null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        received: req.body,
      });
    }

    const sql = `
      INSERT INTO exam_responses
      (roll_number, name, department, section, score, total_questions, was_tab_switched)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score = VALUES(score),
        total_questions = VALUES(total_questions),
        was_tab_switched = VALUES(was_tab_switched),
        submitted_at = CURRENT_TIMESTAMP
    `;

    await pool.execute(sql, [
      roll_number,
      name,
      department,
      section,
      score,
      total_questions,
      was_tab_switched,
    ]);

    res.json({
      success: true,
      message: "Exam submitted successfully",
    });

  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ===============================
// Get All Exam Responses (Admin)
// ===============================
app.get("/api/responses", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM exam_responses ORDER BY submitted_at DESC"
    );
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log("=================================");
  console.log(`✅ Server running on http://mysql.railway.internal:${PORT}`);
  console.log("=================================");
});
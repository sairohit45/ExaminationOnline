/**
 * MySQL Backend Server for Online Exam
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new folder on your server and copy this file there
 * 2. Run: npm init -y
 * 3. Run: npm install express mysql2 cors
 * 4. Update the MySQL connection details below
 * 5. Run: node server.js
 * 
 * The server will run on port 3001 by default
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Configuration
// UPDATE THESE WITH YOUR ACTUAL DATABASE CREDENTIALS
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'your_password_here',  // Change this!
  database: 'exam_db'
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as result');
    res.json({ success: true, message: 'Database connected successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit exam response
app.post('/api/submit-exam', async (req, res) => {
  try {
    const {
      roll_number,
      name,
      department,
      section,
      score,
      total_questions,
      was_tab_switched,
      submitted_at
    } = req.body;

    const query = `
      INSERT INTO exam_responses 
      (roll_number, name, department, section, score, total_questions, was_tab_switched, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      roll_number,
      name,
      department,
      section,
      score,
      total_questions,
      was_tab_switched,
      submitted_at || new Date()
    ]);

    res.json({ success: true, message: 'Exam submitted successfully!' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'This roll number has already submitted the exam' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Check if roll number exists
app.get('/api/check-roll/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM exam_responses WHERE roll_number = ?',
      [rollNumber]
    );
    res.json({ exists: rows[0].count > 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all exam responses (for admin)
app.get('/api/responses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exam_responses ORDER BY submitted_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get exam statistics
app.get('/api/stats', async (req, res) => {
  try {
    const [count] = await pool.query('SELECT COUNT(*) as total FROM exam_responses');
    const [avgScore] = await pool.query('SELECT AVG(score) as average FROM exam_responses');
    const [tabSwitches] = await pool.query('SELECT COUNT(*) as count FROM exam_responses WHERE was_tab_switched = 1');

    res.json({
      success: true,
      data: {
        totalSubmissions: count[0].total,
        averageScore: Math.round(avgScore[0].average * 100) / 100,
        tabSwitchCount: tabSwitches[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/test - Test database connection');
  console.log('  POST /api/submit-exam - Submit exam response');
  console.log('  GET  /api/check-roll/:rollNumber - Check if roll number exists');
  console.log('  GET  /api/responses - Get all responses (admin)');
  console.log('  GET  /api/stats - Get exam statistics');
});

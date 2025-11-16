const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
router.use(auth);

router.post('/', async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user.id; // to get user ID from auth middleware

  try 
  {
    const newNote = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, content]
    );

    res.status(201).json(newNote.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


router.get('/', async (req, res) => {
  const userId = req.user.id; // to get user ID from auth middleware


  try 
  {
    const notes = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    if (notes.rows.length === 0) {
      return res.json([]);
    }

    res.json(notes.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
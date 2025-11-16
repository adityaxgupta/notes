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

router.put('/:id', async (req, res) => {
  const { title, content } = req.body;
  const noteId = req.params.id;
  const userId = req.user.id;

  try {
    //check if the note exists
    const note = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);

    if (note.rows.length === 0) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    //check if user owns the note
    if (note.rows[0].user_id !== userId) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    //update the note
    const updatedNote = await pool.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, noteId]
    );

    res.json(updatedNote.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;

  try {
    //check if the note exists
    const note = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);

    if (note.rows.length === 0) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    //check if user owns the note
    if (note.rows[0].user_id !== userId) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    //delete the note
    await pool.query('DELETE FROM notes WHERE id = $1', [noteId]);

    res.json({ msg: 'Note removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
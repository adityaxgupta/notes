const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth')

//REGISTER  A NEW USER ROUTE
router.post('/register', async(req, res)=>{
    const { email, password } = req.body;

    if (!email || !password)
    {
        return res.status(400).json({msg: 'Please enter all fields'});
    }

    try 
    {//if user exists 
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email,]);

        if (userExists.rows.length > 0)
        {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',[email, hashedPassword]
        );

        res.status(201).json(newUser.rows[0]);
    }
    catch (err)
    {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//LOGIN ROUTE
router.post('/login', async (req, res)=>{
    const { email, password } = req.body;

    if (!email || !password)
    {
        return res.status(400).json({ msg:'Please enter all fields' });
    }

    try
    {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email,]);
        if (result.rows.length === 0)
        {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const user = result.rows[0];

        if(!user.password)
        {
            return res.status(400).json({ msg: 'This account uses Google login. Please use Google Sign-In.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch)
        {
            return res.status(400).json({ msg: 'Invalid Credentials.' });
        }

        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload, process.env.JWT_SECRET, { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json ({ token });
            }
        );
    }
    catch (err)
    {
        console.log(err.message);
        res.status(500).send('Server error');
    }
});

router.get ('/', auth, async(req, res)=>
{
    try
    {
        const userId = req.user.id;

        const user = await pool.query(
            'SELECT id, email, created_at, google_id FROM users WHERE id = $1',[userId]);

        if (user.rows.length === 0) 
        {
            return res.status(404).json({ msg: 'User not found. Please create an account first.' });
        }

        res.json(user.rows[0]);
    }
    catch (err)
    {
        console.log(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
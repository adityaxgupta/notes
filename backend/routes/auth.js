const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const loginLimiter = require('../middleware/loginLimiter');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/api/auth/google/callback' // MUST match what you put in Google Console
);

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
router.post('/login', loginLimiter, async (req, res)=>{
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

//login with google
router.post('/google', async (req, res) => {
  const { code } = req.body;

  try {
    //exchange the 'code' for tokens (access_token, id_token)
    const { tokens } = await client.getToken(code);
    
    //verify the ID token to get the user's profile
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    // These are the fields Google gives us:
    const googleId = payload.sub; // 'sub' is the unique Google ID
    const email = payload.email;

    // check if user exists in our DB
    // We check BOTH email OR google_id to prevent duplicates
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    let user;

    if (userCheck.rows.length > 0) {
      //user exists
      user = userCheck.rows[0];

      //if they signed up with password before, link their Google ID now
      if (!user.google_id) {
        const updateUser = await pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
          [googleId, user.id]
        );
        user = updateUser.rows[0];
      }
    } else {
      //new user
      //create them (Password is NULL)
      const newUser = await pool.query(
        'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING *',
        [email, googleId]
      );
      user = newUser.rows[0];
    }

    //generate OUR JWT (Just like normal login)
    const payloadJwt = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payloadJwt,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token }); //send back our token
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Google Login Error');
  }
});

module.exports = router;
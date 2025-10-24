require ('dotenv').config();
const express =  require('express');
const { connectDB } = require('./config/db');
connectDB();    ;
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/api/test', (req, res)=>{
    res.json({message: 'All good'});
})

app.use('/api/auth', require('./routes/auth'));

app.listen(PORT, ()=>{
    console.log('Server is running');
})
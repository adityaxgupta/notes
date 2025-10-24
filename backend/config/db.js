const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const connectDB = async () => {
    try 
    {
        const client = await pool.connect();
        console.log(`PostgreSQL Connected: ${client.host}`);
        client.release(); 
    } 
    catch (error) 
    {
        console.error(`Error connecting to PostgreSQL: ${error.message}`);
        process.exit(1);
    }
};

module.exports =  { connectDB, pool };
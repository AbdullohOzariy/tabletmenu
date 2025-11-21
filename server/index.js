import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

// Database connection (we will configure this later)
/*
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
*/

app.use(cors());
app.use(express.json());

// Example route
app.get('/api/health', (req, res) => {
  res.send({ status: 'ok' });
});

// Add more routes for your data here

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

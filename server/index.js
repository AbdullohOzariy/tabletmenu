import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

// 1. Database Connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Render bilan ishlaganda SSL kerak bo'lishi mumkin
  // ssl: {
  //   rejectUnauthorized: false
  // }
});

// Databasega ulanishni tekshirish va jadvallarni yaratish
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("Database connected successfully!");

    // 2. Create 'categories' table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
    `);

    // 3. Create 'products' table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        image_url VARCHAR(255),
        category_id INTEGER REFERENCES categories(id)
      );
    `);

    console.log("Tables checked/created successfully.");
    client.release();
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1); // Exit if DB connection fails
  }
};

app.use(cors());
app.use(express.json());

// 4. API Routes
app.get('/api/health', (req, res) => {
  res.send({ status: 'ok' });
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all products (can be filtered by category_id)
app.get('/api/products', async (req, res) => {
  try {
    const { category_id } = req.query;
    let result;
    if (category_id) {
      result = await pool.query('SELECT * FROM products WHERE category_id = $1 ORDER BY name;', [category_id]);
    } else {
      result = await pool.query('SELECT * FROM products ORDER BY name;');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Serverni ishga tushirishdan oldin DB'ni tayyorlash
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

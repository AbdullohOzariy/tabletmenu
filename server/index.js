import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // Uncomment if needed on Render
});

// --- Database Initialization and Seeding ---
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("Database connected successfully!");

    // 1. Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sortOrder INT DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        image_url VARCHAR(255),
        category_id INTEGER REFERENCES categories(id),
        sortOrder INT DEFAULT 0
      );
    `);
    console.log("Tables checked/created successfully.");

    // 2. Seed data if tables are empty
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    if (categoriesResult.rows[0].count === '0') {
      console.log('Categories table is empty. Seeding data...');
      // Insert categories
      const seededCategories = await client.query(`
        INSERT INTO categories (name, sortOrder) VALUES
        ('Pitsalar', 1),
        ('Burgerlar', 2),
        ('Ichimliklar', 3),
        ('Salatlar', 4)
        RETURNING id, name;
      `);
      
      const categoryMap = new Map(seededCategories.rows.map(c => [c.name, c.id]));

      // Insert products
      await client.query(`
        INSERT INTO products (name, description, price, category_id, image_url) VALUES
        ('Margarita', 'Klassik pomidorli pitsa, motsarella pishlog''i va rayhon bilan', 65000, ${categoryMap.get('Pitsalar')}, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=2070&auto=format&fit=crop'),
        ('Pepperoni', 'Achchiq pepperoni kolbasasi va motsarella pishlog''i bilan', 75000, ${categoryMap.get('Pitsalar')}, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=2076&auto=format&fit=crop'),
        ('Cheeseburger', 'Mol go''shtidan kotlet, pishloq, salat bargi va maxsus sous bilan', 55000, ${categoryMap.get('Burgerlar')}, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'),
        ('Coca-Cola 0.5L', 'Muzdek Coca-Cola', 8000, ${categoryMap.get('Ichimliklar')}, 'https://images.unsplash.com/photo-1622483767028-3f66f32a2ea7?q=80&w=1974&auto=format&fit=crop'),
        ('Sezar Salati', 'Tovuq go''shti, Parmesan pishlog''i va Sezar sousi bilan klassik salat', 45000, ${categoryMap.get('Salatlar')}, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=2070&auto=format&fit=crop')
      `);
      console.log('Database has been seeded.');
    } else {
      console.log('Database already contains data. Skipping seed.');
    }

  } catch (err) {
    console.error('Failed to initialize or seed database:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/api/health', (req, res) => res.send({ status: 'ok' }));

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sortOrder;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category_id } = req.query;
    const query = category_id
      ? 'SELECT * FROM products WHERE category_id = $1 ORDER BY sortOrder;'
      : 'SELECT * FROM products ORDER BY sortOrder;';
    const params = category_id ? [category_id] : [];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Start Server ---
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

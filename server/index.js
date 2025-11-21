import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// --- Database Initialization and Seeding ---
const initializeDatabase = async () => {
  // ... (seeding logic remains the same, omitted for brevity)
  const client = await pool.connect();
  try {
    console.log("Database connected successfully!");
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, sortOrder INT DEFAULT 0);
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10, 2) NOT NULL, image_url VARCHAR(255), category_id INTEGER REFERENCES categories(id), sortOrder INT DEFAULT 0);
    `);
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    if (categoriesResult.rows[0].count === '0') {
      console.log('Categories table is empty. Seeding data...');
      const seededCategories = await client.query(`INSERT INTO categories (name, sortOrder) VALUES ('Pitsalar', 1), ('Burgerlar', 2), ('Ichimliklar', 3), ('Salatlar', 4) RETURNING id, name;`);
      const categoryMap = new Map(seededCategories.rows.map(c => [c.name, c.id]));
      await client.query(`INSERT INTO products (name, description, price, category_id, image_url) VALUES ('Margarita', 'Klassik pomidorli pitsa', 65000, ${categoryMap.get('Pitsalar')}, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=2070&auto=format&fit=crop'), ('Cheeseburger', 'Mol go''shtidan kotlet, pishloq', 55000, ${categoryMap.get('Burgerlar')}, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'), ('Coca-Cola 0.5L', 'Muzdek Coca-Cola', 8000, ${categoryMap.get('Ichimliklar')}, 'https://images.unsplash.com/photo-1622483767028-3f66f32a2ea7?q=80&w=1974&auto=format&fit=crop');`);
      console.log('Database has been seeded.');
    }
  } catch (err) {
    console.error('Failed to initialize or seed database:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// --- PUBLIC API Routes (for customer view) ---
app.get('/api/health', (req, res) => res.send({ status: 'ok' }));

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sortOrder;');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category_id } = req.query;
    const query = category_id ? 'SELECT * FROM products WHERE category_id = $1 ORDER BY sortOrder;' : 'SELECT * FROM products ORDER BY sortOrder;';
    const params = category_id ? [category_id] : [];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- ADMIN API Routes (for managing data) ---

// Create Category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, viewType, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      'INSERT INTO categories (name, sortOrder) VALUES ($1, $2) RETURNING *',
      [name, sortOrder || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sortOrder } = req.body;
    const result = await pool.query(
      'UPDATE categories SET name = $1, sortOrder = $2 WHERE id = $3 RETURNING *',
      [name, sortOrder, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Optional: Check if any products are using this category before deleting
    const productCheck = await pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [id]);
    if (productCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with associated products.' });
    }
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- Start Server ---
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

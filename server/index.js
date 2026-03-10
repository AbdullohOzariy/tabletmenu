// Force redeploy: 7
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Temporarily allow all origins for debugging
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Database Initialization ---
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("Database connected!");
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, sort_order INT DEFAULT 0, view_type VARCHAR(50) DEFAULT 'grid');
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10, 2) NOT NULL, image_url TEXT, category_id INTEGER REFERENCES categories(id), sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, is_featured BOOLEAN DEFAULT false, variants JSONB, badges JSONB, available_branch_ids JSONB);
      CREATE TABLE IF NOT EXISTS branches (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, address TEXT, phone VARCHAR(100), customColor VARCHAR(50), logoUrl TEXT);
      CREATE TABLE IF NOT EXISTS branding (id SERIAL PRIMARY KEY, settings JSONB);
    `);
    
    // Column name normalization
    const columns = [
        { table: 'categories', from: 'sortOrder', to: 'sort_order' },
        { table: 'categories', from: 'viewType', to: 'view_type' },
        { table: 'products', from: 'sortOrder', to: 'sort_order' },
        { table: 'products', from: 'isActive', to: 'is_active' },
        { table: 'products', from: 'isFeatured', to: 'is_featured' },
        { table: 'products', from: 'availableBranchIds', to: 'available_branch_ids' },
    ];
    for (const col of columns) {
        const res = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='${col.table}' AND column_name='${col.from}'`);
        if (res.rowCount > 0) {
            await client.query(`ALTER TABLE ${col.table} RENAME COLUMN "${col.from}" TO ${col.to};`);
        }
    }

  } catch (err) { console.error('DB init error:', err); } finally { client.release(); }
};

// --- API Routes ---
app.get('/api/health', (req, res) => res.send({ status: 'ok' }));

// Categories
app.get('/api/categories', async (req, res) => { try { const r = await pool.query('SELECT * FROM categories ORDER BY sort_order;'); res.json(r.rows); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/categories', async (req, res) => { try { const { name, sort_order, view_type } = req.body; const r = await pool.query('INSERT INTO categories (name, sort_order, view_type) VALUES ($1, $2, $3) RETURNING *', [name, sort_order || 0, view_type || 'grid']); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/categories/reorder', async (req, res) => {
    const { categories } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const cat of categories) {
            await client.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [cat.sort_order, cat.id]);
        }
        await client.query('COMMIT');
        res.status(204).send();
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});
app.put('/api/categories/:id', async (req, res) => { try { const { id } = req.params; const { name, sort_order, view_type } = req.body; const r = await pool.query('UPDATE categories SET name = $1, sort_order = $2, view_type = $3 WHERE id = $4 RETURNING *', [name, sort_order, view_type, id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ message: e.message }); } });
app.delete('/api/categories/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM products WHERE category_id = $1', [id]); await pool.query('DELETE FROM categories WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// Products
app.get('/api/products', async (req, res) => { try { const r = await pool.query('SELECT * FROM products ORDER BY sort_order;'); res.json(r.rows); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/products', async (req, res) => { try { const { name, description, price, category_id, image_url, sort_order, is_active, is_featured, variants, badges, available_branch_ids } = req.body; const r = await pool.query('INSERT INTO products (name, description, price, category_id, image_url, sort_order, is_active, is_featured, variants, badges, available_branch_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', [name, description, price, category_id, image_url, sort_order, is_active, is_featured, variants, badges, available_branch_ids]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/products/reorder', async (req, res) => {
    const { products } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const prod of products) {
            await client.query('UPDATE products SET sort_order = $1 WHERE id = $2', [prod.sort_order, prod.id]);
        }
        await client.query('COMMIT');
        res.status(204).send();
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, image_url, sort_order, is_active, is_featured, variants, badges, available_branch_ids } = req.body;
    const query = `
        UPDATE products
        SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5, sort_order = $6, is_active = $7, is_featured = $8, variants = $9, badges = $10, available_branch_ids = $11
        WHERE id = $12
        RETURNING *`;
    const values = [name, description, price, category_id, image_url, sort_order, is_active, is_featured, variants, badges, available_branch_ids, id];
    const r = await pool.query(query, values);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/products/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM products WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// Branches
app.get('/api/branches', async (req, res) => { try { const r = await pool.query('SELECT * FROM branches;'); res.json(r.rows); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/branches', async (req, res) => { try { const { name, address, phone, customColor, logoUrl } = req.body; const r = await pool.query('INSERT INTO branches (name, address, phone, customColor, logoUrl) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, address, phone, customColor, logoUrl]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/branches/:id', async (req, res) => { try { const { id } = req.params; const { name, address, phone, customColor, logoUrl } = req.body; const r = await pool.query('UPDATE branches SET name=$1, address=$2, phone=$3, customColor=$4, logoUrl=$5 WHERE id=$6 RETURNING *', [name, address, phone, customColor, logoUrl, id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ message: e.message }); } });
app.delete('/api/branches/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM branches WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// Branding
app.get('/api/branding', async (req, res) => { try { const r = await pool.query('SELECT settings FROM branding WHERE id = 1;'); res.json(r.rows[0]?.settings || {}); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/branding', async (req, res) => { try { const settings = req.body; const r = await pool.query('UPDATE branding SET settings = $1 WHERE id = 1 RETURNING settings;', [settings]); res.json(r.rows[0].settings); } catch (e) { res.status(500).json({ message: e.message }); } });

// --- Start Server ---
(async () => {
  console.log('Server starting...');
  try {
    await initializeDatabase();
    console.log('Database initialized.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();

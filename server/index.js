// Force redeploy: 1
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limitni oshirish (rasmlarni base64'da saqlash uchun)

// --- Database Initialization and Seeding ---
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("Database connected!");
    // Jadvallarni yaratish
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, sortOrder INT DEFAULT 0, viewType VARCHAR(50) DEFAULT 'grid');
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10, 2) NOT NULL, image_url TEXT, category_id INTEGER REFERENCES categories(id), sortOrder INT DEFAULT 0, isActive BOOLEAN DEFAULT true, isFeatured BOOLEAN DEFAULT false, variants JSONB, badges JSONB, availableBranchIds JSONB);
      CREATE TABLE IF NOT EXISTS branches (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, address TEXT, phone VARCHAR(100), customColor VARCHAR(50), logoUrl TEXT);
      CREATE TABLE IF NOT EXISTS branding (id SERIAL PRIMARY KEY, settings JSONB);
    `);
    
    // Boshlang'ich ma'lumotlar (agar kerak bo'lsa)
    const branchCount = await client.query('SELECT COUNT(*) FROM branches');
    if (branchCount.rows[0].count === '0') {
        console.log('Seeding initial branch...');
        await client.query(`INSERT INTO branches (name, address, phone) VALUES ('Asosiy Filial', 'Toshkent sh, Amir Temur ko''chasi, 100', '+998901234567')`);
    }
    const brandingCount = await client.query('SELECT COUNT(*) FROM branding');
    if (brandingCount.rows[0].count === '0') {
        console.log('Seeding initial branding...');
        await client.query(`INSERT INTO branding (id, settings) VALUES (1, '${JSON.stringify({ restaurantName: 'Mening Restoranim' })}')`);
    }

  } catch (err) { console.error('DB init error:', err); } finally { client.release(); }
};

// --- API Routes ---
app.get('/api/health', (req, res) => res.send({ status: 'ok' }));

// Categories
app.get('/api/categories', async (req, res) => { try { const r = await pool.query('SELECT * FROM categories ORDER BY sortOrder;'); res.json(r.rows); } catch (e) { res.status(500).json({e}); } });
app.post('/api/categories', async (req, res) => { try { const { name, sortOrder, viewType } = req.body; const r = await pool.query('INSERT INTO categories (name, sortOrder, viewType) VALUES ($1, $2, $3) RETURNING *', [name, sortOrder || 0, viewType || 'grid']); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.put('/api/categories/:id', async (req, res) => { try { const { id } = req.params; const { name, sortOrder, viewType } = req.body; const r = await pool.query('UPDATE categories SET name = $1, sortOrder = $2, viewType = $3 WHERE id = $4 RETURNING *', [name, sortOrder, viewType, id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.delete('/api/categories/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM categories WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({e}); } });

// Products
app.get('/api/products', async (req, res) => { try { const r = await pool.query('SELECT * FROM products ORDER BY sortOrder;'); res.json(r.rows); } catch (e) { res.status(500).json({e}); } });
app.post('/api/products', async (req, res) => { try { const { name, description, price, category_id, image_url, sortOrder, isActive, isFeatured, variants, badges, availableBranchIds } = req.body; const r = await pool.query('INSERT INTO products (name, description, price, category_id, image_url, sortOrder, isActive, isFeatured, variants, badges, availableBranchIds) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', [name, description, price, category_id, image_url, sortOrder, isActive, isFeatured, variants, badges, availableBranchIds]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.put('/api/products/:id', async (req, res) => { try { const { id } = req.params; const { name, description, price, category_id, image_url, sortOrder, isActive, isFeatured, variants, badges, availableBranchIds } = req.body; const r = await pool.query('UPDATE products SET name=$1, description=$2, price=$3, category_id=$4, image_url=$5, sortOrder=$6, isActive=$7, isFeatured=$8, variants=$9, badges=$10, availableBranchIds=$11 WHERE id=$12 RETURNING *', [name, description, price, category_id, image_url, sortOrder, isActive, isFeatured, variants, badges, availableBranchIds, id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.delete('/api/products/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM products WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({e}); } });

// Branches
app.get('/api/branches', async (req, res) => { try { const r = await pool.query('SELECT * FROM branches;'); res.json(r.rows); } catch (e) { res.status(500).json({e}); } });
app.post('/api/branches', async (req, res) => { try { const { name, address, phone, customColor, logoUrl } = req.body; const r = await pool.query('INSERT INTO branches (name, address, phone, customColor, logoUrl) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, address, phone, customColor, logoUrl]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.put('/api/branches/:id', async (req, res) => { try { const { id } = req.params; const { name, address, phone, customColor, logoUrl } = req.body; const r = await pool.query('UPDATE branches SET name=$1, address=$2, phone=$3, customColor=$4, logoUrl=$5 WHERE id=$6 RETURNING *', [name, address, phone, customColor, logoUrl, id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({e}); } });
app.delete('/api/branches/:id', async (req, res) => { try { const { id } = req.params; await pool.query('DELETE FROM branches WHERE id = $1', [id]); res.status(204).send(); } catch (e) { res.status(500).json({e}); } });

// Branding
app.get('/api/branding', async (req, res) => { try { const r = await pool.query('SELECT settings FROM branding WHERE id = 1;'); res.json(r.rows[0]?.settings || {}); } catch (e) { res.status(500).json({e}); } });
app.put('/api/branding', async (req, res) => { try { const settings = req.body; const r = await pool.query('UPDATE branding SET settings = $1 WHERE id = 1 RETURNING settings;', [settings]); res.json(r.rows[0].settings); } catch (e) { res.status(500).json({e}); } });

// --- Start Server ---
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

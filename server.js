const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('restaurant.db');

// Initialize database
db.serialize(() => {
  // Categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_thai TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Menu items table
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_thai TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    category_id INTEGER,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  // Tables table
  db.run(`CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER UNIQUE NOT NULL,
    qr_code TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables (id)
  )`);

  // Order items table
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    menu_item_id INTEGER,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'queued',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
  )`);

  // Insert default categories
  db.run(`INSERT OR IGNORE INTO categories (id, name, name_thai) VALUES 
    (1, 'Appetizers', 'อาหารว่าง'),
    (2, 'Main Courses', 'อาหารจานหลัก'),
    (3, 'Drinks', 'เครื่องดื่ม'),
    (4, 'Desserts', 'ของหวาน')`);

  // Insert default tables
  for (let i = 1; i <= 20; i++) {
    db.run(`INSERT OR IGNORE INTO tables (table_number) VALUES (?)`, [i]);
  }
});

// API Routes

// Categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, name_thai } = req.body;
  db.run('INSERT INTO categories (name, name_thai) VALUES (?, ?)', 
    [name, name_thai], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, name_thai });
  });
});

// Menu Items
app.get('/api/menu-items', (req, res) => {
  const query = `
    SELECT mi.*, c.name as category_name, c.name_thai as category_name_thai
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    ORDER BY c.name, mi.name
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/menu-items/available', (req, res) => {
  const query = `
    SELECT mi.*, c.name as category_name, c.name_thai as category_name_thai
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.status = 'available'
    ORDER BY c.name, mi.name
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/menu-items', upload.single('image'), (req, res) => {
  const { name, name_thai, description, price, category_id, status } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  db.run('INSERT INTO menu_items (name, name_thai, description, price, image_url, category_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [name, name_thai, description, price, image_url, category_id, status || 'available'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      id: this.lastID, 
      name, 
      name_thai, 
      description, 
      price, 
      image_url, 
      category_id, 
      status: status || 'available' 
    });
  });
});

app.put('/api/menu-items/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, name_thai, description, price, category_id, status } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  let query = 'UPDATE menu_items SET name = ?, name_thai = ?, description = ?, price = ?, category_id = ?, status = ?';
  let params = [name, name_thai, description, price, category_id, status];
  
  if (image_url) {
    query += ', image_url = ?';
    params.push(image_url);
  }
  
  query += ' WHERE id = ?';
  params.push(id);
  
  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Menu item updated successfully' });
  });
});

app.put('/api/menu-items/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE menu_items SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Menu item status updated successfully' });
    
    // Emit status update to all connected clients
    io.emit('menu_item_status_updated', { id: parseInt(id), status });
  });
});

// Tables and QR Codes
app.get('/api/tables', (req, res) => {
  db.all('SELECT * FROM tables ORDER BY table_number', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/tables/:tableNumber/qr', async (req, res) => {
  const { tableNumber } = req.params;
  try {
    const baseUrl = req.protocol + '://' + req.get('host');
    const menuUrl = `${baseUrl}/menu?table=${tableNumber}`;
    const qrCode = await QRCode.toDataURL(menuUrl);
    
    // Save QR code to database
    db.run('UPDATE tables SET qr_code = ? WHERE table_number = ?', [qrCode, tableNumber]);
    
    res.json({ qrCode, menuUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Orders
app.post('/api/orders', (req, res) => {
  const { table_number, items } = req.body;
  
  // Get table ID
  db.get('SELECT id FROM tables WHERE table_number = ?', [table_number], (err, table) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    
    // Calculate total amount
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order
    db.run('INSERT INTO orders (table_id, total_amount) VALUES (?, ?)', 
      [table.id, total_amount], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const orderId = this.lastID;
      
      // Insert order items
      const stmt = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price, special_requests) VALUES (?, ?, ?, ?, ?)');
      
      items.forEach(item => {
        stmt.run([orderId, item.menu_item_id, item.quantity, item.price, item.special_requests || '']);
      });
      
      stmt.finalize();
      
      // Emit new order to kitchen
      const orderData = {
        id: orderId,
        table_number,
        items,
        total_amount,
        created_at: new Date().toISOString()
      };
      
      io.emit('new_order', orderData);
      
      res.json({ orderId, message: 'Order placed successfully' });
    });
  });
});

app.get('/api/orders/active', (req, res) => {
  const query = `
    SELECT o.*, t.table_number,
           oi.id as item_id, oi.quantity, oi.special_requests, oi.status as item_status,
           mi.name as item_name, mi.name_thai as item_name_thai, mi.price
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE o.status != 'completed'
    ORDER BY o.created_at DESC, oi.id
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Group items by order
    const orders = {};
    rows.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          table_number: row.table_number,
          status: row.status,
          total_amount: row.total_amount,
          created_at: row.created_at,
          items: []
        };
      }
      
      orders[row.id].items.push({
        id: row.item_id,
        name: row.item_name,
        name_thai: row.item_name_thai,
        quantity: row.quantity,
        price: row.price,
        special_requests: row.special_requests,
        status: row.item_status
      });
    });
    
    res.json(Object.values(orders));
  });
});

app.put('/api/order-items/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE order_items SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Emit status update
    io.emit('order_item_status_updated', { id: parseInt(id), status });
    
    res.json({ message: 'Order item status updated successfully' });
  });
});

// Billing
app.get('/api/billing/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;
  
  const query = `
    SELECT o.*, t.table_number,
           oi.id as item_id, oi.quantity, oi.special_requests,
           mi.name as item_name, mi.name_thai as item_name_thai, mi.price
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE t.table_number = ? AND o.status != 'completed'
    ORDER BY o.created_at, oi.id
  `;
  
  db.all(query, [tableNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (rows.length === 0) {
      return res.json({ orders: [], total: 0 });
    }
    
    // Group items by order
    const orders = {};
    let grandTotal = 0;
    
    rows.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          created_at: row.created_at,
          items: []
        };
      }
      
      const itemTotal = row.quantity * row.price;
      grandTotal += itemTotal;
      
      orders[row.id].items.push({
        name: row.item_name,
        name_thai: row.item_name_thai,
        quantity: row.quantity,
        price: row.price,
        total: itemTotal,
        special_requests: row.special_requests
      });
    });
    
    res.json({
      table_number: parseInt(tableNumber),
      orders: Object.values(orders),
      total: grandTotal
    });
  });
});

app.post('/api/billing/:tableNumber/close', (req, res) => {
  const { tableNumber } = req.params;
  
  db.run(`UPDATE orders SET status = 'completed' 
          WHERE table_id = (SELECT id FROM tables WHERE table_number = ?) 
          AND status != 'completed'`, [tableNumber], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    res.json({ message: 'Table closed successfully' });
  });
});

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kitchen.html'));
});

app.get('/cashier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cashier.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

// Only start server if this file is run directly (not required)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Restaurant Management System running on port ${PORT}`);
  });
}

module.exports = { app, io, db, server };
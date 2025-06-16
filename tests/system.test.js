const request = require('supertest');
const { app, db } = require('../server');

describe('Restaurant Management System', () => {
  afterAll((done) => {
    db.close(done);
  });

  test('GET /api/categories should return categories', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET /api/menu-items should return menu items', async () => {
    const response = await request(app).get('/api/menu-items');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/menu-items should create a new menu item', async () => {
    const newItem = {
      name: 'Test Item',
      name_thai: 'ทดสอบ',
      description: 'Test description',
      price: 100.00,
      category_id: 1,
      status: 'available'
    };

    const response = await request(app)
      .post('/api/menu-items')
      .send(newItem);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe(newItem.name);
    expect(response.body.price).toBe(newItem.price);
  });

  test('POST /api/orders should create a new order', async () => {
    const newOrder = {
      table_number: 1,
      items: [
        { menu_item_id: 1, quantity: 1, price: 120.00, special_requests: 'Test request' }
      ]
    };

    const response = await request(app)
      .post('/api/orders')
      .send(newOrder);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Order placed successfully');
    expect(response.body.orderId).toBeDefined();
  });

  test('GET /api/orders/active should return active orders', async () => {
    const response = await request(app).get('/api/orders/active');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /api/billing/:tableNumber should return table bill', async () => {
    const response = await request(app).get('/api/billing/1');
    expect(response.status).toBe(200);
    expect(response.body.table_number).toBe(1);
    expect(response.body.orders).toBeDefined();
    expect(response.body.total).toBeDefined();
  });

  test('GET /api/tables/:tableNumber/qr should generate QR code', async () => {
    const response = await request(app).get('/api/tables/1/qr');
    expect(response.status).toBe(200);
    expect(response.body.qrCode).toBeDefined();
    expect(response.body.menuUrl).toBeDefined();
    expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
  });
});
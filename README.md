# Restaurant Menu & Order Management System

A comprehensive web-based platform designed to digitize the in-restaurant ordering process. Customers can view the menu and place orders directly from their table using their smartphones, and orders are transmitted to the kitchen in real-time.

## Features

### Core Features Implemented

✅ **Digital Menu Management**
- Admin panel for restaurant managers
- Create/edit/delete food categories and menu items
- Real-time menu item status updates (Available/Sold Out)
- Image upload support for menu items

✅ **Customer QR Code Ordering**
- QR code generation for each table
- Mobile-responsive menu interface
- Add items to cart with quantity and special requests
- Real-time order placement

✅ **Kitchen Display System (KDS)**
- Real-time order viewing for kitchen staff
- Order status management (Queued → Cooking → Ready)
- Visual and audio notifications for new orders
- Chronological order display with timing

✅ **Order Status Tracking**
- Real-time status updates between kitchen and customers
- WebSocket-based live updates
- Order progress tracking

✅ **Billing & Checkout**
- Cashier interface for payment processing
- Complete order history per table
- Service charge and VAT calculations
- Multiple payment methods support
- Receipt printing

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Real-time Communication**: Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **QR Code Generation**: qrcode library
- **File Upload**: Multer

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd restaurant-test2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open http://localhost:3000 in your browser
   - The database will be automatically created with sample categories

## Usage Guide

### 1. Admin Panel (http://localhost:3000/admin)
- Add food categories (Appetizers, Main Courses, Drinks, Desserts)
- Create menu items with details, prices, and images
- Update menu item availability status

### 2. Generate QR Codes (http://localhost:3000)
- Enter table numbers (1-20)
- Generate QR codes for table ordering
- Print QR codes for placement on tables

### 3. Customer Ordering (http://localhost:3000/menu?table=X)
- Customers scan QR code to access menu
- Browse menu by categories
- Add items to cart with special requests
- Place orders directly from their phone

### 4. Kitchen Display (http://localhost:3000/kitchen)
- View incoming orders in real-time
- Update order status (Start Cooking → Ready to Serve)
- Audio notifications for new orders
- Track order timing

### 5. Cashier Interface (http://localhost:3000/cashier)
- Search for table bills
- View complete order history
- Process payments (Cash, Card, QR Payment, Bank Transfer)
- Calculate service charges and VAT
- Print receipts and close tables

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category

### Menu Items
- `GET /api/menu-items` - Get all menu items
- `GET /api/menu-items/available` - Get available menu items
- `POST /api/menu-items` - Create new menu item (with image upload)
- `PUT /api/menu-items/:id` - Update menu item
- `PUT /api/menu-items/:id/status` - Update menu item status

### Orders
- `POST /api/orders` - Place new order
- `GET /api/orders/active` - Get active orders
- `PUT /api/order-items/:id/status` - Update order item status

### Tables & QR Codes
- `GET /api/tables` - Get all tables
- `GET /api/tables/:tableNumber/qr` - Generate QR code for table

### Billing
- `GET /api/billing/:tableNumber` - Get table bill
- `POST /api/billing/:tableNumber/close` - Close table and complete payment

## Database Schema

The system uses SQLite with the following tables:
- `categories` - Food categories
- `menu_items` - Menu items with details and pricing
- `tables` - Restaurant tables with QR codes
- `orders` - Customer orders
- `order_items` - Individual items within orders

## Testing

Run the test suite:
```bash
npm test
```

The tests cover all major API endpoints and functionality.

## Performance & Requirements

- **Menu Loading**: < 3 seconds on 4G connection
- **Order Transmission**: < 2 seconds from customer to kitchen
- **Mobile Compatibility**: Works on Chrome, Safari mobile browsers
- **Desktop Compatibility**: Kitchen and cashier interfaces work on tablets/computers

## Future Enhancements

Potential features for future versions:
- Online payment integration
- Customer loyalty program
- Inventory management
- Table reservation system
- Analytics dashboard
- Multi-language support
- Push notifications

## Support

For technical support or feature requests, please contact the development team.

---

**Version**: 1.0  
**Created**: June 2024  
**License**: MIT
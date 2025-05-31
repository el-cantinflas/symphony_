const express = require('express');
const app = express();
const port = 3001;

app.use(express.json()); // Middleware to parse JSON bodies

// Basic request logger
app.use((req, res, next) => {
  console.log(`[Mock API] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    console.log('[Mock API] Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// --- Orderwise API Mock Endpoints ---
app.get('/mock/orderwise/v1/items', (req, res) => {
  // Example: Get a list of items
  res.json({
    success: true,
    data: [
      { id: 'ITEM001', name: 'Sample Item 1', price: 10.99, stock: 100 },
      { id: 'ITEM002', name: 'Sample Item 2', price: 5.49, stock: 50 },
    ],
    message: 'Items retrieved successfully'
  });
});

app.post('/mock/orderwise/v1/orders', (req, res) => {
  // Example: Create an order
  const orderData = req.body;
  if (!orderData || !orderData.items || orderData.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order items are required.' });
  }
  res.status(201).json({
    success: true,
    data: {
      orderId: `ORD-${Date.now()}`,
      status: 'Pending',
      items: orderData.items,
      totalAmount: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },
    message: 'Order created successfully'
  });
});

// --- External Webhook Mock Endpoint ---
app.post('/mock/external-webhook/event', (req, res) => {
  // Example: Receive an event notification
  const eventData = req.body;
  if (!eventData || !eventData.eventType) {
    return res.status(400).json({ success: false, message: 'eventType is required.' });
  }
  console.log(`[Mock Webhook] Received event: ${eventData.eventType}`, JSON.stringify(eventData, null, 2));
  res.status(200).json({
    success: true,
    message: `Webhook event '${eventData.eventType}' received successfully.`
  });
});

// --- Test Endpoints (as per task 3 details) ---
// Endpoint 1: Simulates a successful Orderwise API call
app.get('/mock/test/orderwise-success', (req, res) => {
  res.json({
    success: true,
    message: 'Orderwise API test endpoint: Success!',
    data: { timestamp: new Date().toISOString() }
  });
});

// Endpoint 2: Simulates a successful External Webhook call (e.g., receiving data)
app.post('/mock/test/webhook-receive', (req, res) => {
  console.log('[Mock Test Webhook] Received test data:', JSON.stringify(req.body, null, 2));
  res.status(200).json({
    success: true,
    message: 'External Webhook test endpoint: Data received!',
    dataReceived: req.body
  });
});


app.listen(port, () => {
  console.log(`[Mock API Server] Running at http://localhost:${port}`);
});

module.exports = app; // Export for potential testing or programmatic use
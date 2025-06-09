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

app.get('/api/orderwise/', (req, res) => {
  res.json({ success: true, message: 'Connection to mock Orderwise API successful.' });
});

app.get('/api/orderwise/orders', (req, res) => {
  const { status } = req.query;
  if (status === 'new') {
    res.json([
      { id: 1, product: 'Widget', quantity: 2 },
      { id: 2, product: 'Gadget', quantity: 1 },
    ]);
  } else {
    res.json([]);
  }
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
app.post('/webhook', (req, res) => {
  console.log('[Mock Webhook] Received data:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true, message: 'Webhook received data successfully.' });
});

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
app.get('/api/orderwise/mock/test/orderwise-success', (req, res) => {
  console.log(`[Mock API] Handling /api/orderwise/mock/test/orderwise-success`);
  res.json({
    success: true,
    message: 'Orderwise API test endpoint: Success!',
    data: { timestamp: new Date().toISOString() }
  });
});

// Endpoint 2: Simulates a successful External Webhook call (e.g., receiving data)
// This endpoint is for a different base URL, so it should NOT have /api/orderwise
app.post('/mock/test/webhook-receive', (req, res) => {
  console.log('[Mock Test Webhook] Received test data:', JSON.stringify(req.body, null, 2));
  res.status(200).json({
    success: true,
    message: 'External Webhook test endpoint: Data received!',
    dataReceived: req.body
  });
});

// --- Endpoints for Advanced Retry and Error Testing ---
let retrySuccessCounter = 0;
app.get('/api/orderwise/mock/test/retry-then-success', (req, res) => {
  retrySuccessCounter++;
  if (retrySuccessCounter <= 2) {
    console.log(`[Mock API] /api/orderwise/mock/test/retry-then-success - Attempt ${retrySuccessCounter}: Returning 500`);
    res.status(500).json({ success: false, message: `Service unavailable (Attempt ${retrySuccessCounter})` });
  } else {
    console.log(`[Mock API] /api/orderwise/mock/test/retry-then-success - Attempt ${retrySuccessCounter}: Returning 200`);
    res.json({ success: true, message: 'Finally succeeded!', attempt: retrySuccessCounter });
    retrySuccessCounter = 0; // Reset for next test sequence
  }
});

app.get('/api/orderwise/mock/test/always-fail', (req, res) => {
  console.log('[Mock API] /api/orderwise/mock/test/always-fail: Returning 503');
  res.status(503).json({ success: false, message: 'Service consistently unavailable' });
});

app.post('/api/orderwise/mock/test/client-error', (req, res) => {
  const { data } = req.body;
  if (!data) {
    console.log('[Mock API] /api/orderwise/mock/test/client-error: Returning 400 - Missing data');
    return res.status(400).json({ success: false, message: 'Client Error: Missing "data" in request body.' });
  }
  console.log('[Mock API] /api/orderwise/mock/test/client-error: Received data, but simulating a generic client error response for testing.');
  res.status(400).json({ success: false, message: 'Simulated Client Error: Invalid input.', receivedData: data });
});


app.listen(port, () => {
  console.log(`[Mock API Server] Running at http://localhost:${port}`);
});

module.exports = app; // Export for potential testing or programmatic use
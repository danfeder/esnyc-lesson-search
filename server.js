const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression for all responses
app.use(compression());

// Set up static file serving with proper MIME types
app.use(express.static('.', {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Cache static assets
app.use(express.static('.', {
  maxAge: '1d', // Cache static files for 1 day
  etag: true
}));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║        ESNYC Lesson Search Interface               ║
║                                                    ║
║  Server running at: http://localhost:${PORT}         ║
║                                                    ║
║  Press Ctrl+C to stop the server                  ║
╚════════════════════════════════════════════════════╝
  `);
});
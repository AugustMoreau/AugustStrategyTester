const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for the frontend
app.use(cors({
  origin: 'http://localhost:3001' // Vite dev server
}));

// Serve static files from the React app build directory in production
app.use(express.static(path.join(__dirname, '../dist')));

// API Proxy endpoint for Binance
app.get('/api/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required' });
    }
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch data from API' });
  }
});

// For any other GET request, send back the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`API proxy server running on port ${PORT}`);
});

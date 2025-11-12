const express = require('express');
const bodyParser = require('body-parser');
const { Redis } = require('@upstash/redis');
const { put } = require('@vercel/blob');

const app = express();

// --- Upstash Redis Client Setup ---
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// --- Data Initialization ---
const initializeRedisData = async () => {
  const configExists = await redis.exists('config');
  if (!configExists) {
    await redis.set('config', {
      companyName: 'Your Company',
      logo: '/images/logo.png',
      description: 'Welcome to our page!',
      theme: { 
        primaryColor: '#007bff', 
        secondaryColor: '#6c757d',
        primaryTextColor: '#ffffff',
        secondaryTextColor: '#ffffff',
        backgroundColor: '#f0f2f5',
        containerColor: '#ffffff'
      },
      socialLinks: [],
      links: [],
      campaigns: [],
    });
  }

  const usersExists = await redis.exists('users');
  if (!usersExists) {
    await redis.set('users', { users: [{ username: 'admin', password: 'password' }] });
  }

  const analyticsExists = await redis.exists('analytics');
  if (!analyticsExists) {
    await redis.set('analytics', { visits: [], clicks: [] });
  }
};

initializeRedisData();
// --- End Data Initialization ---

app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/upload', async (req, res) => {
    const { filename, content } = req.body;
    const blob = await put(filename, Buffer.from(content, 'base64'), {
        access: 'public',
    });
    res.json({ url: blob.url });
});

app.get('/api/config', async (req, res) => {
  const config = await redis.get('config');
  res.json(config);
});

app.post('/api/visit', async (req, res) => {
  const analytics = await redis.get('analytics');
  analytics.visits.push({
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  await redis.set('analytics', analytics);
  res.sendStatus(200);
});

app.post('/api/click', async (req, res) => {
  const { linkId } = req.body;
  const analytics = await redis.get('analytics');
  analytics.clicks.push({
    timestamp: new Date().toISOString(),
    linkId,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  await redis.set('analytics', analytics);
  res.sendStatus(200);
});

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const users = await redis.get('users');
  if (users.users.find((u) => u.password === password)) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/config', async (req, res) => {
  const newConfig = req.body;
  await redis.set('config', newConfig);
  res.sendStatus(200);
});

app.get('/api/analytics', async (req, res) => {
  const analytics = await redis.get('analytics');
  res.json(analytics);
});

module.exports = app;
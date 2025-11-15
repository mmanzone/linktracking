const express = require('express');
const bodyParser = require('body-parser');
const { Redis } = require('@upstash/redis');
const { put } = require('@vercel/blob');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// --- Upstash Redis Client Setup ---
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// --- Data Initialization ---
const initializeRedisData = async () => {
  const masterTenantExists = await redis.exists('tenant:master');
  if (!masterTenantExists) {
    await redis.set('tenant:master', {
      id: 'tenant_1',
      name: 'master',
      displayName: 'Master Admin',
      users: ['user_1'],
    });

    await redis.set('user:matthias@manzone.org', {
      id: 'user_1',
      email: 'matthias@manzone.org',
      tenants: ['tenant_1'],
      role: 'master-admin',
    });

    await redis.set('config:tenant_1', {
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

    await redis.set('analytics:tenant_1', {
      visits: [],
      clicks: [],
    });
  }
};


initializeRedisData();
// --- End Data Initialization ---

app.use(bodyParser.json({ limit: '10mb' }));

const authenticate = async (req, res, next) => {
  const token = req.cookies.session_token;

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await redis.get(`user:${decoded.email}`);
    if (!user) {
      return res.status(401).send('Unauthorized');
    }
    req.user = user;
    // For now, let's assume the user is operating on their first tenant.
    // A proper implementation would have a tenant switcher on the frontend.
    req.tenantId = user.tenants[0]; 
    next();
  } catch (error) {
    return res.status(401).send('Invalid or expired token.');
  }
};

app.get('/api/me', authenticate, (req, res) => {
    res.json(req.user);
});

const requireMasterAdmin = (req, res, next) => {
    if (req.user.role !== 'master-admin') {
        return res.status(403).send('Forbidden');
    }
    next();
}

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  const user = await redis.get(`user:${email}`);

  if (user) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    // Dynamically generate the magic link URL
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const magicLink = `${protocol}://${host}/api/auth/verify?token=${token}`;

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'updates@manzone.org', // Use an env var for the from address
        to: email,
        subject: 'Your Magic Login Link',
        html: `<p>Click <a href="${magicLink}">here</a> to log in.</p>`,
      });
      res.json({ success: true, message: 'Magic link sent.' });
    } catch (error) {
      console.error('Error sending email:', error); // Log the actual error
      res.status(500).json({ success: false, message: 'Error sending email.' });
    }
  } else {
    // To prevent user enumeration, we'll send a success response even if the user doesn't exist.
    // You might want to handle new user registration separately.
    res.json({ success: true, message: 'If your email is registered, a magic link has been sent.' });
  }
});

app.get('/api/tenants', authenticate, requireMasterAdmin, async (req, res) => {
    // In a real app with many tenants, you'd use SCAN or a secondary index.
    // For this example, we'll assume a small number of tenants.
    const tenantKeys = await redis.keys('tenant:*');
    const tenants = await Promise.all(tenantKeys.map(key => redis.get(key)));
    res.json(tenants);
});

app.post('/api/tenants', authenticate, requireMasterAdmin, async (req, res) => {
    const { name, displayName, email } = req.body;
    const tenantId = `tenant_${Date.now()}`;
    const userId = `user_${Date.now()}`;

    await redis.set(`tenant:${name}`, {
        id: tenantId,
        name,
        displayName,
        users: [userId],
    });

    await redis.set(`user:${email}`, {
        id: userId,
        email,
        tenants: [tenantId],
        role: 'user', // Or 'admin' if you have tenant-level admins
    });
    
    // You might want to create a default config and analytics record here too
    
    res.json({ success: true });
});

app.delete('/api/tenants/:id', authenticate, requireMasterAdmin, async (req, res) => {
    const { id } = req.params;
    const tenant = await redis.get(`tenant:${id}`);
    if (tenant) {
        // This is a simplified deletion. In a real app, you'd need to handle
        // all associated data (users, configs, analytics, blobs, etc.).
        await redis.del(`tenant:${id}`);
        // You'd also need to remove the tenant from the users' tenant lists.
    }
    res.json({ success: true });
});

app.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sessionToken = jwt.sign({ email: decoded.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('session_token', sessionToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/admin.html');
  } catch (error) {
    res.status(401).send('Invalid or expired token.');
  }
});


app.post('/api/upload', authenticate, async (req, res) => {
    const { tenantId } = req;
    const { filename, content } = req.body;
    const blob = await put(`${tenantId}/${filename}`, Buffer.from(content, 'base64'), {
        access: 'public',
    });
    res.json({ url: blob.url });
});

app.get('/api/admin/config', authenticate, async (req, res) => {
    const config = await redis.get(`config:${req.tenantId}`);
    res.json(config);
});

app.get('/api/config', async (req, res) => {
  const { tenant } = req.query;
  if (!tenant) return res.status(400).json({ error: 'Tenant query parameter is required.' });

  const tenantData = await redis.get(`tenant:${tenant}`);
  if (!tenantData) return res.status(404).json({ error: 'Tenant not found.' });
  
  const config = await redis.get(`config:${tenantData.id}`);
  if (!config) return res.status(404).json({ error: 'Configuration not found for tenant.' });

  res.json(config);
});

app.post('/api/visit', async (req, res) => {
  const { tenant } = req.query;
  if (!tenant) return res.status(400).json({ error: 'Tenant query parameter is required.' });

  const tenantData = await redis.get(`tenant:${tenant}`);
  if (!tenantData) return res.status(404).json({ error: 'Tenant not found.' });

  const analytics = await redis.get(`analytics:${tenantData.id}`);
  if (!analytics) return res.sendStatus(200);

  analytics.visits.push({
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  await redis.set(`analytics:${tenantData.id}`, analytics);
  res.sendStatus(200);
});

app.post('/api/click', async (req, res) => {
  const { tenant } = req.query;
  if (!tenant) return res.status(400).json({ error: 'Tenant query parameter is required.' });
  
  const tenantData = await redis.get(`tenant:${tenant}`);
  if (!tenantData) return res.status(404).json({ error: 'Tenant not found.' });

  const { linkId } = req.body;
  const analytics = await redis.get(`analytics:${tenantData.id}`);
  if (!analytics) return res.sendStatus(200);

  analytics.clicks.push({
    timestamp: new Date().toISOString(),
    linkId,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  await redis.set(`analytics:${tenantData.id}`, analytics);
  res.sendStatus(200);
});

app.post('/api/config', authenticate, async (req, res) => {
  const { tenantId } = req;
  const newConfig = req.body;
  await redis.set(`config:${tenantId}`, newConfig);
  res.sendStatus(200);
});

app.get('/api/analytics', authenticate, async (req, res) => {
  const { tenantId } = req;
  const analytics = await redis.get(`analytics:${tenantId}`);
  res.json(analytics);
});

module.exports = app;
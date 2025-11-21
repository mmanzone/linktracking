// --- JWT Secret Check ---
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
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
console.log('Redis client initialized.');

// --- Data Initialization ---
const initializeRedisData = async () => {
  try {
    console.log('Running data initialization...');
    // If RESET_TENANTS is true, perform destructive wipe and recreate MASTER tenant.
    // Otherwise, be non-destructive: ensure MASTER tenant and related keys exist.
    if (process.env.RESET_TENANTS === 'true') {
      try {
        console.log('RESET_TENANTS=true — wiping existing tenant, config, analytics and user keys...');

        const tenantKeys = await redis.keys('tenant:*');
        for (const k of tenantKeys) {
          await redis.del(k);
        }

        const configKeys = await redis.keys('config:*');
        for (const k of configKeys) {
          await redis.del(k);
        }

        const analyticsKeys = await redis.keys('analytics:*');
        for (const k of analyticsKeys) {
          await redis.del(k);
        }

        const userKeys = await redis.keys('user:*');
        for (const k of userKeys) {
          await redis.del(k);
        }

        console.log('All tenant-related keys removed.');
      } catch (err) {
        console.error('Error while wiping keys during initialization:', err);
      }

      // Recreate a single MASTER tenant and master user (uppercase names/ids)
      console.log('Creating MASTER tenant and master user (destructive mode)...');
      await redis.set('tenant:MASTER', {
        id: 'TENANT_1',
        name: 'MASTER',
    // If RESET_TENANTS is true, perform destructive wipe and recreate MASTER tenant.
    // Otherwise, be non-destructive: ensure MASTER tenant and related keys exist.
    if (process.env.RESET_TENANTS === 'true') {
      try {
        console.log('RESET_TENANTS=true — wiping existing tenant, config, analytics and user keys...');

        const tenantKeys = await redis.keys('tenant:*');
        for (const k of tenantKeys) {
          await redis.del(k);
        }

        const configKeys = await redis.keys('config:*');
        for (const k of configKeys) {
          await redis.del(k);
        }

        const analyticsKeys = await redis.keys('analytics:*');
        for (const k of analyticsKeys) {
          await redis.del(k);
        }

        const userKeys = await redis.keys('user:*');
        for (const k of userKeys) {
          await redis.del(k);
        }

        console.log('All tenant-related keys removed.');
      } catch (err) {
        console.error('Error while wiping keys during initialization:', err);
      }

      // Recreate a single MASTER tenant and master user (uppercase names/ids)
      console.log('Creating MASTER tenant and master user (destructive mode)...');
      await redis.set('tenant:MASTER', {
        id: 'TENANT_1',
        name: 'MASTER',
        displayName: 'Master Admin',
        users: ['user_1'],
      });

      await redis.set('user:matthias@manzone.org', {
        id: 'user_1',
        email: 'matthias@manzone.org',
        firstName: 'Matthias',
        lastName: 'Manzone',
        tenants: ['TENANT_1'],
        tenants: ['TENANT_1'],
        role: 'master-admin',
        disabled: false,
        lastLogin: null
      });

      await redis.set('config:TENANT_1', {

      await redis.set('config:TENANT_1', {
        companyName: 'MASTER ADMIN ACCOUNT',
        logo: '/images/logo.png',
        description: 'DO NOT DELETE THIS ACCOUNT!',
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

      await redis.set('analytics:TENANT_1', {
        visits: [],
        clicks: [],
      });
      console.log('MASTER tenant and related data created.');

      await redis.set('analytics:TENANT_1', {
        visits: [],
        clicks: [],
      });
      console.log('MASTER tenant and related data created.');
    } else {
      // Non-destructive path: ensure MASTER tenant and related keys exist
      console.log('RESET_TENANTS not set — ensuring MASTER tenant exists (non-destructive).');
      try {
        const masterExists = await redis.exists('tenant:MASTER');
        if (!masterExists) {
          console.log('Master tenant not found, creating...');
          await redis.set('tenant:MASTER', {
            id: 'TENANT_1',
            name: 'MASTER',
            displayName: 'Master Admin',
            users: ['user_1'],
          });
          console.log('Master tenant created.');
        }

        const masterUserExists = await redis.exists('user:matthias@manzone.org');
        if (!masterUserExists) {
          console.log('Master user not found, creating...');
          await redis.set('user:matthias@manzone.org', {
            id: 'user_1',
            email: 'matthias@manzone.org',
            firstName: 'Matthias',
            lastName: 'Manzone',
            tenants: ['TENANT_1'],
            role: 'master-admin',
            disabled: false,
            lastLogin: null
          });
          console.log('Master user created.');
        }

        const masterConfigExists = await redis.exists('config:TENANT_1');
        if (!masterConfigExists) {
          console.log('Master config not found, creating...');
          await redis.set('config:TENANT_1', {
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
          console.log('Master config created.');
        }

        const masterAnalyticsExists = await redis.exists('analytics:TENANT_1');
        if (!masterAnalyticsExists) {
          console.log('Master analytics not found, creating...');
          await redis.set('analytics:TENANT_1', {
            visits: [],
            clicks: [],
          });
          console.log('Master analytics created.');
        }
      } catch (err) {
        console.error('Error while ensuring MASTER tenant exists:', err);
      }
      // Non-destructive path: ensure MASTER tenant and related keys exist
      console.log('RESET_TENANTS not set — ensuring MASTER tenant exists (non-destructive).');
      try {
        const masterExists = await redis.exists('tenant:MASTER');
        if (!masterExists) {
          console.log('Master tenant not found, creating...');
          await redis.set('tenant:MASTER', {
            id: 'TENANT_1',
            name: 'MASTER',
            displayName: 'Master Admin',
            users: ['user_1'],
          });
          console.log('Master tenant created.');
        }

        const masterUserExists = await redis.exists('user:matthias@manzone.org');
        if (!masterUserExists) {
          console.log('Master user not found, creating...');
          await redis.set('user:matthias@manzone.org', {
            id: 'user_1',
            email: 'matthias@manzone.org',
            firstName: 'Matthias',
            lastName: 'Manzone',
            tenants: ['TENANT_1'],
            role: 'master-admin',
            disabled: false,
            lastLogin: null
          });
          console.log('Master user created.');
        }

        const masterConfigExists = await redis.exists('config:TENANT_1');
        if (!masterConfigExists) {
          console.log('Master config not found, creating...');
          await redis.set('config:TENANT_1', {
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
          console.log('Master config created.');
        }

        const masterAnalyticsExists = await redis.exists('analytics:TENANT_1');
        if (!masterAnalyticsExists) {
          console.log('Master analytics not found, creating...');
          await redis.set('analytics:TENANT_1', {
            visits: [],
            clicks: [],
          });
          console.log('Master analytics created.');
        }
      } catch (err) {
        console.error('Error while ensuring MASTER tenant exists:', err);
      }
    }
    console.log('Data initialization complete.');
  } catch (error) {
    console.error('CRITICAL ERROR during data initialization:', error);
  }
};

// Start initialization immediately and expose the promise so request handlers
// can await it to avoid race conditions where requests arrive before the
// MASTER user/tenant have been created.
const initializationPromise = initializeRedisData();
// Start initialization immediately and expose the promise so request handlers
// can await it to avoid race conditions where requests arrive before the
// MASTER user/tenant have been created.
const initializationPromise = initializeRedisData();
// --- End Data Initialization ---

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());

// Helper function to reliably get the base URL
const getBaseUrl = (req) => {
    // 1. Prioritize the BASE_URL environment variable if it's set and valid
    if (process.env.BASE_URL && process.env.BASE_URL.startsWith('http')) {
        return process.env.BASE_URL.replace(/\/$/, ''); // Remove any trailing slash
    }
    // 2. Otherwise, construct it from the request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    return `${protocol}://${host}`;
};

const authenticate = async (req, res, next) => {
  // Ensure initialization has completed so required keys (MASTER user/tenant)
  // exist before we try to authenticate users.
  if (typeof initializationPromise !== 'undefined') {
    try { await initializationPromise; } catch (err) { /* ignore init errors here */ }
  }

  // Ensure initialization has completed so required keys (MASTER user/tenant)
  // exist before we try to authenticate users.
  if (typeof initializationPromise !== 'undefined') {
    try { await initializationPromise; } catch (err) { /* ignore init errors here */ }
  }

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
    const tenantId = user.tenants[0];
    req.tenantId = tenantId;
    
    // To get the tenant's name, we need to find the tenant record
    // that has this ID. This is inefficient and will be slow with many tenants.
    // A better data model would be needed for a large-scale app.
    const tenantKeys = await redis.keys('tenant:*');
    let tenant = null;
    for (const key of tenantKeys) {
        const t = await redis.get(key);
        if (t.id === tenantId) {
            tenant = t;
            break;
        }
    }
    req.tenant = tenant;

    next();
  } catch (error) {
    return res.status(401).send('Invalid or expired token.');
  }
};

app.get('/api/me', authenticate, (req, res) => {
    res.json({ user: req.user, tenant: req.tenant });
});

const requireMasterAdmin = (req, res, next) => {
    if (req.user.role !== 'master-admin') {
        return res.status(403).send('Forbidden');
    }
    next();
}

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  console.log(`Login attempt for email: ${email}`);
  // Wait for initialization to complete to avoid racing with startup
  if (typeof initializationPromise !== 'undefined') {
    try { await initializationPromise; } catch (err) { /* ignore */ }
  }

  // Wait for initialization to complete to avoid racing with startup
  if (typeof initializationPromise !== 'undefined') {
    try { await initializationPromise; } catch (err) { /* ignore */ }
  }

  const user = await redis.get(`user:${email}`);

  if (user) {
    console.log(`User found for email: ${email}`);
    
    if (user.disabled) {
        console.log(`Login attempt for disabled user: ${email}`);
        return res.status(403).json({ success: false, message: 'Account is disabled.' });
    }
    
    user.lastLogin = new Date().toISOString();
    await redis.set(`user:${email}`, user);
    
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    // Dynamically generate the magic link URL
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const magicLink = `${protocol}://${host}/api/auth/verify?token=${token}`;

    try {
      const baseUrl = getBaseUrl(req);
      await resend.emails.send({
        from: `"The LinkReach Team" <${process.env.EMAIL_FROM || 'linkreach@manzone.org'}>`,
        to: email,
        subject: 'Your Login Link for linkreach.xyz',
        html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
    <div style="margin-bottom: 20px;">
        <h1 style="color: #294a7f; font-size: 24px; margin: 0; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none;">linkreach.xyz</h1>
        <p style="color: #939598; font-size: 14px; margin: 0; font-family: Arial, sans-serif; text-decoration: none;">TRACK YOUR IMPACT</p>
    </div>
  <h2>Log in to your account</h2>
  <p>Hello,</p>
  <p>You requested a link to log in to your account. Click the button below to sign in.</p>
  <p style="margin: 20px 0;">
    <a href="${magicLink}" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In</a>
  </p>
  <p>This link will expire in 15 minutes. If you did not request this email, you can safely ignore it.</p>
  <p style="font-family: Arial, sans-serif;">Thanks,<br>The LinkReach Team</p>
  <hr style="border: none; border-top: 1px solid #eee;">
  <p style="font-size: 0.8em; color: #939598;">
    If you're having trouble with the button above, copy and paste the URL below into your web browser:<br>
    <a href="${magicLink}" style="color: #52b8da;">${magicLink}</a>
  </p>
</div>
`,
      });
      console.log(`Magic link sent to: ${email}`);
      res.json({ success: true, message: 'Magic link sent.' });
    } catch (error) {
      console.error('Error sending email:', error); // Log the actual error
      res.status(500).json({ success: false, message: 'Error sending email.' });
    }
  } else {
    console.log(`User not found for email: ${email}`);
    // To prevent user enumeration, we'll send a success response even if the user doesn't exist.
    // You might want to handle new user registration separately.
    res.json({ success: true, message: 'If your email is registered, a magic link has been sent.' });
  }
});

app.get('/api/auth/verify', (req, res) => {
    const { token } = req.query;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sessionToken = jwt.sign({ email: decoded.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('session_token', sessionToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
        res.redirect('/admin.html');
    } catch (error) {
        res.status(401).send('Invalid or expired token.');
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
    const { name, displayName, email, sendWelcomeEmail } = req.body;
    const tenantId = `tenant_${Date.now()}`;
    const userId = `user_${Date.now()}`;

  // Normalize the tenant name to upper-case for storage and lookup
  const normalizedName = String(name || '').toUpperCase();

  await redis.set(`tenant:${normalizedName}`, {
    id: tenantId,
    name: normalizedName,
    displayName,
    users: [userId],
  });
  // Normalize the tenant name to upper-case for storage and lookup
  const normalizedName = String(name || '').toUpperCase();

  await redis.set(`tenant:${normalizedName}`, {
    id: tenantId,
    name: normalizedName,
    displayName,
    users: [userId],
  });

    await redis.set(`user:${email}`, {
        id: userId,
        email,
        tenants: [tenantId],
        role: 'user', // Or 'admin' if you have tenant-level admins
    });
    
    // Create default config and analytics for the new tenant
    await redis.set(`config:${tenantId}`, {
        companyName: displayName || name,
        logo: '/images/logo.png',
        description: 'Welcome to your page!',
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

    await redis.set(`analytics:${tenantId}`, {
        visits: [],
        clicks: [],
    });
    
    if (sendWelcomeEmail) {
        try {
            const baseUrl = getBaseUrl(req);
        // Use the normalized name in the welcome URL
        await resend.emails.send({
                from: `"The LinkReach Team" <${process.env.EMAIL_FROM || 'linkreach@manzone.org'}>`,
                to: email,
                subject: `Welcome to linkreach.xyz, ${tenantToInviteTo.displayName}!`,
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
    <div style="margin-bottom: 20px;">
        <h1 style="color: #294a7f; font-size: 24px; margin: 0; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none;">linkreach.xyz</h1>
        <p style="color: #939598; font-size: 14px; margin: 0; font-family: Arial, sans-serif; text-decoration: none;">TRACK YOUR IMPACT</p>
    </div>
  <h2>Your linkreach.xyz account is ready!</h2>
  <p>Hello,</p>
  <p>An account has been created for you on linkreach.xyz for the workspace "${tenantToInviteTo.displayName}". You can now log in at any time to manage your links and track their performance.</p>
  <p>Your public landing page is available at: <a href="${baseUrl}/${tenantToInviteTo.name}">${baseUrl}/${tenantToInviteTo.name}</a></p>
  <p style="margin: 20px 0;">
    <a href="${baseUrl}/login" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log in to your account</a>
  </p>
  <p style="font-family: Arial, sans-serif;">Thanks,<br>The LinkReach Team</p>
</div>
`,
            });
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }

    res.json({ success: true });
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

    // This is a workaround for the fact that authenticate is not run on this route
    const token = req.cookies.session_token;
    let user = null;
    let tenantId = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await redis.get(`user:${decoded.email}`);
            if (user) {
                tenantId = user.tenants[0];
            }
        } catch (e) {
            // Ignore invalid tokens
        }
    }

    if (!tenant) {
        if (user && tenantId) {
            const config = await redis.get(`config:${tenantId}`);
            return res.json(config);
        }
        return res.status(400).json({ error: 'Tenant query parameter is required.' });
    }

    const tenantNormalized = String(tenant || '').toUpperCase();
    const tenantData = await redis.get(`tenant:${tenantNormalized}`);
    if (!tenantData) return res.status(404).json({ error: 'Tenant not found.' });
    
    const config = await redis.get(`config:${tenantData.id}`);
    if (!config) return res.status(404).json({ error: 'Configuration not found for tenant.' });

    res.json(config);
});

app.post('/api/config', authenticate, async (req, res) => {
  const { tenantId } = req;
  const newConfig = req.body;
  await redis.set(`config:${tenantId}`, newConfig);
  res.sendStatus(200);
});

app.post('/api/click', async (req, res) => {
  const { tenant } = req.query;
  if (!tenant) return res.status(400).json({ error: 'Tenant query parameter is required.' });
  
  const tenantNormalized = String(tenant || '').toUpperCase();
  const tenantData = await redis.get(`tenant:${tenantNormalized}`);
  const tenantNormalized = String(tenant || '').toUpperCase();
  const tenantData = await redis.get(`tenant:${tenantNormalized}`);
  if (!tenantData) return res.status(404).json({ error: 'Tenant not found.' });

  const { linkId } = req.body;
  const analytics = await redis.get(`analytics:${tenantData.id}`);
  if (!analytics) {
    // Initialize analytics if it doesn't exist
    await redis.set(`analytics:${tenantData.id}`, { visits: [], clicks: [{
        timestamp: new Date().toISOString(),
        linkId,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
    }] });
    return res.sendStatus(200);
  }

  analytics.clicks.push({
    timestamp: new Date().toISOString(),
    linkId,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  await redis.set(`analytics:${tenantData.id}`, analytics);
  res.sendStatus(200);
});

app.get('/api/admin/all-configs', authenticate, requireMasterAdmin, async (req, res) => {
    const tenantKeys = await redis.keys('tenant:*');
    const allConfigs = {};
    for (const key of tenantKeys) {
        const tenant = await redis.get(key);
        if (tenant && tenant.id) {
            const config = await redis.get(`config:${tenant.id}`);
            if (config) {
                allConfigs[tenant.id] = config;
            }
        }
    }
    res.json(allConfigs);
});

app.get('/api/analytics', authenticate, async (req, res) => {
    const { tenantId } = req;
    const analytics = await redis.get(`analytics:${tenantId}`);
    res.json(analytics);
});

app.get('/api/admin/analytics', authenticate, requireMasterAdmin, async (req, res) => {
    const { tenantId } = req.query;
    if (tenantId) {
        // Fetch for a specific tenant
        const analytics = await redis.get(`analytics:${tenantId}`);
        return res.json(analytics);
    } else {
        // Fetch for all tenants
        const tenantKeys = await redis.keys('tenant:*');
        const tenants = await Promise.all(tenantKeys.map(key => redis.get(key)));
        const allAnalytics = {};
        for (const tenant of tenants) {
            if (tenant && tenant.id) {
                const analytics = await redis.get(`analytics:${tenant.id}`);
                if (analytics) {
                    allAnalytics[tenant.id] = analytics;
                }
            }
        }
        return res.json(allAnalytics);
    }
});

app.post('/api/visit', async (req, res) => {
  const { tenant } = req.query;
  const { path, referrer } = req.body;

  if (!tenant) {
    return res.status(400).json({ error: 'Tenant ID is required.' });
  }

  try {
    const visits = await redis.get(`analytics:${tenant}:visits`);
    const clicks = await redis.get(`analytics:${tenant}:clicks`);

    // Log the incoming visit data
    console.log('Incoming visit data:', { path, referrer });

    // Update visits
    if (path) {
      visits.push({ path, timestamp: new Date().toISOString() });
    }

    // Update clicks (assuming referrer is the clicked link)
    if (referrer) {
      clicks.push({ referrer, timestamp: new Date().toISOString() });
    }

    await redis.set(`analytics:${tenant}:visits`, visits);
    await redis.set(`analytics:${tenant}:clicks`, clicks);

    res.json({ visits: visits || [], clicks: clicks || [] });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- User Routes ---

// GET /api/admin/users - Master admin: Get all users
app.get('/api/admin/users', authenticate, requireMasterAdmin, async (req, res) => {
    const userKeys = await redis.keys('user:*');
    const users = await Promise.all(userKeys.map(key => redis.get(key)));
    res.json(users.filter(Boolean));
});

// GET /api/users - Tenant admin: Get users for their tenant
app.get('/api/users', authenticate, async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !tenant.users) {
        return res.json([]);
    }
    const userKeys = tenant.users;
    const users = await Promise.all(userKeys.map(async userId => {
        const allUserKeys = await redis.keys('user:*');
        for (const userKey of allUserKeys) {
            const user = await redis.get(userKey);
            if (user && user.id === userId) {
                return user;
            }
        }
        return null;
    }));
    res.json(users.filter(Boolean));
});

// POST /api/users/invite - Invite a new user
app.post('/api/users/invite', authenticate, async (req, res) => {
    const { email, tenantId, sendWelcomeEmail } = req.body;
    let tenantToInviteTo;

    if (req.user.role === 'master-admin' && tenantId) {
        const tenantKeys = await redis.keys('tenant:*');
        for (const key of tenantKeys) {
            const t = await redis.get(key);
            if (t.id === tenantId) {
                tenantToInviteTo = t;
                break;
            }
        }
    } else {
        tenantToInviteTo = req.tenant;
    }

    if (!tenantToInviteTo) {
        return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    const existingUser = await redis.get(`user:${email}`);
    if (existingUser) {
        if (!existingUser.tenants.includes(tenantToInviteTo.id)) {
            existingUser.tenants.push(tenantToInviteTo.id);
            await redis.set(`user:${email}`, existingUser);
        }
    } else {
        const userId = `user_${Date.now()}`;
        await redis.set(`user:${email}`, {
            id: userId,
            email,
            tenants: [tenantToInviteTo.id],
            role: 'user',
        });
        tenantToInviteTo.users.push(userId);
        await redis.set(`tenant:${tenantToInviteTo.name}`, tenantToInviteTo);
    }

    if (sendWelcomeEmail) {
        try {
            const baseUrl = getBaseUrl(req);
            await resend.emails.send({
                from: `"The LinkReach Team" <${process.env.EMAIL_FROM || 'linkreach@manzone.org'}>`,
                to: email,
                subject: `You've been invited to ${tenantToInviteTo.displayName} on linkreach.xyz`,
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
    <div style="margin-bottom: 20px;">
        <h1 style="color: #294a7f; font-size: 24px; margin: 0; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none;">linkreach.xyz</h1>
        <p style="color: #939598; font-size: 14px; margin: 0; font-family: Arial, sans-serif; text-decoration: none;">TRACK YOUR IMPACT</p>
    </div>
  <h2>You've been invited!</h2>
  <p>You have been invited to join the "${tenantToInviteTo.displayName}" workspace on linkreach.xyz. You can now log in to manage links and track their performance.</p>
  <p style="margin: 20px 0;">
    <a href="${baseUrl}/login?invited=true" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Activate Your Account</a>
  </p>
  <p style="font-family: Arial, sans-serif;">Thanks,<br>The LinkReach Team</p>
</div>
`,
            });
        } catch (error) {
            console.error('Error sending invite email:', error);
        }
    }

    res.json({ success: true });
});

// POST /api/users/:id/send-magic-link - Send a magic link to a user
app.post('/api/users/:id/send-magic-link', authenticate, async (req, res) => {
    const { id } = req.params;
    const userKeys = await redis.keys('user:*');
    let user = null;
    for (const key of userKeys) {
        const u = await redis.get(key);
        if (u.id === id) {
            user = u;
            break;
        }
    }

    if (user) {
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const magicLink = `${protocol}://${host}/api/auth/verify?token=${token}`;

        try {
            await resend.emails.send({
                from: `"The LinkReach Team" <${process.env.EMAIL_FROM || 'linkreach@manzone.org'}>`,
                to: user.email,
                subject: 'Your Login Link for linkreach.xyz',
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
    <div style="margin-bottom: 20px;">
        <h1 style="color: #294a7f; font-size: 24px; margin: 0; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none;">linkreach.xyz</h1>
        <p style="color: #939598; font-size: 14px; margin: 0; font-family: Arial, sans-serif; text-decoration: none;">TRACK YOUR IMPACT</p>
    </div>
  <h2>Log in to your account</h2>
  <p>Hello,</p>
  <p>An administrator requested a link to log in to your account. Click the button below to sign in.</p>
  <p style="margin: 20px 0;">
    <a href="${magicLink}" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In</a>
  </p>
  <p>This link will expire in 15 minutes. If you did not request this email, you can safely ignore it.</p>
  <p style="font-family: Arial, sans-serif;">Thanks,<br>The LinkReach Team</p>
  <hr style="border: none; border-top: 1px solid #eee;">
  <p style="font-size: 0.8em; color: #939598;">
    If you're having trouble with the button above, copy and paste the URL below into your web browser:<br>
    <a href="${magicLink}" style="color: #52b8da;">${magicLink}</a>
  </p>
</div>
`,
          });
          res.json({ success: true });
        } catch (error) {
          console.error('Error sending magic link:', error);
          res.status(500).json({ success: false, message: 'Error sending email.' });
        }
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

// PUT /api/users/:id - Update a user's details
app.put('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { email, firstName, lastName, disabled } = req.body;
    const userKeys = await redis.keys('user:*');
    let userKeyToUpdate = null;
    let userToUpdate = null;
    for (const key of userKeys) {
        const u = await redis.get(key);
        if (u.id === id) {
            userKeyToUpdate = key;
            userToUpdate = u;
            break;
        }
    }

    if (userToUpdate) {
        userToUpdate.firstName = firstName;
        userToUpdate.lastName = lastName;
        userToUpdate.disabled = disabled;
        if (email !== userToUpdate.email) {
            await redis.del(userKeyToUpdate);
            userToUpdate.email = email;
            await redis.set(`user:${email}`, userToUpdate);
        } else {
            await redis.set(userKeyToUpdate, userToUpdate);
        }
    }
    res.json({ success: true });
});

// DELETE /api/users/:id - Delete a user
app.delete('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const userKeys = await redis.keys('user:*');
    let userKeyToDelete = null;
    let userToDelete = null;
    for (const key of userKeys) {
        const u = await redis.get(key);
        if (u.id === id) {
            userKeyToDelete = key;
            userToDelete = u;
            break;
        }
    }

    if (userToDelete) {
        await redis.del(userKeyToDelete);
        for (const tenantId of userToDelete.tenants) {
            const tenantKeys = await redis.keys('tenant:*');
            for (const tenantKey of tenantKeys) {
                const t = await redis.get(tenantKey);
                if (t.id === tenantId) {
                    t.users = t.users.filter(userId => userId !== id);
                    await redis.set(tenantKey, t);
                    break; 
                }
            }
        }
    }
    res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
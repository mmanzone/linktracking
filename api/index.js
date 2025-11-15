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

    const masterTenantExists = await redis.exists('tenant:master');
    if (!masterTenantExists) {
      console.log('Master tenant not found, creating...');
      await redis.set('tenant:master', {
        id: 'tenant_1',
        name: 'master',
        displayName: 'Master Admin',
        users: ['user_1'],
      });
      console.log('Master tenant created.');
    } else {
      console.log('Master tenant already exists.');
    }

    const masterUserExists = await redis.exists('user:matthias@manzone.org');
    if (!masterUserExists) {
      console.log('Master user not found, creating...');
      await redis.set('user:matthias@manzone.org', {
        id: 'user_1',
        email: 'matthias@manzone.org',
        firstName: 'Matthias',
        lastName: 'Manzone',
        tenants: ['tenant_1'],
        role: 'master-admin',
        disabled: false,
        lastLogin: null
      });
      console.log('Master user created.');
    } else {
      console.log('Master user already exists.');
    }
    
    const masterConfigExists = await redis.exists('config:tenant_1');
    if(!masterConfigExists) {
      console.log('Master config not found, creating...');
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
      console.log('Master config created.');
    } else {
      console.log('Master config already exists.');
    }

    const masterAnalyticsExists = await redis.exists('analytics:tenant_1');
    if (!masterAnalyticsExists) {
      console.log('Master analytics not found, creating...');
      await redis.set('analytics:tenant_1', {
        visits: [],
        clicks: [],
      });
      console.log('Master analytics created.');
    } else {
      console.log('Master analytics already exists.');
    }
    console.log('Data initialization complete.');
  } catch (error) {
    console.error('CRITICAL ERROR during data initialization:', error);
  }
};


initializeRedisData();
// --- End Data Initialization ---

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());

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
      await resend.emails.send({
        from: `"LinkReach Login" <${process.env.EMAIL_FROM || 'updates@manzone.org'}>`,
        to: email,
        subject: 'Your Login Link for linkreach.xyz',
        html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
  <img src="${process.env.BASE_URL}/images/logo.png" alt="linkreach.xyz logo" style="max-width: 300px; margin-bottom: 20px;">
  <h2>Log in to your account</h2>
  <p>Hello,</p>
  <p>You requested a link to log in to your account. Click the button below to sign in.</p>
  <p style="margin: 20px 0;">
    <a href="${magicLink}" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In</a>
  </p>
  <p>This link will expire in 15 minutes. If you did not request this email, you can safely ignore it.</p>
  <p>Thanks,<br>The linkreach.xyz Team</p>
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
            const host = req.headers.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
            await resend.emails.send({
                from: `"LinkReach Welcome" <${process.env.EMAIL_FROM || 'updates@manzone.org'}>`,
                to: email,
                subject: `Welcome to linkreach.xyz, ${displayName}!`,
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
  <img src="${baseUrl}/images/logo.png" alt="linkreach.xyz logo" style="max-width: 300px; margin-bottom: 20px;">
  <h2>Your linkreach.xyz account is ready!</h2>
  <p>Hello,</p>
  <p>An account has been created for you on linkreach.xyz for the workspace "${displayName}". You can now log in at any time to manage your links and track their performance.</p>
  <p>Your public landing page is available at: <a href="${baseUrl}/${name}">${baseUrl}/${name}</a></p>
  <p style="margin: 20px 0;">
    <a href="${baseUrl}/login" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log in to your account</a>
  </p>
  <p>Thanks,<br>The linkreach.xyz Team</p>
</div>
`,
            });
        } catch (error) {
            console.error('Error sending welcome email:', error);
            // We don't want to fail the whole request if the email fails
        }
    }
    
    res.json({ success: true });
});

app.put('/api/tenants/:id', authenticate, requireMasterAdmin, async (req, res) => {
    const { id } = req.params;
    const { displayName } = req.body;
    const tenant = await redis.get(`tenant:${id}`);
    if (tenant) {
        tenant.displayName = displayName;
        await redis.set(`tenant:${id}`, tenant);
    }
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
            allAnalytics[tenant.id] = await redis.get(`analytics:${tenant.id}`);
        }
        return res.json(allAnalytics);
    }
});

app.get('/api/admin/all-configs', authenticate, requireMasterAdmin, async (req, res) => {
    const tenantKeys = await redis.keys('tenant:*');
    const tenants = await Promise.all(tenantKeys.map(key => redis.get(key)));
    const allConfigs = {};
    for (const tenant of tenants) {
        allConfigs[tenant.id] = await redis.get(`config:${tenant.id}`);
    }
    res.json(allConfigs);
});

app.get('/api/users', authenticate, async (req, res) => {
    const tenant = req.tenant;
    const userKeys = tenant.users;
    const users = await Promise.all(userKeys.map(userId => {
        // This is inefficient. A better data model would store user emails in the tenant.
        return redis.keys(`user:*`).then(keys => {
            return Promise.all(keys.map(key => redis.get(key)));
        }).then(allUsers => {
            return allUsers.find(u => u.id === userId);
        });
    }));
    res.json(users.filter(Boolean));
});

app.post('/api/users/invite', authenticate, async (req, res) => {
    const { email } = req.body;
    const tenant = req.tenant;

    // Check if user already exists
    const existingUser = await redis.get(`user:${email}`);
    if (existingUser) {
        // Add user to tenant if not already a member
        if (!existingUser.tenants.includes(tenant.id)) {
            existingUser.tenants.push(tenant.id);
            await redis.set(`user:${email}`, existingUser);
        }
    } else {
        // Create new user
        const userId = `user_${Date.now()}`;
        await redis.set(`user:${email}`, {
            id: userId,
            email,
            tenants: [tenant.id],
            role: 'user',
        });
        
        tenant.users.push(userId);
        await redis.set(`tenant:${tenant.name}`, tenant);
    }

    // Send invite email
    try {
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
        await resend.emails.send({
            from: `"LinkReach Welcome" <${process.env.EMAIL_FROM || 'updates@manzone.org'}>`,
            to: email,
            subject: `You've been invited to ${tenant.displayName} on linkreach.xyz`,
            html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
  <img src="${baseUrl}/images/logo.png" alt="linkreach.xyz logo" style="max-width: 300px; margin-bottom: 20px;">
  <h2>You've been invited!</h2>
  <p>You have been invited to join the "${tenant.displayName}" workspace on linkreach.xyz. You can now log in to manage links and track their performance.</p>
  <p style="margin: 20px 0;">
    <a href="${baseUrl}/login?invited=true" style="background-color: #294a7f; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log in to your account</a>
  </p>
  <p>Thanks,<br>The linkreach.xyz Team</p>
</div>
`,
        });
    } catch (error) {
        console.error('Error sending invite email:', error);
    }

    res.json({ success: true });
});

app.put('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { email, firstName, lastName, disabled } = req.body;
    
    // This is highly inefficient. A proper user ID -> user email mapping is needed.
    const userKeys = await redis.keys('user:*');
    let userKey = null;
    let user = null;
    for (const key of userKeys) {
        const u = await redis.get(key);
        if (u.id === id) {
            userKey = key;
            user = u;
            break;
        }
    }

    if (user) {
        user.firstName = firstName;
        user.lastName = lastName;
        user.disabled = disabled;
        
        // Handle email change
        if (email !== user.email) {
            await redis.del(userKey);
            user.email = email;
            await redis.set(`user:${email}`, user);
        } else {
            await redis.set(userKey, user);
        }
    }
    res.json({ success: true });
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    
    const userKeys = await redis.keys('user:*');
    let userKey = null;
    for (const key of userKeys) {
        const u = await redis.get(key);
        if (u.id === id) {
            userKey = key;
            break;
        }
    }

    if (userKey) {
        await redis.del(userKey);
    }
    res.json({ success: true });
});

app.get('/api/admin/users', authenticate, requireMasterAdmin, async (req, res) => {
    const userKeys = await redis.keys('user:*');
    const users = await Promise.all(userKeys.map(key => redis.get(key)));
    res.json(users);
});

module.exports = app;
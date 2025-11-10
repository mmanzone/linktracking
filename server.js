const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// --- Data Storage Setup ---
// Use a persistent disk path if available (e.g., on Render), otherwise default to a local 'data' directory.
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure the data directory exists.
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at: ${dataDir}`);
}

// Define paths for our data files.
const configPath = path.join(dataDir, 'config.json');
const analyticsPath = path.join(dataDir, 'analytics.json');
const usersPath = path.join(dataDir, 'users.json');

// Function to initialize a JSON file with default content if it doesn't exist.
const initializeJsonFile = (filePath, defaultContent) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
        console.log(`Initialized ${path.basename(filePath)} with default data.`);
    }
};

// Initialize all necessary data files.
initializeJsonFile(configPath, {
    "companyName": "Your Company",
    "logo": "images/logo.png",
    "description": "Welcome to our page!",
    "theme": { "primaryColor": "#ffffff", "secondaryColor": "#000000" },
    "socialLinks": [
        { "name": "facebook", "url": "#" },
        { "name": "instagram", "url": "#" },
        { "name": "youtube", "url": "#" },
        { "name": "x", "url": "#" },
        { "name": "tiktok", "url": "#" }
    ],
    "links": [],
    "campaigns": []
});
initializeJsonFile(analyticsPath, { "visits": [], "clicks": [] });
initializeJsonFile(usersPath, { "users": [{ "username": "admin", "password": "password" }] });
// --- End Data Storage Setup ---


app.use(bodyParser.json());
app.use(express.static(__dirname));

// API endpoints will go here
app.get('/api/config', (req, res) => {
    const config = JSON.parse(fs.readFileSync(configPath));
    res.json(config);
});

app.post('/api/visit', (req, res) => {
    const analytics = JSON.parse(fs.readFileSync(analyticsPath));
    analytics.visits.push({
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
    res.sendStatus(200);
});

app.post('/api/click', (req, res) => {
    const { linkId } = req.body;
    const analytics = JSON.parse(fs.readFileSync(analyticsPath));
    analytics.clicks.push({
        timestamp: new Date().toISOString(),
        linkId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
    res.sendStatus(200);
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersPath));
    if (users.users.find(u => u.password === password)) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/config', (req, res) => {
    const newConfig = req.body;
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    res.sendStatus(200);
});

app.get('/api/analytics', (req, res) => {
    const analytics = JSON.parse(fs.readFileSync(analyticsPath));
    res.json(analytics);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
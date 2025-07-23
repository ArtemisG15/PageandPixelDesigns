// Database API Server
// Save as: server/database-api.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Database file path
const DB_PATH = path.join(__dirname, '../assets/data/users.json');
const BACKUP_PATH = path.join(__dirname, '../assets/data/backups');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Ensure database directories exist
async function ensureDatabaseDirectories() {
    try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.mkdir(BACKUP_PATH, { recursive: true });
        console.log('✅ Database directories ready');
    } catch (error) {
        console.error('❌ Error creating directories:', error);
    }
}

// Load database
async function loadDatabase() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Create initial database
            const initialDB = {
                users: {},
                sessions: {},
                metadata: {
                    created: new Date().toISOString(),
                    version: '1.0.0'
                }
            };
            await saveDatabase(initialDB);
            return initialDB;
        }
        throw error;
    }
}

// Save database
async function saveDatabase(database) {
    try {
        // Create backup first
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_PATH, `users-${timestamp}.json`);
        
        try {
            const currentData = await fs.readFile(DB_PATH, 'utf8');
            await fs.writeFile(backupFile, currentData);
        } catch (backupError) {
            console.warn('⚠️ Could not create backup:', backupError.message);
        }
        
        // Save new data
        await fs.writeFile(DB_PATH, JSON.stringify(database, null, 2));
        
        // Update metadata
        database.metadata.lastSaved = new Date().toISOString();
        
        return true;
    } catch (error) {
        console.error('❌ Database save error:', error);
        throw error;
    }
}

// Generate secure random token
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Hash password with salt
function hashPassword(password, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

// Verify password
function verifyPassword(password, storedHash, storedSalt) {
    const { hash } = hashPassword(password, storedSalt);
    return hash === storedHash;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create user (sign up)
app.post('/api/users/create', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        const database = await loadDatabase();
        
        // Check if user already exists
        if (database.users[email.toLowerCase()]) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        // Hash password
        const { hash, salt } = hashPassword(password);
        
        // Create user
        const user = {
            id: generateToken(16),
            email: email.toLowerCase(),
            name: name.trim(),
            passwordHash: hash,
            passwordSalt: salt,
            features: {
                blog: { purchased: false, enabled: false },
                events: { purchased: false, enabled: false },
                gallery: { purchased: false, enabled: false },
                reviews: { purchased: false, enabled: false },
                worldbuilding: { purchased: false, enabled: false },
                sales: { purchased: false, enabled: false }
            },
            hasSupport: false,
            stripeCustomerId: null,
            profile: {
                displayName: name.trim(),
                bio: '',
                website: '',
                twitter: '',
                instagram: '',
                facebook: ''
            },
            books: [],
            stats: {
                bookCount: 0,
                subscriberCount: 0,
                blogCount: 0,
                visitorCount: 0
            },
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };
        
        database.users[email.toLowerCase()] = user;
        await saveDatabase(database);
        
        // Return user without sensitive data
        const { passwordHash, passwordSalt, ...safeUser } = user;
        res.status(201).json({ user: safeUser });
        
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Authenticate user (sign in)
app.post('/api/users/authenticate', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const database = await loadDatabase();
        const user = database.users[email.toLowerCase()];
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        await saveDatabase(database);
        
        // Create session
        const sessionId = generateToken(32);
        const session = {
            id: sessionId,
            userId: user.id,
            email: user.email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            isActive: true
        };
        
        database.sessions[sessionId] = session;
        await saveDatabase(database);
        
        // Return user and session
        const { passwordHash, passwordSalt, ...safeUser } = user;
        res.json({ user: safeUser, session });
        
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate session
app.post('/api/sessions/validate', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }
        
        const database = await loadDatabase();
        const session = database.sessions[sessionId];
        
        if (!session || !session.isActive) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        // Check if session has expired
        if (new Date(session.expiresAt) < new Date()) {
            session.isActive = false;
            await saveDatabase(database);
            return res.status(401).json({ error: 'Session expired' });
        }
        
        // Get user data
        const user = database.users[session.email];
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Return user without sensitive data
        const { passwordHash, passwordSalt, ...safeUser } = user;
        res.json({ user: safeUser, session });
        
    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Destroy session (logout)
app.post('/api/sessions/destroy', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }
        
        const database = await loadDatabase();
        
        if (database.sessions[sessionId]) {
            database.sessions[sessionId].isActive = false;
            await saveDatabase(database);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Session destroy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user data
app.put('/api/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const updates = req.body;
        
        const database = await loadDatabase();
        const user = database.users[email.toLowerCase()];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Allow updating specific fields
        const allowedFields = ['features', 'hasSupport', 'stripeCustomerId', 'profile', 'books', 'stats'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });
        
        user.updatedAt = new Date().toISOString();
        await saveDatabase(database);
        
        // Return updated user without sensitive data
        const { passwordHash, passwordSalt, ...safeUser } = user;
        res.json({ user: safeUser });
        
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user data
app.get('/api/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const database = await loadDatabase();
        const user = database.users[email.toLowerCase()];
        
        if (!user || !user.isActive) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user without sensitive data
        const { passwordHash, passwordSalt, ...safeUser } = user;
        res.json({ user: safeUser });
        
    } catch (error) {
        console.error('User get error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save database (admin endpoint)
app.post('/api/save-database', async (req, res) => {
    try {
        const database = req.body;
        await saveDatabase(database);
        res.json({ success: true });
    } catch (error) {
        console.error('Database save error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Stripe webhook handling (simplified)
app.post('/api/stripe/webhook', async (req, res) => {
    try {
        const event = req.body;
        
        console.log('📨 Stripe webhook received:', event.type);
        
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Stripe webhook handlers
async function handleCheckoutCompleted(session) {
    try {
        const database = await loadDatabase();
        const metadata = session.metadata;
        
        if (metadata.type === 'feature_purchase' && metadata.user_email) {
            const user = database.users[metadata.user_email.toLowerCase()];
            if (user && metadata.feature) {
                user.features[metadata.feature] = {
                    purchased: true,
                    enabled: true,
                    purchasedAt: new Date().toISOString(),
                    stripeSessionId: session.id
                };
                await saveDatabase(database);
                console.log('✅ Feature activated:', metadata.feature, 'for', metadata.user_email);
            }
        }
    } catch (error) {
        console.error('Checkout completion error:', error);
    }
}

async function handleSubscriptionCreated(subscription) {
    try {
        const database = await loadDatabase();
        // Find user by Stripe customer ID
        const userEmail = Object.keys(database.users).find(email => 
            database.users[email].stripeCustomerId === subscription.customer
        );
        
        if (userEmail) {
            const user = database.users[userEmail];
            user.hasSupport = true;
            user.supportActivatedAt = new Date().toISOString();
            await saveDatabase(database);
            console.log('✅ Support activated for:', userEmail);
        }
    } catch (error) {
        console.error('Subscription creation error:', error);
    }
}

async function handleSubscriptionUpdated(subscription) {
    try {
        const database = await loadDatabase();
        const userEmail = Object.keys(database.users).find(email => 
            database.users[email].stripeCustomerId === subscription.customer
        );
        
        if (userEmail) {
            const user = database.users[userEmail];
            user.hasSupport = subscription.status === 'active';
            await saveDatabase(database);
            console.log('✅ Support updated for:', userEmail, 'Status:', subscription.status);
        }
    } catch (error) {
        console.error('Subscription update error:', error);
    }
}

async function handleSubscriptionDeleted(subscription) {
    try {
        const database = await loadDatabase();
        const userEmail = Object.keys(database.users).find(email => 
            database.users[email].stripeCustomerId === subscription.customer
        );
        
        if (userEmail) {
            const user = database.users[userEmail];
            user.hasSupport = false;
            user.supportCancelledAt = new Date().toISOString();
            await saveDatabase(database);
            console.log('✅ Support cancelled for:', userEmail);
        }
    } catch (error) {
        console.error('Subscription deletion error:', error);
    }
}

// Serve static files (for development)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
    try {
        await ensureDatabaseDirectories();
        await loadDatabase(); // Initialize database
        
        app.listen(PORT, () => {
            console.log(`🚀 Database API server running on port ${PORT}`);
            console.log(`📁 Database path: ${DB_PATH}`);
            console.log(`💾 Backup path: ${BACKUP_PATH}`);
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

startServer();
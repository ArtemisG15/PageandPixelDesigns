
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Simple file-based database for demo purposes
const DB_FILE = path.join(__dirname, 'users.json');

// Initialize database file if it doesn't exist
async function initializeDB() {
    try {
        await fs.access(DB_FILE);
    } catch (error) {
        // File doesn't exist, create it
        await fs.writeFile(DB_FILE, JSON.stringify({ users: {} }));
        console.log('📄 Database file created');
    }
}

// Read database
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: {} };
    }
}

// Write database
async function writeDB(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing database:', error);
        throw error;
    }
}

// Generate unique user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// API Routes

// Create new user
app.post('/api/users/create', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        
        const db = await readDB();
        
        // Check if user already exists
        if (db.users[email.toLowerCase()]) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user object
        const user = {
            id: generateUserId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            hasSupport: false,
            features: {},
            books: [],
            newsletter: {
                provider: '',
                apiKey: '',
                subscriberCount: 0
            }
        };
        
        // Save user
        db.users[email.toLowerCase()] = user;
        await writeDB(db);
        
        // Return user without password
        const { password: _, ...userResponse } = user;
        
        console.log('✅ User created:', email);
        res.status(201).json({ user: userResponse });
        
    } catch (error) {
        console.error('❌ User creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Authenticate user
app.post('/api/users/authenticate', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const db = await readDB();
        const user = db.users[email.toLowerCase()];
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        await writeDB(db);
        
        // Return user without password
        const { password: _, ...userResponse } = user;
        
        console.log('✅ User authenticated:', email);
        res.json({ user: userResponse, message: 'Authentication successful' });
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user by email
app.get('/api/users/:email', async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email).toLowerCase();
        
        const db = await readDB();
        const user = db.users[email];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user without password
        const { password: _, ...userResponse } = user;
        
        res.json({ user: userResponse });
        
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
app.put('/api/users/:email', async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email).toLowerCase();
        const updates = req.body;
        
        const db = await readDB();
        const user = db.users[email];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Merge updates (excluding password and email)
        const allowedUpdates = [
            'name', 'hasSupport', 'features', 'books', 'newsletter',
            'authorName', 'authorBio', 'authorPhoto', 'stripeCustomerId',
            'supportActivatedAt', 'supportSessionId'
        ];
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'features' && typeof updates[field] === 'object') {
                    user[field] = { ...user[field], ...updates[field] };
                } else {
                    user[field] = updates[field];
                }
            }
        });
        
        user.updatedAt = new Date().toISOString();
        
        await writeDB(db);
        
        // Return user without password
        const { password: _, ...userResponse } = user;
        
        console.log('✅ User updated:', email);
        res.json({ user: userResponse });
        
    } catch (error) {
        console.error('❌ Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Stripe checkout session creation
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { mode, line_items, success_url, cancel_url, customer_email, metadata } = req.body;
        
        // In a real implementation, you'd use the Stripe SDK
        // For now, return a mock session
        const session = {
            id: 'cs_' + Date.now(),
            url: `https://checkout.stripe.com/pay/mock_session_${Date.now()}`
        };
        
        console.log('🛒 Mock Stripe session created:', session.id);
        res.json(session);
        
    } catch (error) {
        console.error('❌ Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe subscription session creation
app.post('/create-subscription-session', async (req, res) => {
    try {
        const { lookup_key, success_url, cancel_url, customer_email, trial_days, metadata } = req.body;
        
        // Mock subscription session
        const session = {
            id: 'cs_sub_' + Date.now(),
            url: `https://checkout.stripe.com/pay/mock_subscription_${Date.now()}`
        };
        
        console.log('🤝 Mock subscription session created:', session.id);
        res.json(session);
        
    } catch (error) {
        console.error('❌ Subscription session error:', error);
        res.status(500).json({ error: 'Failed to create subscription session' });
    }
});

// Stripe customer portal
app.post('/create-portal-session', async (req, res) => {
    try {
        const { customer_id, return_url } = req.body;
        
        // Mock portal session
        const result = {
            url: `https://billing.stripe.com/p/session/mock_portal_${Date.now()}`
        };
        
        console.log('🔐 Mock portal session created');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Portal session error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// Stripe webhook endpoint (simplified)
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        // In a real implementation, you'd verify the webhook signature
        console.log('📧 Stripe webhook received');
        
        // For now, just acknowledge receipt
        res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve admin panel
app.get('/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
    await initializeDB();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
        console.log(`📊 Admin panel: http://0.0.0.0:${PORT}/admin/`);
        console.log(`💾 Database: ${DB_FILE}`);
    });
}

startServer().catch(console.error);

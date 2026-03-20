const express = require('express');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();
const cors = require('cors'); // Add this line if it's missing at the top

app.use(cors({
    origin: '*', // This allows ANY website to talk to your backend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this for extra security permission
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline';");
    next();
});
const port = process.env.PORT || 3000;

// 1. PREEMPTIVE MOVE: Open the gates for CORS immediately
app.use(cors({
    origin: '*', // Allows your local file AND your Render dashboard to connect
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. DATABASE CONNECTION
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 3. TALKATIVE LOGGING: See every request in the console
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url}`);
    next();
});

// 4. TEST ROUTE: To check if the server is awake
app.get('/', (req, res) => {
    res.send('Locum Backend is ONLINE 🚀');
});

// 5. BOOKINGS ROUTE: The engine for your calendar
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY booking_date ASC');
        console.log(`Successfully fetched ${result.rows.length} bookings.`);
        res.json(result.rows);
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// 6. SAVE ROUTE: This is what March 20th needs to turn green
app.post('/api/bookings', async (req, res) => {
    const { bookings } = req.body;
    
    try {
        // Clear existing bookings first (to avoid duplicates) or use an UPSERT
        await pool.query('DELETE FROM bookings');

        for (const booking of bookings) {
            // Convert British/ISO dates to pure YYYY-MM-DD for the database
            const dbDate = new Date(booking.date).toISOString().split('T')[0];
            
            await pool.query(
                'INSERT INTO bookings (booking_date, status) VALUES ($1, $2)',
                [dbDate, booking.status]
            );
        }

        console.log(`Successfully saved ${bookings.length} bookings.`);
        res.json({ success: true, message: 'Bookings saved to database' });
    } catch (err) {
        console.error('Save Error:', err.message);
        res.status(500).json({ error: 'Failed to save bookings', details: err.message });
    }
});

// --- EMERGENCY LOGIN DO NOT LEAVE IN PRODUCTION ---
app.post('/api/login', (req, res) => {
    // This allows you to enter the calendar without a password check
    console.log("Emergency Login Triggered");
    res.json({ 
        success: true, 
        token: 'emergency-token-123',
        message: 'Welcome back!' 
    });
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

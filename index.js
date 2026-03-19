const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
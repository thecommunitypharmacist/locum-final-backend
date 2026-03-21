const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Security headers
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline';");
    next();
});

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ========== ROUTES ==========

// Health check
app.get('/', (req, res) => {
    res.send('Locum Backend is ONLINE 🚀');
});

// Get all bookings
app.get('/api', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY booking_date ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (same as above, but more specific)
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY booking_date ASC');
        console.log(`Fetched ${result.rows.length} bookings`);
        res.json(result.rows);
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// SAVE BOOKINGS - FIXED VERSION
app.post('/api/bookings', async (req, res) => {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    // Handle BOTH formats: array directly OR object with { bookings: [] }
    let bookings = req.body;
    
    // If it's an object with a 'bookings' property, extract it
    if (bookings && bookings.bookings && Array.isArray(bookings.bookings)) {
        bookings = bookings.bookings;
    }
    
    // If it's not an array, wrap it
    if (!Array.isArray(bookings)) {
        bookings = [bookings];
    }
    
    console.log(`Processing ${bookings.length} bookings`);
    
    try {
        // Clear existing bookings
        await pool.query('DELETE FROM bookings');
        console.log('Cleared existing bookings');

        // Insert new bookings
        for (const item of bookings) {
            // Handle BOTH field names: 'booking_date' (frontend) OR 'date' (backend)
            const bookingDate = item.booking_date || item.date;
            const status = item.status || 'available';
            
            if (!bookingDate) {
                console.error('Missing date in item:', item);
                continue;
            }
            
            console.log(`Inserting: ${bookingDate} -> ${status}`);
            
            await pool.query(
                'INSERT INTO bookings (booking_date, status) VALUES ($1, $2)',
                [bookingDate, status]
            );
        }

        console.log(`✅ Saved ${bookings.length} bookings to database`);
        res.json({ success: true, message: `Saved ${bookings.length} bookings` });
        
    } catch (err) {
        console.error('❌ Database Save Error:', err.message);
        res.status(500).json({ error: 'Save failed', details: err.message });
    }
});

// Clear all bookings
app.delete('/api/bookings/clear', async (req, res) => {
    try {
        await pool.query('DELETE FROM bookings');
        console.log('🗑️ Database cleared');
        res.json({ success: true, message: 'Database wiped' });
    } catch (err) {
        console.error('Clear Error:', err.message);
        res.status(500).json({ error: 'Database could not be cleared', details: err.message });
    }
});

// Emergency login route (for testing only)
app.post('/api/login', (req, res) => {
    console.log("Emergency Login Triggered");
    res.json({ 
        success: true, 
        token: 'emergency-token-123',
        message: 'Welcome back!' 
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API URL: http://localhost:${port}/api/bookings`);
});

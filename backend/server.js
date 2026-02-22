const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Database Connection ──
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── Create Table on Startup ──
async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id SERIAL PRIMARY KEY,
                participant_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                mobile VARCHAR(20) NOT NULL,
                institute VARCHAR(500) NOT NULL,
                state VARCHAR(255) NOT NULL,
                district VARCHAR(255) NOT NULL,
                participation_type VARCHAR(100) NOT NULL,
                presentation_category VARCHAR(100),
                presentation_title TEXT,
                abstract TEXT,
                practical_application TEXT,
                patent_status VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Migration: ensure new columns exist (handles old table schema)
        const migrations = [
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS presentation_category VARCHAR(100)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS presentation_title TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS abstract TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS practical_application TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS patent_status VARCHAR(100)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS state VARCHAR(255)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS district VARCHAR(255)'
        ];

        for (const sql of migrations) {
            try { await client.query(sql); } catch (e) { /* column may already exist */ }
        }

        console.log('✅ Database table ready');
    } catch (err) {
        console.error('❌ DB init error:', err.message);
    } finally {
        client.release();
    }
}

// ── Validation Helpers ──
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^[\+]?[0-9\s\-]{10,15}$/.test(phone);
}

// Types that do NOT submit presentation fields
const nonPresenterTypes = ['principal', 'tpo', 'industry_representative', 'regulatory_representative'];

// ── Registration Endpoint ──
app.post('/api/register', async (req, res) => {
    try {
        const {
            participantName, email, mobile, institute,
            state, district, participationType,
            presentationCategory, presentationTitle,
            abstract, practicalApplication, patentStatus
        } = req.body;

        // Required field validation — base fields
        const baseRequired = { participantName, email, mobile, institute, state, district, participationType };

        const missingFields = Object.entries(baseRequired)
            .filter(([_, value]) => !value || !String(value).trim())
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields.',
                missingFields
            });
        }

        // Check if presenter type — presentation fields required
        const isPresenter = !nonPresenterTypes.includes(participationType);

        if (isPresenter) {
            const presenterRequired = { presentationCategory, presentationTitle, abstract, practicalApplication, patentStatus };
            const missingPresenter = Object.entries(presenterRequired)
                .filter(([_, value]) => !value || !String(value).trim())
                .map(([key]) => key);

            if (missingPresenter.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all presentation fields.',
                    missingFields: missingPresenter
                });
            }
        }

        // Email validation
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.',
                field: 'email'
            });
        }

        // Phone validation
        if (!validatePhone(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid mobile number (10-15 digits).',
                field: 'mobile'
            });
        }

        // Insert into database
        const result = await pool.query(
            `INSERT INTO registrations 
                (participant_name, email, mobile, institute, state, district,
                 participation_type, presentation_category, presentation_title, 
                 abstract, practical_application, patent_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, created_at`,
            [
                participantName.trim(), email.trim().toLowerCase(), mobile.trim(),
                institute.trim(), state.trim(), district.trim(),
                participationType,
                isPresenter ? presentationCategory : null,
                isPresenter ? (presentationTitle || '').trim() : null,
                isPresenter ? (abstract || '').trim() : null,
                isPresenter ? (practicalApplication || '').trim() : null,
                isPresenter ? patentStatus : null
            ]
        );

        console.log(`✅ Registration #${result.rows[0].id} saved (${participationType})`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! A confirmation will be sent to your email.',
            registrationId: result.rows[0].id
        });

    } catch (err) {
        // Handle duplicate email
        if (err.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered. Please use a different email.',
                field: 'email'
            });
        }

        console.error('❌ Registration error:', err.message, err.stack);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            debug: err.message
        });
    }
});

// ── Health Check ──
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Pharma Anveshan 2026 API' });
});

// ── Get All Registrations (admin) ──
app.get('/api/registrations', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM registrations ORDER BY created_at DESC'
        );
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('❌ Fetch error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations.' });
    }
});

// ── Debug: Check Table Schema ──
app.get('/api/debug/schema', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'registrations'
            ORDER BY ordinal_position
        `);
        res.json({ success: true, columns: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Start Server ──
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initDB();
});

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { Resend } = require('resend');

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

// ── Resend Email Client (HTTP API — works on Railway) ──
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ── Branded HTML Email Builder ──
function buildConfirmationEmail(data) {
    const typeLabels = {
        principal: 'Principal',
        tpo: 'TPO',
        industry_representative: 'Industry Representative',
        regulatory_representative: 'Regulatory Representative',
        pg_student: 'PG Student',
        ug_student: 'UG Student',
        phd_scholar: 'PhD Scholar',
        researcher: 'Researcher'
    };

    const categoryLabels = {
        poster: 'Poster Presentation',
        oral: 'Oral Presentation of Patent',
        model: 'Model Presentation of Patent'
    };



    const isPresenter = !['principal', 'tpo', 'industry_representative', 'regulatory_representative'].includes(data.participation_type);

    const presenterSection = isPresenter ? `
        <tr><td colspan="2" style="padding:16px 0 8px;font-size:15px;font-weight:700;color:#0d5c2e;border-bottom:2px solid #e8f5e9;">Presentation Details</td></tr>
        <tr><td style="padding:10px 0;color:#666;width:40%;">Category</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${categoryLabels[data.presentation_category] || data.presentation_category}</td></tr>
        <tr><td style="padding:10px 0;color:#666;">Title</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.presentation_title}</td></tr>

    ` : '';

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f7f5;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-top:24px;margin-bottom:24px;">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0d5c2e,#1a9e4f);padding:36px 32px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;">Pharma Anveshan 2026</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">State-Level Conclave</p>
            </div>

            <!-- Success Banner -->
            <div style="background:#e8f5e9;padding:20px 32px;text-align:center;border-bottom:1px solid #c8e6c9;">
                <p style="margin:0;font-size:20px;">✅</p>
                <h2 style="margin:8px 0 4px;color:#0d5c2e;font-size:18px;font-weight:700;">Registration Confirmed!</h2>
                <p style="margin:0;color:#2e7d32;font-size:13px;">Registration ID: <strong>#${data.id}</strong></p>
            </div>

            <!-- Details -->
            <div style="padding:24px 32px;">
                <p style="margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;">Dear <strong>${data.participant_name}</strong>,</p>
                <p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.6;">Thank you for registering for <strong>Pharma Anveshan 2026</strong>. Your registration has been successfully received. Below are your details:</p>
                
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr><td colspan="2" style="padding:0 0 8px;font-size:15px;font-weight:700;color:#0d5c2e;border-bottom:2px solid #e8f5e9;">Participant Information</td></tr>
                    <tr><td style="padding:10px 0;color:#666;width:40%;">Name</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.participant_name}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">Email</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.email}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">Mobile</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.mobile}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">Institute</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.institute}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">State</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.state}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">District</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${data.district}</td></tr>
                    <tr><td style="padding:10px 0;color:#666;">Participation Type</td><td style="padding:10px 0;color:#1a1a2e;font-weight:600;">${typeLabels[data.participation_type] || data.participation_type}</td></tr>
                    ${presenterSection}
                </table>
            </div>

            <!-- Footer -->
            <div style="background:#f8faf9;padding:20px 32px;text-align:center;border-top:1px solid #e8e8e8;">
                <p style="margin:0 0 4px;color:#888;font-size:12px;">For any queries, contact us at the event helpdesk.</p>
                <p style="margin:0;color:#aaa;font-size:11px;">© 2026 Pharma Anveshan | State-Level Conclave</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ── Send Confirmation Email (non-blocking) ──
async function sendConfirmationEmail(registrationData) {
    if (!resend) {
        console.log('⚠️ Resend not configured — skipping email');
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Pharma Anveshan 2026 <noreply@pharmaanveshan.in>',
            to: [registrationData.email],
            subject: `✅ Registration Confirmed — Pharma Anveshan 2026 (ID #${registrationData.id})`,
            html: buildConfirmationEmail(registrationData)
        });

        if (error) {
            console.error(`❌ Email failed for ${registrationData.email}:`, error.message);
        } else {
            console.log(`📧 Confirmation email sent to ${registrationData.email} (ID: ${data.id})`);
        }
    } catch (err) {
        console.error(`❌ Email error for ${registrationData.email}:`, err.message);
    }
}

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

        // Migration: fix old table schema
        const migrations = [
            // Drop removed fields
            'ALTER TABLE registrations DROP COLUMN IF EXISTS pci_id',
            // Ensure columns exist
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS presentation_category VARCHAR(100)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS presentation_title TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS abstract TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS practical_application TEXT',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS patent_status VARCHAR(100)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS state VARCHAR(255)',
            'ALTER TABLE registrations ADD COLUMN IF NOT EXISTS district VARCHAR(255)',
            // Make presentation columns nullable (critical for non-presenter types)
            'ALTER TABLE registrations ALTER COLUMN presentation_category DROP NOT NULL',
            'ALTER TABLE registrations ALTER COLUMN presentation_title DROP NOT NULL',
            'ALTER TABLE registrations ALTER COLUMN abstract DROP NOT NULL',
            'ALTER TABLE registrations ALTER COLUMN practical_application DROP NOT NULL',
            'ALTER TABLE registrations ALTER COLUMN patent_status DROP NOT NULL'
        ];

        for (const sql of migrations) {
            try { await client.query(sql); } catch (e) { console.log('Migration skipped:', e.message); }
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
            abstract, practicalApplication
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
            const presenterRequired = { presentationCategory, presentationTitle, abstract, practicalApplication };
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
                 abstract, practical_application)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, created_at`,
            [
                participantName.trim(), email.trim().toLowerCase(), mobile.trim(),
                institute.trim(), state.trim(), district.trim(),
                participationType,
                isPresenter ? presentationCategory : null,
                isPresenter ? (presentationTitle || '').trim() : null,
                isPresenter ? (abstract || '').trim() : null,
                isPresenter ? (practicalApplication || '').trim() : null
            ]
        );

        console.log(`✅ Registration #${result.rows[0].id} saved (${participationType})`);

        // Send confirmation email (non-blocking — doesn't delay API response)
        const registrationRecord = {
            id: result.rows[0].id,
            participant_name: participantName.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            institute: institute.trim(),
            state: state.trim(),
            district: district.trim(),
            participation_type: participationType,
            presentation_category: isPresenter ? presentationCategory : null,
            presentation_title: isPresenter ? (presentationTitle || '').trim() : null,
            abstract: isPresenter ? (abstract || '').trim() : null,
            practical_application: isPresenter ? (practicalApplication || '').trim() : null
        };
        sendConfirmationEmail(registrationRecord); // Fire-and-forget

        res.status(201).json({
            success: true,
            message: 'Registration successful! A confirmation email has been sent.',
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
            message: 'Something went wrong. Please try again later.'
        });
    }
});

// ── Health Check ──
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Pharma Anveshan 2026 API' });
});

// ── Email Test Endpoint (temporary) ──
app.get('/api/test-email', async (req, res) => {
    const email = req.query.to;
    if (!email) return res.status(400).json({ error: 'Provide ?to=email@example.com' });

    if (!resend) {
        return res.json({ status: 'fail', error: 'RESEND_API_KEY not set' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Pharma Anveshan 2026 <noreply@pharmaanveshan.in>',
            to: [email],
            subject: '🧪 Test Email — Pharma Anveshan 2026',
            html: '<h2 style="color:#0d5c2e;">✅ Email is working!</h2><p>This is a test from Pharma Anveshan 2026 backend.</p>'
        });

        if (error) {
            res.json({ status: 'fail', error: error.message });
        } else {
            res.json({ status: 'success', emailId: data.id, to: email });
        }
    } catch (err) {
        res.json({ status: 'fail', error: err.message });
    }
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

// ── Delete Registration by ID (admin) ──
app.delete('/api/registrations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM registrations WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found.' });
        }
        res.json({ success: true, message: `Registration #${id} deleted.` });
    } catch (err) {
        console.error('❌ Delete error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to delete registration.' });
    }
});

// ── Start Server ──
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initDB();
});

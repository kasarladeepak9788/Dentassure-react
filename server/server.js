import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import biometricRoutes from './biometric.js';
import onboardingRoutes from './onboarding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

const API_BUILD_ID = 'dentassure-candidate-credentials-v2';

// =====================================================
// MIDDLEWARE
// =====================================================

app.use((req, res, next) => {
    res.setHeader('X-DentAssure-API-Build', API_BUILD_ID);
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// =====================================================
// BIOMETRIC INTEGRATION
// =====================================================

app.use('/api/biometric', biometricRoutes);
app.use('/api/onboarding', onboardingRoutes);
// =====================================================
// MYSQL CONNECTION
// =====================================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dentassure',
    waitForConnections: true,
    connectionLimit: 10
});

// =====================================================
// FILE UPLOAD CONFIGURATION
// =====================================================

const uploadDir = path.join(__dirname, 'uploads', 'chat');

fs.mkdirSync(uploadDir, { recursive: true });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

// =====================================================
// CANDIDATE AUTHENTICATION HELPERS
// =====================================================

// For production, configure CANDIDATE_PORTAL_SECRET
// using a long, random secret in your environment.

const CANDIDATE_PORTAL_SECRET =
    process.env.CANDIDATE_PORTAL_SECRET ||
    crypto.randomBytes(32).toString('hex');

function signCandidateToken(payload) {
    const encoded = Buffer
        .from(JSON.stringify(payload))
        .toString('base64url');

    const signature = crypto
        .createHmac('sha256', CANDIDATE_PORTAL_SECRET)
        .update(encoded)
        .digest('base64url');

    return `${encoded}.${signature}`;
}

function verifyCandidateToken(token) {
    try {
        const [encoded, signature] = String(token || '').split('.');

        if (!encoded || !signature) {
            return null;
        }

        const expected = crypto
            .createHmac('sha256', CANDIDATE_PORTAL_SECRET)
            .update(encoded)
            .digest();

        const supplied = Buffer.from(signature, 'base64url');

        if (
            expected.length !== supplied.length ||
            !crypto.timingSafeEqual(expected, supplied)
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(encoded, 'base64url').toString('utf8')
        );

        if (
            !payload.exp ||
            payload.exp < Math.floor(Date.now() / 1000) ||
            !payload.application_id ||
            !payload.username
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

// =====================================================
// PASSWORD HELPERS
// =====================================================

function hashCandidatePassword(password, salt) {
    return crypto
        .scryptSync(password, salt, 64)
        .toString('hex');
}

function verifyCandidatePassword(password, salt, storedHash) {
    try {
        const calculated = Buffer.from(
            hashCandidatePassword(password, salt),
            'hex'
        );

        const stored = Buffer.from(storedHash, 'hex');

        return (
            calculated.length === stored.length &&
            crypto.timingSafeEqual(calculated, stored)
        );
    } catch {
        return false;
    }
}

// =====================================================
// COMMON ERROR HANDLER
// =====================================================

function sendServerError(res, error) {
    console.error('[DentAssure API Error]', error);

    return res.status(500).json({
        success: false,
        message: 'A server error occurred. Check the backend terminal.'
    });
}

// =====================================================
// API VERSION
// =====================================================

app.get('/api/version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    res.json({
        success: true,
        service: 'DentAssure API',
        build: API_BUILD_ID,
        port: PORT,
        candidate_application_credentials: true
    });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            success: true,
            service: 'DentAssure API',
            database: 'connected'
        });
    } catch (error) {
        sendServerError(res, error);
    }
});

// =====================================================
// EMPLOYEES
// =====================================================

app.get('/api/employees', async (_req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id,
                employee_code,
                name,
                email,
                role,
                department,
                online,
                last_seen
            FROM employees
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            employees: rows
        });
    } catch (error) {
        sendServerError(res, error);
    }
});

// =====================================================
// GET CHAT MESSAGES
// =====================================================

app.get('/api/messages/:employeeId', async (req, res) => {
    try {
        const employeeId = Number(req.params.employeeId);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

        const [rows] = await pool.query(
            `
            SELECT
                cm.id,
                cm.sender_id,
                cm.receiver_id,
                cm.message,
                cm.file_name,
                cm.file_path,
                cm.is_read,
                DATE_FORMAT(
                    cm.created_at,
                    '%Y-%m-%d %H:%i:%s'
                ) AS created_at,
                CASE
                    WHEN cm.sender_id IS NULL THEN 'Management'
                    ELSE COALESCE(e.name, 'Staff')
                END AS sender_name
            FROM chat_messages cm
            LEFT JOIN employees e
                ON e.id = cm.sender_id
            WHERE
                (cm.sender_id IS NULL AND cm.receiver_id = ?)
                OR
                (cm.sender_id = ? AND cm.receiver_id IS NULL)
            ORDER BY cm.id ASC
            `,
            [employeeId, employeeId]
        );

        await pool.query(
            `
            UPDATE chat_messages
            SET is_read = 1
            WHERE sender_id IS NULL
              AND receiver_id = ?
            `,
            [employeeId]
        );

        res.json({
            success: true,
            messages: rows
        });
    } catch (error) {
        sendServerError(res, error);
    }
});

// =====================================================
// SEND CHAT MESSAGE
// =====================================================

app.post('/api/messages', async (req, res) => {
    try {
        const { senderType, employeeId, message } = req.body;

        if (
            typeof message !== 'string' ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Message is empty.'
            });
        }

        if (!['management', 'employee'].includes(senderType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sender type.'
            });
        }

        const id = Number(employeeId);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid employee ID is required.'
            });
        }

        const sender = senderType === 'management' ? null : id;
        const receiver = senderType === 'management' ? id : null;

        const [result] = await pool.query(
            `
            INSERT INTO chat_messages
                (sender_id, receiver_id, message, is_read)
            VALUES (?, ?, ?, 0)
            `,
            [sender, receiver, message.trim()]
        );

        res.status(201).json({
            success: true,
            message_id: result.insertId
        });
    } catch (error) {
        sendServerError(res, error);
    }
});

// =====================================================
// UPLOAD CHAT FILE
// =====================================================

app.post('/api/upload', upload.single('file'), async (req, res) => {
    let temporaryPath = req.file?.path;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file selected.'
            });
        }

        const ext = path.extname(
            req.file.originalname
        ).toLowerCase();

        const allowedExtensions = [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.txt',
            '.jpg',
            '.jpeg',
            '.png',
            '.zip'
        ];

        if (!allowedExtensions.includes(ext)) {
            fs.unlinkSync(req.file.path);
            temporaryPath = null;

            return res.status(400).json({
                success: false,
                message: 'File type is not allowed.'
            });
        }

        const senderType = req.body.senderType;
        const employeeId = Number(req.body.employeeId);

        if (
            !['management', 'employee'].includes(senderType) ||
            !Number.isInteger(employeeId) ||
            employeeId <= 0
        ) {
            fs.unlinkSync(req.file.path);
            temporaryPath = null;

            return res.status(400).json({
                success: false,
                message: 'Valid sender type and employee ID are required.'
            });
        }

        const safeName =
            `chat_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;

        const destination = path.join(uploadDir, safeName);

        fs.renameSync(req.file.path, destination);
        temporaryPath = null;

        const sender = senderType === 'management'
            ? null
            : employeeId;

        const receiver = senderType === 'management'
            ? employeeId
            : null;

        const relativePath = `uploads/chat/${safeName}`;

        const [result] = await pool.query(
            `
            INSERT INTO chat_messages
            (
                sender_id,
                receiver_id,
                message,
                file_name,
                file_path,
                is_read
            )
            VALUES (?, ?, ?, ?, ?, 0)
            `,
            [
                sender,
                receiver,
                `File: ${req.file.originalname}`,
                req.file.originalname,
                relativePath
            ]
        );

        res.status(201).json({
            success: true,
            file_name: req.file.originalname,
            file_path: relativePath,
            message_id: result.insertId
        });
    } catch (error) {
        if (temporaryPath && fs.existsSync(temporaryPath)) {
            fs.unlinkSync(temporaryPath);
        }

        sendServerError(res, error);
    }
});
// =====================================================
// RECRUITMENT ROLES
// =====================================================

// GET ALL RECRUITMENT ROLES

app.get('/api/recruitment/roles', async (req, res) => {
    try {
        const [roles] = await pool.query(`
            SELECT *
            FROM recruitment_roles
            ORDER BY created_at DESC
        `);

        return res.json({
            success: true,
            roles
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});


// CREATE RECRUITMENT ROLE

app.post('/api/recruitment/roles', async (req, res) => {
    try {
        const {
            id,
            title,
            department,
            openings = 1,
            employment_type = 'Full-time',
            location,
            priority = 'Normal',
            reason,
            description,
            skills,
            qualification,
            deadline,
            status = 'Pending Approval'
        } = req.body;

        if (
            !id ||
            !title?.trim() ||
            !department?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Role ID, title and department are required.'
            });
        }

        const allowedStatuses = [
            'Pending Approval',
            'Pending HR Review',
            'Approved',
            'Published',
            'Closed',
            'Rejected'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recruitment role status.'
            });
        }

        const openingCount = Number(openings);

        if (
            !Number.isInteger(openingCount) ||
            openingCount < 1
        ) {
            return res.status(400).json({
                success: false,
                message: 'Openings must be a positive whole number.'
            });
        }

        await pool.query(
            `
            INSERT INTO recruitment_roles
            (
                id,
                title,
                department,
                openings,
                employment_type,
                location,
                priority,
                reason,
                description,
                skills,
                qualification,
                deadline,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                String(id),
                title.trim(),
                department.trim(),
                openingCount,
                employment_type,
                location || null,
                priority,
                reason || null,
                description || null,
                Array.isArray(skills)
                    ? skills.join(', ')
                    : (skills || null),
                qualification || null,
                deadline || null,
                status
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Recruitment role created successfully.'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'That recruitment role ID already exists.'
            });
        }

        return sendServerError(res, error);
    }
});


// UPDATE RECRUITMENT ROLE STATUS

app.patch('/api/recruitment/roles/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            'Pending Approval',
            'Pending HR Review',
            'Approved',
            'Published',
            'Closed',
            'Rejected'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recruitment status.'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE recruitment_roles
            SET status = ?
            WHERE id = ?
            `,
            [status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Recruitment role not found.'
            });
        }

        return res.json({
            success: true,
            message: 'Recruitment role status updated successfully.'
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});


// GET PUBLISHED JOBS FOR CAREERS PAGE

app.get('/api/recruitment/jobs', async (req, res) => {
    try {
        const [jobs] = await pool.query(`
            SELECT
                id,
                title,
                department,
                openings,
                employment_type,
                location,
                description,
                skills,
                qualification,
                deadline
            FROM recruitment_roles
            WHERE status = 'Published'
              AND (
                  deadline IS NULL
                  OR deadline >= CURDATE()
              )
            ORDER BY created_at DESC
        `);

        return res.json({
            success: true,
            jobs
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// CANDIDATE APPLICATION SUBMISSION
// POST /api/recruitment/applications
// =====================================================

app.post('/api/recruitment/applications', async (req, res) => {
    let connection;

    try {
        console.log(
            '[DentAssure] Candidate application received.'
        );

        const {
            id,
            name,
            email,
            phone,
            qualification,
            experience,
            skills,
            linkedin,
            cover_letter,
            resume_name,
            job_id,
            job_title,
            department
        } = req.body || {};

        // Validate required fields.

        if (
            !id ||
            typeof name !== 'string' ||
            !name.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof phone !== 'string' ||
            !phone.trim() ||
            typeof job_title !== 'string' ||
            !job_title.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Application ID, name, email, phone and job title are required.'
            });
        }

        const applicationId = String(id).trim();
        const candidateName = name.trim();
        const candidateEmail = email.trim().toLowerCase();
        const candidatePhone = phone.trim();
        const candidateJobTitle = job_title.trim();

        // Verify that the selected job is still published.

        if (job_id) {
            const [jobs] = await pool.query(
                `
                SELECT id
                FROM recruitment_roles
                WHERE id = ?
                  AND status = 'Published'
                  AND (
                      deadline IS NULL
                      OR deadline >= CURDATE()
                  )
                LIMIT 1
                `,
                [job_id]
            );

            if (!jobs.length) {
                return res.status(400).json({
                    success: false,
                    message:
                        'This job is not currently available for applications.'
                });
            }
        }

        // Generate a unique username and temporary password.

        const username =
            'da_' + crypto.randomBytes(8).toString('hex');

        const temporaryPassword =
            'DA-' +
            crypto.randomBytes(12).toString('base64url') +
            '-9!';

        const passwordSalt =
            crypto.randomBytes(16).toString('hex');

        const passwordHash = hashCandidatePassword(
            temporaryPassword,
            passwordSalt
        );

        // Start the transaction.

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Save candidate application.

        await connection.query(
            `
            INSERT INTO recruitment_candidates
            (
                id,
                name,
                email,
                phone,
                qualification,
                experience,
                skills,
                linkedin,
                cover_letter,
                resume_name,
                job_id,
                job_title,
                department,
                stage
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied')
            `,
            [
                applicationId,
                candidateName,
                candidateEmail,
                candidatePhone,
                qualification || null,
                experience || null,
                Array.isArray(skills)
                    ? skills.join(', ')
                    : (skills || null),
                linkedin || null,
                cover_letter || null,
                resume_name || null,
                job_id || null,
                candidateJobTitle,
                department || null
            ]
        );

        // Create the candidate portal account.

        await connection.query(
            `
            INSERT INTO recruitment_candidate_accounts
            (
                application_id,
                username,
                password_hash,
                password_salt,
                is_temporary,
                account_status
            )
            VALUES (?, ?, ?, ?, 1, 'Active')
            `,
            [
                applicationId,
                username,
                passwordHash,
                passwordSalt
            ]
        );

        // Commit both inserts.

        await connection.commit();

        console.log(
            '[DentAssure] Candidate application created:',
            applicationId
        );

        // Return credentials once to the Careers page.

        res.setHeader('Cache-Control', 'no-store');

        return res.status(201).json({
            success: true,
            message:
                'Application submitted successfully. Save your candidate portal credentials.',
            application_id: applicationId,
            username: username,
            temporary_password: temporaryPassword,
            stage: 'Applied'
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    '[DentAssure] Rollback error:',
                    rollbackError.message
                );
            }
        }

        console.error(
            '[DentAssure] Application error:',
            error
        );

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message:
                    'This application ID or account already exists.'
            });
        }

        return sendServerError(res, error);

    } finally {
        if (connection) {
            connection.release();
        }
    }
});
// =====================================================
// CANDIDATE LOGIN
// POST /api/recruitment/candidate/login
// =====================================================

app.post('/api/recruitment/candidate/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.'
            });
        }

        const [accounts] = await pool.query(
            `
            SELECT
                application_id,
                username,
                password_hash,
                password_salt,
                is_temporary,
                account_status
            FROM recruitment_candidate_accounts
            WHERE username = ?
            LIMIT 1
            `,
            [username.trim()]
        );

        if (!accounts.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const account = accounts[0];

        if (account.account_status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'This candidate account is disabled.'
            });
        }

        const validPassword = verifyCandidatePassword(
            password,
            account.password_salt,
            account.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const token = signCandidateToken({
            application_id: account.application_id,
            username: account.username,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8)
        });

        return res.json({
            success: true,
            message: 'Candidate login successful.',
            token,
            username: account.username,
            application_id: account.application_id,
            is_temporary: Boolean(account.is_temporary)
        });

    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// CANDIDATE APPLICATION STATUS
// GET /api/recruitment/candidate/application
// =====================================================

app.get('/api/recruitment/candidate/application', async (req, res) => {
    try {
        const authorization = req.headers.authorization || '';

        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Candidate login is required.'
            });
        }

        const token = authorization.slice(7);
        const session = verifyCandidateToken(token);

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Your session is invalid or expired.'
            });
        }

        const [rows] = await pool.query(
            `
            SELECT
                c.id AS application_id,
                c.name,
                c.email,
                c.job_title,
                c.department,
                c.stage,
                c.applied_at,
                c.updated_at,
                a.username,
                a.is_temporary
            FROM recruitment_candidates c
            INNER JOIN recruitment_candidate_accounts a
                ON a.application_id = c.id
            WHERE c.id = ?
              AND a.username = ?
              AND a.account_status = 'Active'
            LIMIT 1
            `,
            [
                session.application_id,
                session.username
            ]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Candidate application not found.'
            });
        }

        return res.json({
            success: true,
            application: rows[0]
        });

    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// MANAGEMENT: LIST CANDIDATE APPLICATIONS
// GET /api/recruitment/applications
// =====================================================

app.get('/api/recruitment/applications', async (req, res) => {
    try {
       const [candidates] = await pool.query(`
    SELECT
        c.*,
        a.username,
        a.account_status,
        a.is_temporary
    FROM recruitment_candidates c
    LEFT JOIN recruitment_candidate_accounts a
        ON a.application_id = c.id
    ORDER BY c.applied_at DESC
`);

        return res.json({
            success: true,
            candidates
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// UPDATE CANDIDATE APPLICATION STAGE
// PATCH /api/recruitment/applications/:id/stage
// =====================================================

app.patch('/api/recruitment/applications/:id/stage', async (req, res) => {
    try {
        const { stage } = req.body;

        const allowedStages = [
            'Applied',
            'Screening',
            'Shortlisted',
            'Interview Scheduled',
            'Interview Completed',
            'Interviewed',
            'Selected',
            'Consent',
            'Documents',
            'Onboarding',
            'Employee',
            'On Hold',
            'Rejected'
        ];

        if (!allowedStages.includes(stage)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid candidate stage.'
            });
        }

        // Selection should use a separate, protected
        // management-only operation in production.

        if (stage === 'Selected') {
            return res.status(400).json({
                success: false,
                message:
                    'Use the protected candidate selection action.'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE recruitment_candidates
            SET stage = ?
            WHERE id = ?
            `,
            [stage, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Candidate application not found.'
            });
        }

        return res.json({
            success: true,
            message: 'Candidate stage updated successfully.'
        });

    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// APPLICATION STATUS LOOKUP
// GET /api/recruitment/applications/:id/status
// =====================================================

app.get('/api/recruitment/applications/:id/status', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                job_title,
                stage,
                applied_at,
                updated_at
            FROM recruitment_candidates
            WHERE id = ?
            LIMIT 1
            `,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Application not found.'
            });
        }

        return res.json({
            success: true,
            application: rows[0]
        });

    } catch (error) {
        return sendServerError(res, error);
    }
});
// =====================================================
// START DENTASSURE API
// =====================================================

app.listen(PORT, () => {
    console.log('======================================');
    console.log('DentAssure API started successfully');
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Version: ${API_BUILD_ID}`);
    console.log('======================================');
});

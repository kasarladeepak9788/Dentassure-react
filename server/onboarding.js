import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const router = express.Router();

/*
 * DentAssure 360 - Employee Onboarding API
 *
 * Features:
 * 1. Offer management
 * 2. Candidate onboarding status
 * 3. Document verification
 * 4. Onboarding approval
 * 5. Permanent employee account creation
 *
 * IMPORTANT:
 * Connect these routes to your existing authentication
 * and role-based authorization middleware before production use.
 */

// --------------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------------

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dentassure',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function sendError(res, error, status = 500) {
    console.error('Onboarding API error:', error);

    return res.status(status).json({
        success: false,
        message: status === 500
            ? 'An internal server error occurred.'
            : error
    });
}

function isValidId(value) {
    return typeof value === 'string' &&
        value.trim().length > 0 &&
        value.length <= 100;
}

function generateEmployeeCode() {
    return `DA-EMP-${crypto.randomBytes(5)
        .toString('hex')
        .toUpperCase()}`;
}

function generateTemporaryPassword() {
    return crypto.randomBytes(24).toString('base64url');
}

/*
 * Compatibility note:
 * This uses the same scrypt algorithm and output length
 * as the candidate password helper previously shared.
 *
 * Confirm the existing employee login verifier uses this
 * exact format before enabling permanent account login.
 */
function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function normalizeText(value, maxLength = 255) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

// --------------------------------------------------
// HEALTH CHECK
// GET /api/onboarding/status
// --------------------------------------------------

router.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            success: true,
            module: 'DentAssure 360 Onboarding',
            databaseConnected: true
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// GET CANDIDATE ONBOARDING DETAILS
// GET /api/onboarding/candidate/:applicationId
// --------------------------------------------------

router.get('/candidate/:applicationId', async (req, res) => {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
        return sendError(res, 'Invalid application ID.', 400);
    }

    try {
        const [candidates] = await pool.execute(
            `SELECT
                id,
                name,
                email,
                phone,
                qualification,
                job_title,
                department,
                stage,
                applied_at
             FROM recruitment_candidates
             WHERE id = ?
             LIMIT 1`,
            [applicationId]
        );

        if (candidates.length === 0) {
            return sendError(res, 'Candidate not found.', 404);
        }

        res.json({
            success: true,
            candidate: candidates[0]
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// CREATE OFFER
// POST /api/onboarding/offers
//
// Body:
// {
//   "applicationId": "candidate-id",
//   "designation": "Database Intern",
//   "department": "Technology",
//   "annualSalary": 300000,
//   "joiningDate": "2026-11-02",
//   "createdBy": "management"
// }
// --------------------------------------------------

router.post('/offers', async (req, res) => {
    const applicationId = normalizeText(req.body.applicationId, 100);
    const designation = normalizeText(req.body.designation, 180);
    const department = normalizeText(req.body.department, 150);
    const joiningDate = req.body.joiningDate;
    const annualSalary = Number(req.body.annualSalary);
    const createdBy = normalizeText(req.body.createdBy, 180);

    if (
        !applicationId ||
        !designation ||
        !department ||
        !createdBy ||
        !Number.isFinite(annualSalary) ||
        annualSalary < 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate || '')
    ) {
        return sendError(
            res,
            'Provide a valid application ID, designation, department, salary, joining date, and creator.',
            400
        );
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [candidates] = await connection.execute(
            `SELECT id, stage
             FROM recruitment_candidates
             WHERE id = ?
             FOR UPDATE`,
            [applicationId]
        );

        if (candidates.length === 0) {
            await connection.rollback();
            return sendError(res, 'Candidate not found.', 404);
        }

        const allowedStages = ['Selected', 'Shortlisted', 'Interview Completed'];

        if (!allowedStages.includes(candidates[0].stage)) {
            await connection.rollback();

            return sendError(
                res,
                'The candidate must be selected or approved for an offer before an offer can be created.',
                409
            );
        }

        const [existingOffers] = await connection.execute(
            `SELECT id, status
             FROM recruitment_offers
             WHERE application_id = ?
               AND status IN ('Draft', 'Pending Approval', 'Approved', 'Sent', 'Accepted')
             LIMIT 1`,
            [applicationId]
        );

        if (existingOffers.length > 0) {
            await connection.rollback();

            return sendError(
                res,
                'An active offer already exists for this candidate.',
                409
            );
        }

        const [result] = await connection.execute(
            `INSERT INTO recruitment_offers
                (
                    application_id,
                    designation,
                    department,
                    annual_salary,
                    joining_date,
                    status,
                    created_by
                )
             VALUES (?, ?, ?, ?, ?, 'Pending Approval', ?)`,
            [
                applicationId,
                designation,
                department,
                annualSalary,
                joiningDate,
                createdBy
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Offer created and submitted for management approval.',
            offerId: result.insertId,
            status: 'Pending Approval'
        });
    } catch (error) {
    await connection.rollback();

    console.error('OFFER CREATION FAILED:', error);

    res.status(500).json({
        success: false,
        message: 'Offer creation failed.',
        error: error.message,
        code: error.code || null
    });
} finally {
    connection.release();
}
});

// --------------------------------------------------
// APPROVE OR REJECT AN OFFER
// PATCH /api/onboarding/offers/:offerId/decision
//
// Body:
// {
//   "decision": "Approved",
//   "approvedBy": "management"
// }
// --------------------------------------------------

router.patch('/offers/:offerId/decision', async (req, res) => {
    const offerId = Number(req.params.offerId);
    const decision = req.body.decision;
    const approvedBy = normalizeText(req.body.approvedBy, 180);

    if (
        !Number.isSafeInteger(offerId) ||
        offerId <= 0 ||
        !['Approved', 'Rejected'].includes(decision) ||
        !approvedBy
    ) {
        return sendError(res, 'Invalid offer decision.', 400);
    }

    try {
        const [result] = await pool.execute(
            `UPDATE recruitment_offers
             SET status = ?,
                 approved_by = ?,
                 approved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND status = 'Pending Approval'`,
            [decision, approvedBy, offerId]
        );

        if (result.affectedRows === 0) {
            return sendError(
                res,
                'Offer not found or it is no longer awaiting approval.',
                404
            );
        }

        res.json({
            success: true,
            message: `Offer ${decision.toLowerCase()} successfully.`,
            status: decision
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// RECORD CANDIDATE OFFER RESPONSE
// PATCH /api/onboarding/offers/:offerId/response
//
// Body:
// {
//   "response": "Accepted"
// }
// --------------------------------------------------

router.patch('/offers/:offerId/response', async (req, res) => {
    const offerId = Number(req.params.offerId);
    const response = req.body.response;

    if (
        !Number.isSafeInteger(offerId) ||
        offerId <= 0 ||
        !['Accepted', 'Declined'].includes(response)
    ) {
        return sendError(res, 'Invalid offer response.', 400);
    }

    try {
        const [result] = await pool.execute(
            `UPDATE recruitment_offers
             SET status = ?,
                 candidate_responded_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND status IN ('Approved', 'Sent')`,
            [response, offerId]
        );

        if (result.affectedRows === 0) {
            return sendError(
                res,
                'Offer not found or it is not available for a response.',
                404
            );
        }

        res.json({
            success: true,
            message: `Offer ${response.toLowerCase()}.`,
            status: response
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// LIST ONBOARDING DOCUMENTS
// GET /api/onboarding/documents/:applicationId
// --------------------------------------------------

router.get('/documents/:applicationId', async (req, res) => {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
        return sendError(res, 'Invalid application ID.', 400);
    }

    try {
        const [documents] = await pool.execute(
            `SELECT
                id,
                application_id,
                document_type,
                original_filename,
                verification_status,
                rejection_reason,
                uploaded_at,
                verified_at
             FROM recruitment_onboarding_documents
             WHERE application_id = ?
             ORDER BY uploaded_at DESC`,
            [applicationId]
        );

        res.json({
            success: true,
            documents
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// REGISTER DOCUMENT METADATA
// POST /api/onboarding/documents
//
// This endpoint records metadata only.
// It does NOT upload or store a physical file.
//
// Body:
// {
//   "applicationId": "candidate-id",
//   "documentType": "PAN",
//   "originalFilename": "pan.pdf",
//   "storageKey": "private-storage-key"
// }
//
// A separate authenticated upload handler must store
// the file securely and generate the storage key.
// --------------------------------------------------

router.post('/documents', async (req, res) => {
    const applicationId = normalizeText(req.body.applicationId, 100);
    const documentType = normalizeText(req.body.documentType, 100);
    const originalFilename = normalizeText(req.body.originalFilename, 255);
    const storageKey = normalizeText(req.body.storageKey, 500);

    const allowedTypes = [
        'Identity Proof',
        'PAN',
        'Education Certificate',
        'Resume',
        'Photograph',
        'Address Proof',
        'Bank Details',
        'Other'
    ];

    if (
        !applicationId ||
        !allowedTypes.includes(documentType) ||
        !originalFilename ||
        !storageKey
    ) {
        return sendError(res, 'Invalid document information.', 400);
    }

    try {
        const [candidates] = await pool.execute(
            `SELECT id
             FROM recruitment_candidates
             WHERE id = ?
             LIMIT 1`,
            [applicationId]
        );

        if (candidates.length === 0) {
            return sendError(res, 'Candidate not found.', 404);
        }

        const [result] = await pool.execute(
            `INSERT INTO recruitment_onboarding_documents
                (
                    application_id,
                    document_type,
                    original_filename,
                    storage_key,
                    verification_status
                )
             VALUES (?, ?, ?, ?, 'Pending')`,
            [
                applicationId,
                documentType,
                originalFilename,
                storageKey
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Document metadata recorded for verification.',
            documentId: result.insertId,
            verificationStatus: 'Pending'
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// VERIFY OR REJECT A DOCUMENT
// PATCH /api/onboarding/documents/:documentId/decision
//
// Body:
// {
//   "decision": "Verified",
//   "verifiedBy": "hr-user",
//   "reason": ""
// }
// --------------------------------------------------

router.patch('/documents/:documentId/decision', async (req, res) => {
    const documentId = Number(req.params.documentId);
    const decision = req.body.decision;
    const verifiedBy = normalizeText(req.body.verifiedBy, 180);
    const reason = normalizeText(req.body.reason, 1000);

    if (
        !Number.isSafeInteger(documentId) ||
        documentId <= 0 ||
        !['Verified', 'Rejected'].includes(decision) ||
        !verifiedBy ||
        (decision === 'Rejected' && !reason)
    ) {
        return sendError(
            res,
            'Provide a valid decision, verifier, and rejection reason when rejecting a document.',
            400
        );
    }

    try {
        const [result] = await pool.execute(
            `UPDATE recruitment_onboarding_documents
             SET verification_status = ?,
                 verified_by = ?,
                 rejection_reason = ?,
                 verified_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                decision,
                verifiedBy,
                decision === 'Rejected' ? reason : null,
                documentId
            ]
        );

        if (result.affectedRows === 0) {
            return sendError(res, 'Document not found.', 404);
        }

        res.json({
            success: true,
            message: `Document marked ${decision.toLowerCase()}.`,
            verificationStatus: decision
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// GET ONBOARDING READINESS
// GET /api/onboarding/readiness/:applicationId
// --------------------------------------------------

router.get('/readiness/:applicationId', async (req, res) => {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
        return sendError(res, 'Invalid application ID.', 400);
    }

    try {
        const [offers] = await pool.execute(
            `SELECT id, status, designation, department, joining_date
             FROM recruitment_offers
             WHERE application_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [applicationId]
        );

        const [documents] = await pool.execute(
            `SELECT
                document_type,
                verification_status
             FROM recruitment_onboarding_documents
             WHERE application_id = ?`,
            [applicationId]
        );

        const requiredTypes = [
            'Identity Proof',
            'PAN',
            'Education Certificate',
            'Resume',
            'Photograph'
        ];

        const documentSummary = requiredTypes.map(type => {
            const matching = documents.filter(
                document => document.document_type === type
            );

            return {
                documentType: type,
                required: true,
                verified: matching.some(
                    document => document.verification_status === 'Verified'
                ),
                status: matching.length === 0
                    ? 'Missing'
                    : matching.some(
                        document => document.verification_status === 'Verified'
                    )
                        ? 'Verified'
                        : matching.some(
                            document => document.verification_status === 'Pending'
                        )
                            ? 'Pending'
                            : 'Rejected'
            };
        });

        const offerAccepted =
            offers.length > 0 && offers[0].status === 'Accepted';

        const allDocumentsVerified = documentSummary.every(
            document => document.verified
        );

        res.json({
            success: true,
            applicationId,
            offer: offers[0] || null,
            offerAccepted,
            documents: documentSummary,
            allDocumentsVerified,
            readyForFinalApproval:
                offerAccepted && allDocumentsVerified
        });
    } catch (error) {
        sendError(res, error);
    }
});

// --------------------------------------------------
// FINAL ONBOARDING APPROVAL
// POST /api/onboarding/approve
//
// Body:
// {
//   "applicationId": "candidate-id",
//   "approvedBy": "management"
// }
// --------------------------------------------------

router.post('/approve', async (req, res) => {
    const applicationId = normalizeText(req.body.applicationId, 100);
    const approvedBy = normalizeText(req.body.approvedBy, 180);

    if (!applicationId || !approvedBy) {
        return sendError(
            res,
            'Application ID and approver are required.',
            400
        );
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [offers] = await connection.execute(
            `SELECT id, status
             FROM recruitment_offers
             WHERE application_id = ?
             ORDER BY id DESC
             LIMIT 1
             FOR UPDATE`,
            [applicationId]
        );

        if (offers.length === 0 || offers[0].status !== 'Accepted') {
            await connection.rollback();

            return sendError(
                res,
                'The candidate must have an accepted offer.',
                409
            );
        }

        const [documents] = await connection.execute(
            `SELECT document_type, verification_status
             FROM recruitment_onboarding_documents
             WHERE application_id = ?`,
            [applicationId]
        );

        const requiredTypes = [
            'Identity Proof',
            'PAN',
            'Education Certificate',
            'Resume',
            'Photograph'
        ];

        const missingOrUnverified = requiredTypes.filter(type =>
            !documents.some(document =>
                document.document_type === type &&
                document.verification_status === 'Verified'
            )
        );

        if (missingOrUnverified.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Required documents are missing or not verified.',
                missingOrUnverified
            });
        }

        const [existing] = await connection.execute(
            `SELECT id
             FROM recruitment_onboarding
             WHERE application_id = ?
             LIMIT 1`,
            [applicationId]
        );

        if (existing.length > 0) {
            await connection.rollback();

            return sendError(
                res,
                'Onboarding has already been approved.',
                409
            );
        }

        await connection.execute(
            `INSERT INTO recruitment_onboarding
                (
                    application_id,
                    status,
                    approved_by,
                    approved_at
                )
             VALUES (?, 'Approved', ?, CURRENT_TIMESTAMP)`,
            [applicationId, approvedBy]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Onboarding approved. Employee account creation can proceed.',
            status: 'Approved'
        });
    } catch (error) {
        await connection.rollback();
        sendError(res, error);
    } finally {
        connection.release();
    }
});

// --------------------------------------------------
// CREATE PERMANENT EMPLOYEE ACCOUNT
//
// Do not enable this endpoint until:
// 1. The existing employee login password verifier
//    has been confirmed.
// 2. Authentication and management authorization
//    middleware have been attached.
// 3. The activation/reset-password flow is implemented.
//
// Never send a permanent account's generated password
// in an API response or save it in plaintext.
// --------------------------------------------------

router.post('/create-employee', async (req, res) => {
    return res.status(501).json({
        success: false,
        message:
            'Permanent employee creation is not enabled yet. ' +
            'The existing employee login password verification ' +
            'must be checked first to prevent login failures.'
    });
});

export default router;
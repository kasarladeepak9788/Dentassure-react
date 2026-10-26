import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dentassure',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check biometric integration status
router.get('/status', async (req, res) => {
    let databaseConnected = false;

    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        databaseConnected = true;
    } catch (error) {
        console.error('Biometric database connection error:', error.message);
    }

    res.json({
        success: true,
        integration: 'Secureye Biometric',
        status: 'pending_configuration',
        source: 'ONtime Attendance',
        databaseConnected,
        message: databaseConnected
            ? 'The DentAssure database is connected. ONtime Attendance integration still needs configuration.'
            : 'The DentAssure database connection failed.'
    });
});

// Get attendance for an employee for today
router.get('/attendance/:employeeCode', async (req, res) => {
    const employeeCode = String(req.params.employeeCode || '').trim();

    if (!employeeCode) {
        return res.status(400).json({
            success: false,
            message: 'Employee code is required.'
        });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT
                employee_id,
                employee_name,
                attendance_date,
                attendance_type,
                check_in,
                check_out,
                active_hours
             FROM attendance
             WHERE employee_id = ?
               AND attendance_date = CURDATE()
             ORDER BY id DESC
             LIMIT 1`,
            [employeeCode]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                attendance: {
                    employeeCode,
                    employeeName: '',
                    date: new Date().toISOString().slice(0, 10),
                    attendanceType: null,
                    checkIn: null,
                    checkOut: null,
                    workingHours: null
                },
                message: 'No attendance record exists for this employee today.'
            });
        }

        const record = rows[0];

        return res.json({
            success: true,
            attendance: {
                employeeCode: record.employee_id,
                employeeName: record.employee_name,
                date: record.attendance_date,
                attendanceType: record.attendance_type,
                checkIn: record.check_in,
                checkOut: record.check_out,
                workingHours: record.active_hours
            }
        });
    } catch (error) {
        console.error('Failed to fetch employee attendance:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance.',
            error: error.message
        });
    }
});

export default router;
USE dentassure;

-- ==========================================
-- RECRUITMENT: MANPOWER REQUESTS AND JOBS
-- ==========================================
CREATE TABLE IF NOT EXISTS recruitment_roles (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    department VARCHAR(150) NOT NULL,
    openings INT NOT NULL DEFAULT 1,
    employment_type VARCHAR(50) DEFAULT 'Full-time',
    location VARCHAR(150),
    priority VARCHAR(50) DEFAULT 'Normal',
    reason TEXT,
    description TEXT,
    skills TEXT,
    qualification VARCHAR(255),
    deadline DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================
-- CANDIDATE APPLICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    qualification VARCHAR(255),
    experience VARCHAR(100),
    skills TEXT,
    linkedin VARCHAR(500),
    cover_letter TEXT,
    resume_name VARCHAR(255),
    job_id VARCHAR(64),
    job_title VARCHAR(180) NOT NULL,
    department VARCHAR(150),
    stage VARCHAR(50) NOT NULL DEFAULT 'Applied',
    interview_type VARCHAR(100) DEFAULT 'Not scheduled',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_candidate_email (email),
    INDEX idx_candidate_stage (stage),
    INDEX idx_candidate_job (job_id)
);

-- ==========================================
-- OPTIONAL INITIAL JOB
-- ==========================================
INSERT IGNORE INTO recruitment_roles (
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
    status
) VALUES (
    'DA-ROLE-001',
    'Database Intern',
    'Technology',
    1,
    'Internship',
    'Hyderabad',
    'Normal',
    'Database team requirement',
    'Assist with SQL queries, database maintenance and reporting.',
    'SQL, MySQL, Database Management',
    'B.Tech or relevant qualification',
    'Published'
);node server.js
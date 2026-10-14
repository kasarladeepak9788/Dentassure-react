import React, { useCallback, useEffect, useState } from 'react';
import './CandidatePortal.css';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

const TOKEN_KEY = 'dentassure_candidate_portal_token';

const STAGE_LABELS = {
  Applied: 'Application submitted',
  Screening: 'Under review',
  Shortlisted: 'Shortlisted',
  'Interview Scheduled': 'Interview scheduled',
  'Interview Completed': 'Interview completed',
  Interviewed: 'Interview completed',
  Selected: 'Selected',
  Consent: 'Consent pending',
  Documents: 'Documents verification',
  Onboarding: 'Joining / onboarding',
  Employee: 'Active employee',
  'On Hold': 'Application on hold',
  Rejected: 'Application not selected'
};

export default function CandidatePortal() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || ''
  );

  const [application, setApplication] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // ==========================================
  // LOAD CANDIDATE APPLICATION STATUS
  // ==========================================

  const loadProgress = useCallback(async (authToken = token) => {
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/recruitment/candidate/application`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
        setApplication(null);

        throw new Error(
          result.message || 'Your session expired. Please sign in again.'
        );
      }

      if (!response.ok || !result.success || !result.application) {
        throw new Error(
          result.message || 'Unable to load your application status.'
        );
      }

      setApplication(result.application);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the DentAssure server.'
      );
    }
  }, [token]);

  // ==========================================
  // LOAD STATUS AFTER LOGIN
  // ==========================================

  useEffect(() => {
    if (token) {
      loadProgress(token);
    }
  }, [token, loadProgress]);

  // ==========================================
  // AUTOMATIC REFRESH EVERY 30 SECONDS
  // ==========================================

  useEffect(() => {
    if (!token) return undefined;

    const timer = setInterval(() => {
      loadProgress(token);
    }, 30000);

    return () => clearInterval(timer);
  }, [token, loadProgress]);

  // ==========================================
  // CANDIDATE LOGIN
  // POST /api/recruitment/candidate/login
  // ==========================================

  const signIn = async (event) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const username = credentials.username.trim();
      const password = credentials.password;

      if (!username || !password) {
        throw new Error('Enter your username and password.');
      }

      const response = await fetch(
        `${API_BASE}/api/recruitment/candidate/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success || !result.token) {
        throw new Error(
          result.message || 'Invalid username or password.'
        );
      }

      // Save the authenticated session.
      sessionStorage.setItem(TOKEN_KEY, result.token);

      setApplication(null);
      setToken(result.token);

      setCredentials({
        username: '',
        password: ''
      });

      // Load the candidate's application immediately.
      await loadProgress(result.token);
    } catch (err) {
      setError(
        err.message || 'Unable to sign in. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);

    setToken('');
    setApplication(null);
    setError('');
    setLastUpdated(null);

    setCredentials({
      username: '',
      password: ''
    });
  };

  // ==========================================
  // LOGIN SCREEN
  // ==========================================

  if (!token || !application) {
    return (
      <main className="candidate-portal-shell">
        <section className="candidate-login-card">
          <div className="candidate-brand-mark">DA</div>

          <p className="candidate-eyebrow">
            DENTASSURE STAFF 360
          </p>

          <h1>Candidate Portal</h1>

          <p className="candidate-muted">
            Sign in with the temporary username and password
            provided by DentAssure HR to track your application
            progress.
          </p>

          <form
            onSubmit={signIn}
            className="candidate-login-form"
          >
            <label>
              Temporary username

              <input
                type="text"
                name="username"
                autoComplete="username"
                value={credentials.username}
                onChange={(event) => {
                  setCredentials((previous) => ({
                    ...previous,
                    username: event.target.value
                  }));
                }}
                placeholder="Enter your username"
                required
                disabled={busy}
              />
            </label>

            <label>
              Password

              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) => {
                  setCredentials((previous) => ({
                    ...previous,
                    password: event.target.value
                  }));
                }}
                placeholder="Enter your password"
                required
                disabled={busy}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="candidate-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="candidate-primary"
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in to Staff 360'}
            </button>
          </form>

          <p className="candidate-footnote">
            This portal is for candidates who have submitted an
            application. If your credentials do not work, contact
            DentAssure HR.
          </p>
        </section>
      </main>
    );
  }

  // ==========================================
  // APPLICATION DASHBOARD
  // ==========================================

  const currentStage = application.stage || 'Applied';

  const isClosed = [
    'Rejected',
    'On Hold'
  ].includes(currentStage);

  return (
    <main className="candidate-portal-shell">
      <section className="candidate-dashboard">

        {/* Dashboard header */}

        <header className="candidate-dashboard-head">
          <div>
            <p className="candidate-eyebrow">
              DENTASSURE STAFF 360
            </p>

            <h1>Application Progress</h1>

            <p className="candidate-muted">
              Welcome, {application.name || 'Candidate'}
            </p>
          </div>

          <button
            type="button"
            className="candidate-outline"
            onClick={signOut}
          >
            Sign out
          </button>
        </header>

        {/* Application summary */}

        <div className="candidate-summary-grid">
          <article>
            <span>Application number</span>
            <strong>
              {application.application_id ?? '—'}
            </strong>
          </article>

          <article>
            <span>Applied role</span>
            <strong>
              {application.job_title || '—'}
            </strong>
          </article>

          <article>
            <span>Current status</span>

            <strong
              className={`candidate-status ${
                isClosed ? 'status-closed' : ''
              }`}
            >
              {STAGE_LABELS[currentStage] || currentStage}
            </strong>
          </article>
        </div>

        {/* Recruitment progress */}

        <section className="candidate-progress-card">
          <div className="candidate-section-title">
            <div>
              <h2>Your recruitment journey</h2>

              <p className="candidate-muted">
                Your progress updates automatically when HR updates
                your application.
              </p>
            </div>

            <button
              type="button"
              className="candidate-outline"
              onClick={() => loadProgress(token)}
            >
              Refresh
            </button>
          </div>

          {isClosed ? (
            <div className="candidate-notice">
              <strong>
                {currentStage === 'Rejected'
                  ? 'Recruitment update'
                  : 'Application on hold'}
              </strong>

              <p>
                {currentStage === 'Rejected'
                  ? 'Your application process has been closed. Please contact HR if you need clarification.'
                  : 'Your application is currently on hold. Please check again later or contact HR.'}
              </p>
            </div>
          ) : (
            <div className="candidate-timeline">
              {(application.milestones || []).map(
                (item, index) => (
                  <div
                    key={item.key || index}
                    className={`candidate-milestone ${
                      item.completed ? 'is-complete' : ''
                    } ${
                      item.key === currentStage ? 'is-current' : ''
                    }`}
                  >
                    <span className="candidate-milestone-dot">
                      {item.completed ? '✓' : index + 1}
                    </span>

                    <div>
                      <strong>{item.label}</strong>

                      <small>
                        {item.completed
                          ? 'Completed'
                          : item.key === currentStage
                            ? 'Current stage'
                            : 'Pending'}
                      </small>
                    </div>
                  </div>
                )
              )}

              {(!application.milestones ||
                application.milestones.length === 0) && (
                <div className="candidate-milestone is-complete">
                  <span className="candidate-milestone-dot">
                    ✓
                  </span>

                  <div>
                    <strong>Application submitted</strong>
                    <small>Your application has been received.</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Application details */}

          <div className="candidate-detail-grid">
            <div>
              <span>Department</span>
              <strong>
                {application.department || '—'}
              </strong>
            </div>

            <div>
              <span>Application submitted</span>
              <strong>
                {application.applied_at
                  ? new Date(
                      application.applied_at
                    ).toLocaleDateString()
                  : '—'}
              </strong>
            </div>

            <div>
              <span>Joining date</span>
              <strong>
                {application.joining_date
                  ? String(application.joining_date).slice(0, 10)
                  : 'Not scheduled'}
              </strong>
            </div>

            <div>
              <span>Employment status</span>
              <strong>
                {application.employment_status ||
                  (application.is_temporary
                    ? 'Temporary candidate account'
                    : 'Applicant')}
              </strong>
            </div>

            {application.employee_id && (
              <div>
                <span>Employee ID</span>
                <strong>{application.employee_id}</strong>
              </div>
            )}
          </div>

          {error && (
            <p
              className="candidate-error"
              role="status"
            >
              {error}
            </p>
          )}

          <p className="candidate-updated">
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString()}`
              : 'Loading latest progress…'}
            {' '}· Refreshes every 30 seconds
          </p>
        </section>

        <p className="candidate-footnote">
          For questions about your application, contact DentAssure
          HR. Do not share your password with anyone.
        </p>
      </section>
    </main>
  );
}
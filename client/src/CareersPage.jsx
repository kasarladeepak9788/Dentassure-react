import React, { useEffect, useMemo, useState } from "react";
import "./recruitment.css";

const dentassureLogo = "/dentassure-logo.png";
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function mapJob(job) {
  const skills = Array.isArray(job.skills)
    ? job.skills
    : String(job.skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

  return {
    ...job,
    type: job.employment_type || job.type || "Full-time",
    skills,
  };
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`btn btn-${variant} animated-button`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export default function CareersPage() {
  const [page, setPage] = useState("Careers");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All departments");

  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const [showTracking, setShowTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    applicationId: "",
  });
  const [trackedCandidate, setTrackedCandidate] = useState(null);
  const [trackingError, setTrackingError] = useState("");

  const [store, setStore] = useState({
    roles: [],
    candidates: [],
  });

  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    qualification: "",
    experience: "",
    skills: "",
    linkedin: "",
    coverLetter: "",
    resumeName: "",
  });

  // =====================================================
  // LOAD PUBLISHED JOBS
  // =====================================================

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setJobsLoading(true);
      setJobsError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/recruitment/jobs`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load job openings."
          );
        }

        if (active) {
          setStore((current) => ({
            ...current,
            roles: (result.jobs || []).map(mapJob),
          }));
        }
      } catch (error) {
        if (active) {
          setJobsError(
            `${getErrorMessage(
              error,
              "Could not load job openings."
            )} Check that the DentAssure API is running.`
          );
        }
      } finally {
        if (active) {
          setJobsLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  const jobs = store.roles;

  const departments = [
    "All departments",
    ...new Set(
      jobs.map((job) => job.department).filter(Boolean)
    ),
  ];

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const text = `
          ${job.title || ""}
          ${job.department || ""}
          ${job.description || ""}
          ${(job.skills || []).join(" ")}
        `.toLowerCase();

        return (
          text.includes(query.toLowerCase()) &&
          (department === "All departments" ||
            job.department === department)
        );
      }),
    [jobs, query, department]
  );

  // =====================================================
  // NAVIGATION
  // =====================================================

  const goTo = (name) => {
    setPage(name);
    setShowApplication(false);
    setShowTracking(false);
    setSubmitted(false);
    setTrackingError("");

    if (name === "Careers") {
      setTimeout(() => {
        document
          .getElementById("careers-top")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 40);
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const scrollToSection = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  // =====================================================
  // OPEN APPLICATION FORM
  // =====================================================

  const applyTo = (job) => {
    setSelectedJob(job);
    setShowApplication(true);
    setShowTracking(false);
    setSubmitted(false);

    setGeneratedCredentials(null);
    setCredentialsCopied(false);
    setTrackingError("");

    setForm({
      fullName: "",
      email: "",
      phone: "",
      qualification: "",
      experience: "",
      skills: "",
      linkedin: "",
      coverLetter: "",
      resumeName: "",
    });

    setTimeout(() => {
      document
        .getElementById("application-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  };

  // =====================================================
  // OPEN APPLICATION TRACKING
  // =====================================================

  const openTracking = () => {
    setShowApplication(false);
    setSubmitted(false);
    setTrackingError("");
    setTrackedCandidate(null);
    setTrackingForm({
      applicationId: "",
    });

    setShowTracking(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // TRACK APPLICATION
  // =====================================================

  const trackApplication = async (event) => {
    event.preventDefault();

    setTrackingError("");
    setTrackedCandidate(null);

    const applicationId =
      trackingForm.applicationId.trim();

    if (!applicationId) {
      setTrackingError(
        "Enter your application reference."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/recruitment/applications/${encodeURIComponent(
          applicationId
        )}/status`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not find that application."
        );
      }

      setTrackedCandidate(result.application);
    } catch (error) {
      setTrackingError(
        getErrorMessage(
          error,
          "Unable to retrieve application status."
        )
      );
    }
  };

  // =====================================================
  // UPDATE FORM FIELDS
  // =====================================================

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // SUBMIT APPLICATION AND RECEIVE CREDENTIALS
  // =====================================================

  const submitApplication = async (event) => {
    event.preventDefault();

    if (applicationSubmitting) {
      return;
    }

    setTrackingError("");
    setGeneratedCredentials(null);
    setCredentialsCopied(false);

    if (!selectedJob) {
      setTrackingError(
        "Please select a published job before applying."
      );
      return;
    }

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      setTrackingError(
        "Please enter your name, email address, and phone number."
      );
      return;
    }

    setApplicationSubmitting(true);

    const applicationId = `DA-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const application = {
      id: applicationId,
      name: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      qualification: form.qualification,
      experience: form.experience,
      skills: form.skills,
      linkedin: form.linkedin,
      cover_letter: form.coverLetter,
      resume_name: form.resumeName,
      job_id: selectedJob.id,
      job_title: selectedJob.title,
      department: selectedJob.department || "General",
    };

    try {
      const response = await fetch(
        `${API_BASE}/api/recruitment/applications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(application),
        }
      );

      // Read JSON safely and keep a diagnostic copy for troubleshooting.
      const responseText = await response.text();
      let result;

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error("Recruitment API returned non-JSON content:", responseText);
        throw new Error(
          "The recruitment API returned an invalid response. Check that the correct Node.js server is running."
        );
      }

      console.log("POST /api/recruitment/applications response:", result);

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
            `Application submission failed (HTTP ${response.status}).`
        );
      }

      // Support standard, wrapped, and common legacy API response shapes.
      const data =
        result.data && typeof result.data === "object"
          ? result.data
          : result;

      const candidate =
        data.candidate && typeof data.candidate === "object"
          ? data.candidate
          : result.candidate && typeof result.candidate === "object"
            ? result.candidate
            : {};

      const credentials =
        data.credentials && typeof data.credentials === "object"
          ? data.credentials
          : result.credentials && typeof result.credentials === "object"
            ? result.credentials
            : {};

      const returnedUsername =
        data.username ||
        data.candidate_username ||
        data.candidateUsername ||
        candidate.username ||
        candidate.candidate_username ||
        credentials.username ||
        result.username ||
        result.candidate_username ||
        "";

      const returnedPassword =
        data.temporary_password ||
        data.temporaryPassword ||
        data.password ||
        candidate.temporary_password ||
        candidate.temporaryPassword ||
        candidate.password ||
        credentials.temporary_password ||
        credentials.temporaryPassword ||
        credentials.password ||
        result.temporary_password ||
        result.temporaryPassword ||
        result.password ||
        "";

      const returnedApplicationId =
        data.application_id ||
        data.applicationId ||
        data.id ||
        result.application_id ||
        result.applicationId ||
        result.id ||
        applicationId;

      // Never invent credentials in the browser: they must match the account
      // created and stored by the backend.
      if (!returnedUsername || !returnedPassword) {
        console.error(
          "The application endpoint succeeded but omitted credentials. " +
            "Expected username and temporary_password in the JSON response.",
          result
        );

        throw new Error(
          "Your application was saved, but the running API did not return login credentials. " +
            "Update/restart server.js so POST /api/recruitment/applications creates the candidate account " +
            "and returns { success: true, application_id, username, temporary_password, stage: 'Applied' }. " +
            "Open the browser console to inspect the API response."
        );
      }

      // Store the returned credentials in React state.
      setGeneratedCredentials({
        applicationId: returnedApplicationId,
        username: returnedUsername,
        password: returnedPassword,
        stage: data.stage || "Applied",
      });

      setSubmitted(true);

      // Clear form fields after successful submission.
      setForm({
        fullName: "",
        email: "",
        phone: "",
        qualification: "",
        experience: "",
        skills: "",
        linkedin: "",
        coverLetter: "",
        resumeName: "",
      });

    } catch (error) {
      setTrackingError(
        getErrorMessage(
          error,
          "Unable to submit your application."
        )
      );
    } finally {
      setApplicationSubmitting(false);
    }
  };

  // =====================================================
  // COPY CANDIDATE CREDENTIALS
  // =====================================================

  const copyCredentials = async () => {
    if (!generatedCredentials) {
      return;
    }

    const text = [
      "DentAssure Staff 360 Candidate Portal",
      `Application reference: ${generatedCredentials.applicationId}`,
      `Username: ${generatedCredentials.username}`,
      `Temporary password: ${generatedCredentials.password}`,
      `Application status: ${generatedCredentials.stage}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCredentialsCopied(true);
    } catch {
      setTrackingError(
        "Your browser could not copy the credentials. Please copy the username and password manually."
      );
    }
  };

  const navItems = [
    "Home",
    "About",
    "Company Profile",
    "Our Culture",
    "Careers",
    "Contact",
  ];

  // =====================================================
  // APPLICATION TRACKING PAGE
  // =====================================================

  if (showTracking) {
    return (
      <div className="da-site tracking-page-shell">
        <div className="tracking-topbar">
          <button
            className="tracking-brand"
            type="button"
            onClick={() => {
              setShowTracking(false);
              setTrackedCandidate(null);
              setPage("Careers");
            }}
          >
            <img
              src={dentassureLogo}
              alt="DentAssure Health Plans"
            />
          </button>

          <span className="tracking-topbar-label">
            CANDIDATE PORTAL
          </span>

          <button
            className="screen-back-button"
            type="button"
            onClick={() => {
              setShowTracking(false);
              setTrackedCandidate(null);
              setTrackingError("");
              setPage("Careers");

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            ← Back to Careers
          </button>
        </div>

        <main
          className="tracking-screen tracking-screen-standalone"
          id="candidate-tracking-screen"
          aria-labelledby="tracking-screen-title"
        >
          <div
            className="tracking-decoration tracking-decoration-one"
            aria-hidden="true"
          />

          <div
            className="tracking-decoration tracking-decoration-two"
            aria-hidden="true"
          />

          <section className="application-screen-card tracking-card">
            <div
              className="tracking-card-icon"
              aria-hidden="true"
            >
              ♡
            </div>

            <div className="application-heading">
              <div className="eyebrow">
                <span />
                DENTASSURE CAREERS
              </div>

              <h1 id="tracking-screen-title">
                Track your application
              </h1>

              <p>
                Enter the application reference you received
                after submitting your application to view your
                recruitment progress.
              </p>
            </div>

            {!trackedCandidate ? (
              <form
                className="application-form tracking-form"
                onSubmit={trackApplication}
              >
                <label>
                  Application reference

                  <input
                    required
                    value={trackingForm.applicationId}
                    onChange={(event) =>
                      setTrackingForm({
                        applicationId: event.target.value,
                      })
                    }
                    placeholder="e.g. DA-1720000000000-ABCDE"
                    autoComplete="off"
                  />
                </label>

                {trackingError && (
                  <p className="tracking-error" role="alert">
                    {trackingError}
                  </p>
                )}

                <div className="form-actions">
                  <Button type="submit">
                    Track application <span>↗</span>
                  </Button>
                </div>

                <p className="tracking-help">
                  Your reference is shown on the confirmation
                  screen after a successful application.
                </p>
              </form>
            ) : (
              <div className="candidate-status-card">
                <div className="candidate-status-top">
                  <span>APPLICATION STATUS</span>
                  <strong>
                    {trackedCandidate.stage || "Applied"}
                  </strong>
                </div>

                <h3>
                  {trackedCandidate.job_title || "Application"}
                </h3>

                <p>
                  <b>Candidate:</b>{" "}
                  {trackedCandidate.name || "Candidate"}
                </p>

                <p>
                  <b>Application reference:</b>{" "}
                  {trackedCandidate.id ||
                    trackingForm.applicationId}
                </p>

                <p>
                  <b>Submitted:</b>{" "}
                  {trackedCandidate.applied_at
                    ? new Date(
                        trackedCandidate.applied_at
                      ).toLocaleString()
                    : "Not available"}
                </p>

                <div className="status-timeline">
                  <div className="status-step complete">
                    <span>✓</span>
                    <div>
                      <strong>Application submitted</strong>
                      <small>
                        Your application has been received.
                      </small>
                    </div>
                  </div>

                  <div
                    className={`status-step ${
                      [
                        "Screening",
                        "Shortlisted",
                        "Interview Scheduled",
                        "Interview Completed",
                        "Interviewed",
                        "Selected",
                        "Rejected",
                        "Onboarding",
                        "Employee",
                      ].includes(trackedCandidate.stage)
                        ? "complete"
                        : ""
                    }`}
                  >
                    <span>2</span>
                    <div>
                      <strong>Recruitment review</strong>
                      <small>
                        The recruitment team will review your
                        details.
                      </small>
                    </div>
                  </div>

                  <div
                    className={`status-step ${
                      [
                        "Shortlisted",
                        "Interview Scheduled",
                        "Interview Completed",
                        "Interviewed",
                        "Selected",
                        "Onboarding",
                        "Employee",
                      ].includes(trackedCandidate.stage)
                        ? "complete"
                        : ""
                    }`}
                  >
                    <span>3</span>
                    <div>
                      <strong>Next steps</strong>
                      <small>
                        New updates will appear here when the
                        recruitment team updates your stage.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTrackedCandidate(null);
                      setTrackingForm({
                        applicationId: "",
                      });
                      setTrackingError("");
                    }}
                  >
                    Track another application
                  </Button>

                  <Button
                    onClick={() => {
                      setShowTracking(false);
                      setTrackedCandidate(null);
                      setPage("Careers");

                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    Back to Careers
                  </Button>
                </div>
              </div>
            )}

            <p className="tracking-privacy">
              Your application information is used for
              recruitment updates.
            </p>
          </section>
        </main>

        <footer className="tracking-footer">
          © {new Date().getFullYear()} DentAssure Health Plans
          Pvt. Ltd. · Candidate Application Tracking
        </footer>
      </div>
    );
  }

  // =====================================================
  // APPLICATION FORM AND SUCCESS SCREEN
  // =====================================================

  if (showApplication) {
    return (
      <div className="da-site application-page-shell">
        <style>{`
          .application-page-shell {
            min-height: 100vh;
            padding: 24px clamp(16px, 5vw, 72px) 56px;
            background: #f7f9fc;
          }

          .application-screen-top-standalone {
            max-width: 1100px;
            margin: 0 auto 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }

          .application-screen-standalone {
            position: relative !important;
            inset: auto !important;
            width: 100%;
            min-height: calc(100vh - 120px);
            overflow: visible !important;
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
          }

          .application-screen-standalone .application-screen-card {
            margin: 0 auto;
          }

          .credentials-success {
            width: 100%;
          }

          .credential-box {
            display: grid;
            gap: 0;
            margin: 24px 0;
            border: 1px solid #dbe6e0;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
          }

          .credential-box > div {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            padding: 16px;
            border-bottom: 1px solid #e8eeeb;
          }

          .credential-box > div:last-child {
            border-bottom: 0;
          }

          .credential-box span {
            color: #5d6b65;
            font-size: 14px;
          }

          .credential-box strong {
            color: #123d2c;
            text-align: right;
            overflow-wrap: anywhere;
            word-break: break-word;
            user-select: text;
          }

          .credential-warning {
            padding: 14px 16px;
            border-radius: 9px;
            background: #fff8dc;
            color: #725500;
            line-height: 1.6;
          }

          .credentials-copy-button {
            margin-top: 12px;
          }

          .application-error-message {
            padding: 12px 16px;
            margin: 16px 0;
            color: #9f2424;
            background: #fff0f0;
            border: 1px solid #f0caca;
            border-radius: 8px;
            line-height: 1.5;
          }

          .application-page-shell button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }

          @media (max-width: 600px) {
            .credential-box > div {
              flex-direction: column;
              gap: 6px;
            }

            .credential-box strong {
              text-align: left;
            }

            .application-screen-top-standalone {
              flex-wrap: wrap;
            }
          }
        `}</style>

        <div className="application-screen-top application-screen-top-standalone">
          <button
            className="screen-back-button"
            type="button"
            onClick={() => {
              setShowApplication(false);
              setSelectedJob(null);
              setSubmitted(false);
              setGeneratedCredentials(null);
              setTrackingError("");
            }}
          >
            ← Back to Careers
          </button>

          <img
            src={dentassureLogo}
            alt="DentAssure Health Plans"
            className="application-screen-logo"
          />
        </div>

        <section
          className="application-screen application-screen-standalone"
          id="application-form"
          role="dialog"
          aria-modal="true"
          aria-labelledby="application-screen-title"
        >
          <div className="application-screen-card">
            <div className="application-heading">
              <div className="eyebrow">
                <span />
                DENTASSURE CAREERS
              </div>

              <h2 id="application-screen-title">
                {submitted
                  ? "Application submitted!"
                  : selectedJob
                    ? `Apply for ${selectedJob.title}`
                    : "Candidate application"}
              </h2>

              <p>
                {submitted
                  ? "Your application has been saved. Save your candidate login credentials below."
                  : `Complete the form below to apply${
                      selectedJob
                        ? ` for ${selectedJob.title}`
                        : ""
                    }.`}
              </p>
            </div>

            {trackingError && (
              <p
                className="application-error-message"
                role="alert"
              >
                {trackingError}
              </p>
            )}

            {submitted && generatedCredentials ? (
              <div className="success-card credentials-success">
                <div className="success-icon">✓</div>

                <h3>
                  Thank you, your application is received.
                </h3>

                <p>
                  Your Staff 360 candidate account has been
                  created. Save these credentials to sign in
                  and follow your application progress.
                </p>

                <div className="credential-box">
                  <div>
                    <span>Application reference</span>
                    <strong>
                      {generatedCredentials.applicationId}
                    </strong>
                  </div>

                  <div>
                    <span>Temporary Staff 360 username</span>
                    <strong>
                      {generatedCredentials.username}
                    </strong>
                  </div>

                  <div>
                    <span>Temporary password</span>
                    <strong>
                      {generatedCredentials.password}
                    </strong>
                  </div>

                  <div>
                    <span>Application status</span>
                    <strong>
                      {generatedCredentials.stage || "Applied"}
                    </strong>
                  </div>
                </div>

                <p className="credential-warning">
                  Important: save your username and temporary
                  password now. The password is returned by
                  the backend only when the account is created.
                  Do not share it with anyone.
                </p>

                <div className="form-actions">
                  <Button
                    onClick={copyCredentials}
                    variant="outline"
                  >
                    {credentialsCopied
                      ? "Credentials copied ✓"
                      : "Copy login credentials"}
                  </Button>

                  <Button
                    onClick={() => {
                      window.location.href = "/candidate-portal";
                    }}
                  >
                    Sign in to Staff 360 ↗
                  </Button>
                </div>

                <div className="form-actions">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApplication(false);
                      setSelectedJob(null);
                      setSubmitted(false);
                      setGeneratedCredentials(null);
                      setTrackingError("");
                    }}
                  >
                    Back to Careers
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitApplication}
                className="application-form"
              >
                <div className="selected-job-summary">
                  <span>Applying for</span>

                  <strong>
                    {selectedJob?.title ||
                      "General Application"}
                  </strong>

                  <small>
                    {selectedJob?.department ||
                      "DentAssure Careers"}{" "}
                    ·{" "}
                    {selectedJob?.location ||
                      "Location as listed"}
                  </small>
                </div>

                <div className="form-grid">
                  <label>
                    Full name *

                    <input
                      name="fullName"
                      required
                      value={form.fullName}
                      onChange={updateForm}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </label>

                  <label>
                    Email address *

                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={updateForm}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <label>
                    Phone number *

                    <input
                      name="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={updateForm}
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                    />
                  </label>

                  <label>
                    Highest qualification

                    <select
                      name="qualification"
                      value={form.qualification}
                      onChange={updateForm}
                    >
                      <option value="">
                        Select qualification
                      </option>
                      <option>High School</option>
                      <option>Diploma</option>
                      <option>Bachelor's Degree</option>
                      <option>Master's Degree</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <label>
                    Experience

                    <select
                      name="experience"
                      value={form.experience}
                      onChange={updateForm}
                    >
                      <option value="">
                        Select experience
                      </option>
                      <option>Fresher</option>
                      <option>Less than 1 year</option>
                      <option>1–3 years</option>
                      <option>3+ years</option>
                    </select>
                  </label>

                  <label>
                    LinkedIn profile

                    <input
                      name="linkedin"
                      value={form.linkedin}
                      onChange={updateForm}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </label>

                  <label className="full-field">
                    Skills

                    <input
                      name="skills"
                      value={form.skills}
                      onChange={updateForm}
                      placeholder="e.g. React, SQL, communication"
                    />
                  </label>

                  <label className="full-field">
                    Why would you like to join us?

                    <textarea
                      name="coverLetter"
                      rows="4"
                      value={form.coverLetter}
                      onChange={updateForm}
                      placeholder="Tell us a little about yourself..."
                    />
                  </label>

                  <label className="full-field file-input">
                    Resume (optional)

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          resumeName:
                            event.target.files?.[0]?.name || "",
                        }))
                      }
                    />

                    <small>
                      {form.resumeName
                        ? `Selected: ${form.resumeName} — this form currently records the filename only.`
                        : "PDF or Word document. This form currently records the filename only."}
                    </small>
                  </label>
                </div>

                <label className="consent">
                  <input type="checkbox" required />

                  I confirm the information provided is accurate
                  and consent to its use for recruitment review.
                </label>

                <div className="form-actions">
                  <Button
                    variant="outline"
                    disabled={applicationSubmitting}
                    onClick={() => {
                      setShowApplication(false);
                      setSelectedJob(null);
                      setTrackingError("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={applicationSubmitting}
                  >
                    {applicationSubmitting
                      ? "Submitting..."
                      : "Submit application"}{" "}
                    <span>↗</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    );
  }

  // =====================================================
  // MAIN CAREERS WEBSITE
  // =====================================================

  return (
    <div className="da-site careers-reference-site">
      <div className="announcement">
        <span className="announcement-dot" />

        Care that connects. Technology that empowers.

        <button
          className="announcement-link"
          onClick={() =>
            scrollToSection("job-opportunities")
          }
        >
          Explore job opportunities ↗
        </button>
      </div>

      <header className="site-header">
        <button
          className="brand"
          onClick={() => goTo("Home")}
          aria-label="DentAssure home"
        >
          <img
            className="dentassure-careers-logo"
            src={dentassureLogo}
            alt="DentAssure Health Plans"
          />
        </button>

        <nav
          className="main-nav"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <button
              key={item}
              className={
                page === item
                  ? "nav-link active"
                  : "nav-link"
              }
              aria-current={
                page === item ? "page" : undefined
              }
              onClick={() =>
                item === "Careers"
                  ? goTo("Careers")
                  : goTo(item)
              }
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="track-application-link"
            onClick={openTracking}
          >
            Track Application
          </button>

          <Button
            onClick={() =>
              scrollToSection("job-opportunities")
            }
          >
            Job Opportunities <span>↗</span>
          </Button>
        </div>
      </header>

      <main>
        {page !== "Careers" && (
          <section className="simple-page-hero">
            <div className="eyebrow">
              <span />
              DENTASSURE HEALTH PLANS PVT. LTD.
            </div>

            <h1>
              {page === "Home" ? (
                <>
                  Better care starts with
                  <br />
                  <span>better connections.</span>
                </>
              ) : page === "About" ? (
                <>
                  Care with purpose.
                  <br />
                  <span>Progress with people.</span>
                </>
              ) : page === "Company Profile" ? (
                <>
                  A connected approach
                  <br />
                  <span>to dental healthcare.</span>
                </>
              ) : page === "Our Culture" ? (
                <>
                  People. Purpose.
                  <br />
                  <span>Room to grow.</span>
                </>
              ) : (
                <>
                  Let’s start a
                  <br />
                  <span>conversation.</span>
                </>
              )}
            </h1>

            <p>
              {page === "Home"
                ? "Thoughtful services, smart digital tools, and people who care—working toward a more connected dental healthcare experience."
                : page === "About"
                  ? "Our mission is to support a more accessible, convenient dental healthcare experience through organized solutions and technology-enabled processes."
                  : page === "Company Profile"
                    ? "Dental healthcare solutions, digital innovation, operational support, and professional collaboration."
                    : page === "Our Culture"
                      ? "A supportive workplace that makes space for curiosity, teamwork, ownership, and professional development."
                      : "Contact our team for company information, career opportunities, or potential collaboration."}
            </p>

            <div className="hero-actions">
              <Button onClick={() => goTo("Careers")}>
                Explore Careers ↗
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  scrollToSection("site-footer")
                }
              >
                Learn more
              </Button>
            </div>
          </section>
        )}

        {page === "Careers" && (
          <section
            className="careers-page"
            id="careers-top"
          >
            <section className="hcl-inspired-hero">
              <div className="career-hero-background-shape shape-a" />
              <div className="career-hero-background-shape shape-b" />
              <div className="career-hero-background-shape shape-c" />

              <div className="career-hero-content">
                <div className="career-brand-badge">
                  <img
                    className="career-logo-image"
                    src={dentassureLogo}
                    alt="DentAssure Health Plans"
                  />

                  <span className="career-badge-label">
                    CAREERS
                  </span>
                </div>

                <p className="hero-kicker">
                  CAREERS AT DENTASSURE
                </p>

                <h1>
                  Build your career
                  <br />
                  with <span>purpose.</span>
                </h1>

                <p className="career-hero-lead">
                  Discover opportunities to learn, contribute,
                  and grow while helping shape better healthcare
                  experiences.
                </p>

                <Button
                  variant="hero-light"
                  onClick={() =>
                    scrollToSection("job-opportunities")
                  }
                >
                  Explore Job Opportunities <span>↘</span>
                </Button>
              </div>

              <div
                className="career-hero-visual"
                aria-hidden="true"
              >
                <div className="visual-ring ring-one" />
                <div className="visual-ring ring-two" />
                <div className="visual-cross">✚</div>

                <div className="visual-card">
                  <span className="visual-card-tag">
                    YOUR NEXT CHAPTER
                  </span>

                  <div className="visual-spark">✳</div>

                  <strong>
                    Grow your
                    <br />
                    impact.
                  </strong>

                  <small>
                    People · Purpose · Progress
                  </small>
                </div>

                <div className="visual-bubble bubble-top">
                  Curiosity welcome ✦
                </div>

                <div className="visual-bubble bubble-bottom">
                  Make good things happen ↗
                </div>
              </div>

              <div className="hero-pagination">
                <span className="pagination-active">
                  Careers at DentAssure
                </span>

                <button
                  onClick={() =>
                    scrollToSection("why-join-us")
                  }
                >
                  Why Join Us
                </button>

                <button
                  onClick={() =>
                    scrollToSection("job-opportunities")
                  }
                >
                  Job Opportunities
                </button>

                <button
                  onClick={() =>
                    scrollToSection("hiring-process")
                  }
                >
                  Hiring Process
                </button>
              </div>
            </section>

            <nav
              className="careers-section-nav"
              aria-label="Careers page sections"
            >
              <button
                onClick={() =>
                  scrollToSection("why-join-us")
                }
              >
                Why Join Us
              </button>

              <button
                onClick={() =>
                  scrollToSection("hiring-process")
                }
              >
                Hiring Process
              </button>

              <button
                onClick={() =>
                  scrollToSection("our-culture-careers")
                }
              >
                Our Culture
              </button>

              <button
                onClick={() =>
                  scrollToSection("job-opportunities")
                }
              >
                Job Opportunities
              </button>
            </nav>

            <section
              className="why-join-section"
              id="why-join-us"
            >
              <div className="why-join-copy">
                <div className="eyebrow">
                  <span />
                  LIFE AT DENTASSURE
                </div>

                <h2>
                  Find your spark.
                  <br />
                  <span>Build what’s next.</span>
                </h2>

                <p>
                  Bring your curiosity, skills, and ideas.
                  Discover a place to learn, collaborate, and
                  contribute to work with purpose.
                </p>

                <Button
                  onClick={() =>
                    scrollToSection("job-opportunities")
                  }
                >
                  Explore Open Positions ↗
                </Button>
              </div>

              <div className="why-join-art">
                <div className="why-art-circle">✳</div>

                <div className="why-art-note">
                  Your ideas
                  <br />
                  <b>matter here.</b>
                </div>

                <div className="why-art-dot dot-one" />
                <div className="why-art-dot dot-two" />
              </div>
            </section>

            <section
              className="careers-values"
              id="our-culture-careers"
            >
              <article className="career-value-card value-coral">
                <span>♡</span>
                <small>01 / PURPOSE</small>
                <h3>Work that matters</h3>
                <p>
                  Contribute to projects focused on better
                  healthcare experiences.
                </p>
              </article>

              <article className="career-value-card value-mint">
                <span>✳</span>
                <small>02 / LEARNING</small>
                <h3>Keep growing</h3>
                <p>
                  Build skills, ask questions, and turn learning
                  into progress.
                </p>
              </article>

              <article className="career-value-card value-lilac">
                <span>↗</span>
                <small>03 / TEAMWORK</small>
                <h3>Better together</h3>
                <p>
                  Share ideas, collaborate, and solve problems
                  as a team.
                </p>
              </article>
            </section>

            <section
              className="hiring-process-section"
              id="hiring-process"
            >
              <div className="eyebrow">
                <span />
                YOUR JOURNEY
              </div>

              <h2>
                A clear path to <span>what’s next.</span>
              </h2>

              <div className="process-grid">
                <article>
                  <span>01</span>
                  <h3>Explore</h3>
                  <p>
                    Find a role that matches your interests and
                    skills.
                  </p>
                </article>

                <article>
                  <span>02</span>
                  <h3>Apply</h3>
                  <p>
                    Share your details and tell us about your
                    experience.
                  </p>
                </article>

                <article>
                  <span>03</span>
                  <h3>Connect</h3>
                  <p>
                    The recruitment team can review your profile
                    and connect if there is a match.
                  </p>
                </article>

                <article>
                  <span>04</span>
                  <h3>Grow</h3>
                  <p>
                    Learn about the role, team, and next steps
                    in the process.
                  </p>
                </article>
              </div>
            </section>

            <section
              className="roles-section reference-jobs-section"
              id="job-opportunities"
            >
              <div className="roles-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    FIND YOUR FIT
                  </div>

                  <h2>
                    Job{" "}
                    <span className="gradient-text">
                      opportunities.
                    </span>
                  </h2>

                  <p>
                    Search published vacancies by role, skill,
                    or department.
                  </p>
                </div>

                <span className="role-count">
                  {filteredJobs.length} roles shown
                </span>
              </div>

              <div className="job-filters">
                <label className="search-box">
                  <span>⌕</span>

                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    placeholder="Search jobs, skills, or keywords"
                  />
                </label>

                <select
                  value={department}
                  onChange={(event) =>
                    setDepartment(event.target.value)
                  }
                  aria-label="Filter by department"
                >
                  {departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              {jobsError && (
                <div className="tracking-error" role="alert">
                  {jobsError}
                </div>
              )}

              {jobsLoading && (
                <p className="jobs-loading">
                  Loading published jobs...
                </p>
              )}

              <div className="job-grid">
                {filteredJobs.map((job, index) => (
                  <article
                    className={`job-card job-tone-${index % 4}`}
                    key={job.id || job.title}
                  >
                    <div className="job-card-top">
                      <span className="job-icon">
                        {["⌘", "✳", "↗", "✦"][index % 4]}
                      </span>

                      <span className="job-type">
                        {job.type ||
                          job.employmentType ||
                          "Full-time"}
                      </span>
                    </div>

                    <span className="job-department">
                      {job.department || "General"}
                    </span>

                    <h3>{job.title}</h3>

                    <p>
                      {job.description ||
                        job.summary ||
                        "Help the team create better experiences through thoughtful work and collaboration."}
                    </p>

                    <div className="job-meta">
                      <span>
                        ⌖{" "}
                        {job.location ||
                          "Location to be confirmed"}
                      </span>

                      <span>
                        ◷{" "}
                        {job.level ||
                          "Experience to be confirmed"}
                      </span>
                    </div>

                    <div className="skill-list">
                      {(Array.isArray(job.skills)
                        ? job.skills
                        : String(job.skills || "")
                            .split(",")
                            .map((skill) => skill.trim())
                            .filter(Boolean)
                      )
                        .slice(0, 3)
                        .map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                    </div>

                    <button
                      className="job-apply"
                      onClick={() => applyTo(job)}
                    >
                      View role & apply <span>↗</span>
                    </button>
                  </article>
                ))}
              </div>

              {!jobsLoading &&
                filteredJobs.length === 0 && (
                  <div className="empty-state">
                    <span>✳</span>

                    <h3>No matching roles just yet</h3>

                    <p>
                      Try another keyword or choose a different
                      department.
                    </p>

                    <button
                      className="text-link"
                      onClick={() => {
                        setQuery("");
                        setDepartment("All departments");
                      }}
                    >
                      Clear filters ↻
                    </button>
                  </div>
                )}
            </section>
          </section>
        )}
      </main>

      <footer className="site-footer" id="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <button
              className="brand brand-footer"
              onClick={() => goTo("Home")}
            >
              <img
                className="dentassure-careers-logo footer-logo"
                src={dentassureLogo}
                alt="DentAssure Health Plans"
              />
            </button>

            <p>
              Connecting people, care, and technology to support
              better healthcare experiences.
            </p>
          </div>

          <div className="footer-links">
            <b>Explore</b>

            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => goTo(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="footer-cta">
            <span>HAVE AN IDEA?</span>

            <h3>
              Let’s make
              <br />
              good things happen.
            </h3>

            <button onClick={() => goTo("Contact")}>
              Get in touch ↗
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} DentAssure Health Plans
            Pvt. Ltd. All rights reserved.
          </span>

          <span>
            Built around people. Designed for progress.
          </span>
        </div>
      </footer>
    </div>
  );
}
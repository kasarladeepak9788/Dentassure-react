import React, { useEffect, useMemo, useState } from 'react';
import './recruitment.css';

// Keep this in sync with the API base URL used by CareersPage.jsx.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const STAGES = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Interview Completed', 'Selected', 'Consent', 'Documents',
  'Onboarding', 'Employee', 'On Hold', 'Rejected'
];
const INTERVIEW_STATUSES = ['Scheduled', 'Rescheduled', 'Completed', 'Candidate No-Show', 'Cancelled'];

const emptyInterview = {
  mode: 'Online',
  round: 'HR Interview',
  date: '',
  time: '',
  duration: '30 minutes',
  interviewer: '',
  platform: 'Google Meet',
  meetingLink: '',
  meetingPassword: '',
  venue: '',
  room: '',
  contactPerson: '',
  instructions: '',
  status: 'Scheduled'
};

export default function RecruitmentManagement() {
  const [candidates, setCandidates] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [message, setMessage] = useState('');
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [roleForm, setRoleForm] = useState({ title: '', department: '', openings: 1, type: 'Full-time', location: 'Hyderabad', priority: 'Normal', reason: '', description: '', skills: '', qualification: '', deadline: '' });
  const [candidateQuery, setCandidateQuery] = useState('');
  const [interviewCandidate, setInterviewCandidate] = useState(null);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [editingInterviewId, setEditingInterviewId] = useState(null);
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [previewCandidate, setPreviewCandidate] = useState(null);

  // Load published jobs and applications directly from the backend database (no login needed)
  useEffect(() => {
    let active = true;
    const loadData = async (showErrors = true) => {
      setApplicationsLoading(true);
      try {
        const [appRes, roleRes] = await Promise.all([
          fetch(`${API_BASE}/api/recruitment/applications`),
          fetch(`${API_BASE}/api/recruitment/jobs`)
        ]);

        const appResult = await appRes.json();
        const roleResult = await roleRes.json();

        if (!active) return;

        if (appRes.ok && appResult.success) {
          const rows = Array.isArray(appResult.candidates) ? appResult.candidates : (Array.isArray(appResult.applications) ? appResult.applications : []);
          setCandidates(rows.map(row => ({
            ...row,
            id: String(row.id),
            name: row.name || '',
            email: row.email || '',
            phone: row.phone || '',
            jobTitle: row.job_title || row.jobTitle || '',
            department: row.department || '',
            appliedAt: row.applied_at || row.appliedAt || '',
            stage: row.stage || 'Applied',
            interviews: Array.isArray(row.interviews) ? row.interviews : []
          })));
        }

        if (roleRes.ok && roleResult.success) {
          const fetchedRoles = Array.isArray(roleResult.jobs) ? roleResult.jobs : (Array.isArray(roleResult.roles) ? roleResult.roles : []);
          setRoles(fetchedRoles);
        }
      } catch (error) {
        if (active && showErrors) setMessage(`Could not load database records: ${error.message}. Check that the API is running on ${API_BASE}.`);
      } finally {
        if (active) setApplicationsLoading(false);
      }
    };

    loadData();
    const refreshTimer = window.setInterval(() => loadData(false), 20000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  const updateCandidate = async (id, patch) => {
    try {
      if (patch.stage === 'Selected') {
        const response = await fetch(`${API_BASE}/api/recruitment/applications/${encodeURIComponent(id)}/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not select this candidate.');
        }

        setCandidates(prev => prev.map(c => String(c.id) === String(id) ? { ...c, stage: 'Selected', employmentStatus: 'Offer Pending' } : c));
        setMessage('Candidate marked as Selected.');
        return;
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'joiningDate')) {
        if (patch.joiningDate) {
          const response = await fetch(`${API_BASE}/api/recruitment/applications/${encodeURIComponent(id)}/joining-date`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joining_date: patch.joiningDate })
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not save the joining date.');
          }
          setCandidates(prev => prev.map(c => String(c.id) === String(id) ? { ...c, joiningDate: patch.joiningDate, stage: 'Onboarding', employmentStatus: 'Joining Scheduled' } : c));
          setMessage('Joining date saved.');
          return;
        }
        setCandidates(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...patch } : c));
        return;
      }

      if (patch.stage) {
        const response = await fetch(`${API_BASE}/api/recruitment/applications/${encodeURIComponent(id)}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: patch.stage })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not update candidate stage.');
        }
      }

      setCandidates(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...patch } : c));
      setMessage('Candidate stage updated successfully.');
    } catch (error) {
      setMessage(`Could not update candidate: ${error.message}`);
    }
  };

  const addRole = e => {
    e.preventDefault();
    if (!roleForm.title.trim() || !roleForm.department.trim() || !roleForm.reason.trim()) {
      setMessage('Complete the job title, department and reason for hiring.');
      return;
    }
    setRoles(prev => [{ ...roleForm, id: Date.now(), openings: Number(roleForm.openings), status: 'Pending Approval' }, ...prev]);
    setRoleForm({ title: '', department: '', openings: 1, type: 'Full-time', location: 'Hyderabad', priority: 'Normal', reason: '', description: '', skills: '', qualification: '', deadline: '' });
    setMessage('Role request added locally.');
    setTab('Role Requests');
  };

  const visibleCandidates = useMemo(
    () => candidates.filter(c => `${c.name} ${c.email} ${c.jobTitle} ${c.stage}`.toLowerCase().includes(candidateQuery.toLowerCase())),
    [candidates, candidateQuery]
  );

  const stats = [
    ['Open positions', roles.filter(r => r.status === 'Published').length],
    ['Applications', candidates.length],
    ['Interviews scheduled', candidates.reduce((n, c) => n + (c.interviews || []).filter(i => ['Scheduled', 'Rescheduled'].includes(i.status)).length, 0)],
    ['Selected', candidates.filter(c => ['Selected', 'Consent', 'Documents', 'Onboarding', 'Employee'].includes(c.stage)).length]
  ];

  const openInterviewForm = (candidate, interview = null) => {
    setInterviewCandidate(candidate);
    setEditingInterviewId(interview?.id ?? null);
    setInterviewForm(interview ? { ...emptyInterview, ...interview } : { ...emptyInterview });
    setMessage('');
  };

  const saveInterview = e => {
    e.preventDefault();
    if (!interviewCandidate) return;
    const interview = {
      ...interviewForm,
      id: editingInterviewId || Date.now(),
      createdAt: new Date().toISOString(),
      dateTimeLabel: `${interviewForm.date} ${interviewForm.time}`
    };
    setCandidates(prev => prev.map(c => {
      if (c.id !== interviewCandidate.id) return c;
      const old = Array.isArray(c.interviews) ? c.interviews : [];
      const interviews = editingInterviewId
        ? old.map(i => i.id === editingInterviewId ? { ...i, ...interview, updatedAt: new Date().toISOString() } : i)
        : [interview, ...old];
      return { ...c, interviews, stage: 'Interview Scheduled' };
    }));
    setInterviewCandidate(null);
    setEditingInterviewId(null);
    setInterviewForm(emptyInterview);
    setTab('Interviews');
    setMessage('Interview scheduled successfully.');
  };

  const allInterviews = candidates.flatMap(c => (c.interviews || []).map(i => ({ ...i, candidateId: c.id, candidateName: c.name, candidateEmail: c.email, jobTitle: c.jobTitle })))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return <section className="recruitment-page">
    <style>{`
      .application-number{display:inline-block;color:#9d174d;background:#fce7f3;border:1px solid #f9a8d4;border-radius:8px;padding:6px 8px;font-size:12px;white-space:nowrap}.application-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.application-preview-field{border:1px solid #f1d5e2;border-radius:10px;padding:12px;min-width:0}.application-preview-field span{display:block;color:#9d174d;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:6px}.application-preview-field p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#30253a;font-size:13px}.application-preview-wide{grid-column:1/-1}.application-preview-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid #f1d5e2}.interview-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
      .interview-modal{width:min(850px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.25)}
      .interview-modal-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}
      .interview-modal-head h2{margin:0 0 5px}.interview-modal-head p{margin:0;color:#64748b;font-size:13px}
      .interview-close{border:0;background:#f1f5f9;border-radius:9px;padding:8px 12px;cursor:pointer}
      .interview-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .interview-form-grid label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}
      .interview-form-grid input,.interview-form-grid select,.interview-form-grid textarea{width:100%;min-width:0;border:1px solid #dbe2ea;border-radius:9px;padding:10px 11px;font:inherit;background:#fff;color:#0f172a}
      .interview-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      .interview-list{display:grid;gap:12px}.interview-card{border:1px solid #e2e8f0;border-radius:12px;padding:15px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .interview-empty{padding:24px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px}
    `}</style>

    <header className="recruitment-header">
      <div><span className="recruitment-eyebrow">DENTASSURE STAFF 360</span><h1>Recruitment Management</h1><p>Manage candidates, interviews, and tracking connected straight to MySQL database.</p></div>
      <a className="recruitment-link" href="/careers" target="_blank" rel="noreferrer">Open Careers Page ↗</a>
    </header>

    <div className="recruitment-stats">{stats.map(([label, value], index) => <article className={`recruitment-stat stat-${index+1}`} key={label}><span>{label}</span><strong>{value}</strong><small>Live DB metric</small></article>)}</div>

    <nav className="recruitment-tabs">
      {['Overview', 'Role Requests', 'Job Openings', 'Applications', 'Interviews'].map(item =>
        <button key={item} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setMessage(''); }}>{item}</button>
      )}
    </nav>

    {message && <div className="recruitment-message" role="status">{message}</div>}

    {tab === 'Overview' && <div className="recruitment-grid">
      <article className="recruitment-panel"><h2>Database Connected Portal</h2><p>Recruitment database synchronization is active. No logins required.</p></article>
    </div>}

    {tab === 'Role Requests' && <div className="recruitment-grid">
      <form className="recruitment-panel recruitment-form" onSubmit={addRole}>
        <h2>Request a new role</h2>
        <label>Job title *<input value={roleForm.title} onChange={e => setRoleForm({ ...roleForm, title: e.target.value })} required /></label>
        <label>Department *<input value={roleForm.department} onChange={e => setRoleForm({ ...roleForm, department: e.target.value })} required /></label>
        <label>Reason for hiring *<textarea value={roleForm.reason} onChange={e => setRoleForm({ ...roleForm, reason: e.target.value })} required /></label>
        <button className="recruitment-primary">＋ Submit role request</button>
      </form>
    </div>}

    {tab === 'Job Openings' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><h2>Published careers</h2><span className="recruitment-count-pill">{roles.length} published</span></div>
      <div className="recruitment-table-wrap"><table className="recruitment-table"><thead><tr><th>Job title</th><th>Department</th><th>Type</th><th>Status</th></tr></thead><tbody>
        {roles.map(role => <tr key={role.id}><td><b>{role.title}</b></td><td>{role.department}</td><td>{role.employment_type || role.type}</td><td><span className="recruitment-badge green">Published</span></td></tr>)}
      </tbody></table></div>
    </div>}

    {tab === 'Applications' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><h2>Candidate applications (Live DB)</h2><input placeholder="Search candidates..." value={candidateQuery} onChange={e => setCandidateQuery(e.target.value)} /></div>
      {applicationsLoading && visibleCandidates.length === 0 ? <p className="recruitment-empty">Loading applications from MySQL…</p> : visibleCandidates.length === 0 ? <p className="recruitment-empty">No applications found in database.</p> :
        <div className="recruitment-table-wrap"><table className="recruitment-table"><thead><tr><th>Application No.</th><th>Candidate</th><th>Applied role</th><th>Stage</th><th>Actions</th></tr></thead><tbody>
          {visibleCandidates.map(c => <tr key={c.id}>
            <td><strong className="application-number">{c.id}</strong></td>
            <td><b>{c.name}</b><br/><small>{c.email} · {c.phone}</small></td>
            <td>{c.jobTitle}</td>
            <td><select value={STAGES.includes(c.stage) ? c.stage : 'Applied'} onChange={e => updateCandidate(c.id, { stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></td>
            <td><div className="interview-actions">
              <button className="recruitment-small secondary" onClick={() => setPreviewCandidate(c)}>View</button>
              {(['Applied', 'Screening', 'Shortlisted'].includes(c.stage)) && <button className="recruitment-small" onClick={() => openInterviewForm(c)}>Schedule Interview</button>}
              {c.stage === 'Interview Completed' && <button className="recruitment-small" onClick={() => updateCandidate(c.id, { stage: 'Selected' })}>Select</button>}
            </div></td>
          </tr>)}
        </tbody></table></div>}
    </div>}

    {tab === 'Interviews' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><h2>Interview Schedule</h2></div>
      {allInterviews.length === 0 ? <div className="interview-empty">No interviews scheduled.</div> :
        <div className="interview-list">{allInterviews.map(i => <article className="interview-card" key={`${i.candidateId}-${i.id}`}>
          <div><h3>{i.candidateName} · {i.round}</h3><p>{i.jobTitle} ({i.candidateEmail})</p><p><b>{i.date}</b> at <b>{i.time}</b></p></div>
        </article>)}</div>}
    </div>}

    {previewCandidate && <div className="interview-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setPreviewCandidate(null); }}>
      <section className="interview-modal">
        <div className="interview-modal-head"><h2>Candidate: {previewCandidate.name}</h2><button className="interview-close" onClick={() => setPreviewCandidate(null)}>✕</button></div>
        <p><b>Email:</b> {previewCandidate.email}</p>
        <p><b>Phone:</b> {previewCandidate.phone}</p>
        <p><b>Job:</b> {previewCandidate.jobTitle}</p>
        <p><b>Cover Letter:</b> {previewCandidate.cover_letter || 'None'}</p>
        <div className="interview-form-actions"><button className="recruitment-primary" onClick={() => setPreviewCandidate(null)}>Close</button></div>
      </section>
    </div>}

    {interviewCandidate && <div className="interview-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setInterviewCandidate(null); }}>
      <section className="interview-modal">
        <div className="interview-modal-head"><h2>Schedule Interview for {interviewCandidate.name}</h2><button className="interview-close" onClick={() => setInterviewCandidate(null)}>✕</button></div>
        <form onSubmit={saveInterview}>
          <div className="interview-form-grid">
            <label>Mode<select value={interviewForm.mode} onChange={e => setInterviewForm(v => ({ ...v, mode: e.target.value }))}><option>Online</option><option>Offline</option></select></label>
            <label>Round<select value={interviewForm.round} onChange={e => setInterviewForm(v => ({ ...v, round: e.target.value }))}><option>HR Interview</option><option>Technical Interview</option><option>Managerial</option></select></label>
            <label>Date<input type="date" value={interviewForm.date} onChange={e => setInterviewForm(v => ({ ...v, date: e.target.value }))} required /></label>
            <label>Time<input type="time" value={interviewForm.time} onChange={e => setInterviewForm(v => ({ ...v, time: e.target.value }))} required /></label>
            <label className="interview-full">Meeting Link / Venue<input value={interviewForm.meetingLink || interviewForm.venue} onChange={e => setInterviewForm(v => ({ ...v, meetingLink: e.target.value, venue: e.target.value }))} required /></label>
          </div>
          <div className="interview-form-actions"><button type="submit" className="recruitment-primary">Save Interview</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
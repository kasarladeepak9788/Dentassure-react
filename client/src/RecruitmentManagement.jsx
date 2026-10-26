import React, { useEffect, useMemo, useState } from 'react';
import './recruitment.css';

const STORE_KEY = 'dentassure_recruitment_v1';
// Keep this in sync with the API base URL used by CareersPage.jsx.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const STAGES = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Interview Completed', 'Selected', 'Consent', 'Documents',
  'Onboarding', 'Employee', 'On Hold', 'Rejected'
];
const INTERVIEW_STATUSES = ['Scheduled', 'Rescheduled', 'Completed', 'Candidate No-Show', 'Cancelled'];

const seed = {
  roles: [
    { id: 1, title: 'Database Intern', department: 'Clinical Operations', openings: 1, type: 'Internship', location: 'Hyderabad', priority: 'Normal', reason: 'Team requirement', status: 'Published', description: 'Support database operations and SQL reporting.', skills: 'SQL, PostgreSQL', qualification: 'B.Tech / relevant degree', deadline: '' }
  ],
  candidates: []
};

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return {
      ...seed,
      ...saved,
      roles: Array.isArray(saved.roles) ? saved.roles : seed.roles,
      candidates: Array.isArray(saved.candidates) ? saved.candidates.map(c => ({ ...c, interviews: Array.isArray(c.interviews) ? c.interviews : [] })) : []
    };
  } catch {
    return seed;
  }
}

function makeCredentials() {
  return {
    username: `candidate${Math.floor(100000 + Math.random() * 900000)}`,
    password: `DA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  };
}

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
  const [data, setData] = useState(loadStore);
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
  const [credentialCandidate, setCredentialCandidate] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const refresh = () => setData(loadStore());
    window.addEventListener('storage', refresh);
    window.addEventListener('dentassure-recruitment-update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('dentassure-recruitment-update', refresh);
    };
  }, []);

  // Prototype: convert selected candidates on/after their joining date.
  // In production, perform this check on the backend with a scheduled job.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setData(prev => {
      let changed = false;
      const candidates = prev.candidates.map(c => {
        if (c.stage === 'Selected' && c.joiningDate && c.joiningDate <= today) {
          changed = true;
          return { ...c, stage: 'Employee', employmentStatus: 'Active', employeeId: c.employeeId || `DA-EMP-${String(c.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`, convertedAt: new Date().toISOString() };
        }
        return c;
      });
      return changed ? { ...prev, candidates } : prev;
    });
  }, [data.candidates]);

  // CareersPage submits applications to the backend database. Load those records here;
  // localStorage alone cannot share applications between the public page and this portal.
  useEffect(() => {
    let active = true;
    const loadApplications = async (showErrors = true) => {
      setApplicationsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/recruitment/applications`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load candidate applications.');
        }
        const rows = Array.isArray(result.candidates) ? result.candidates : (Array.isArray(result.applications) ? result.applications : []);
        if (!active) return;
        setData(previous => {
          const saved = loadStore();
          const byId = new Map(saved.candidates.map(candidate => [String(candidate.id), candidate]));
          const candidates = rows.map(row => {
            const old = byId.get(String(row.id)) || {};
            return {
              ...old,
              ...row,
              id: String(row.id),
              name: row.name || '',
              email: row.email || '',
              phone: row.phone || '',
              jobTitle: row.job_title || row.jobTitle || '',
              department: row.department || '',
              appliedAt: row.applied_at || row.appliedAt || '',
              stage: row.stage || old.stage || 'Applied',
              username: row.username || old.username || '',
              interviews: Array.isArray(old.interviews) ? old.interviews : []
            };
          });
          return { ...previous, candidates };
        });
      } catch (error) {
        if (active && showErrors) setMessage(`Applications could not be loaded: ${error.message}. Check that the API is running on ${API_BASE}.`);
      } finally {
        if (active) setApplicationsLoading(false);
      }
    };
    loadApplications();
    const refreshTimer = window.setInterval(() => loadApplications(false), 20000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  const updateCandidate = async (id, patch) => {
    const existingCandidate = data.candidates.find(c => String(c.id) === String(id));
    if (!existingCandidate) return;

    try {
      // Keep the Applications table and its existing actions, but persist candidate
      // stage changes through the API so the Candidate Portal sees the same status.
      if (patch.stage === 'Selected') {
        const response = await fetch(`${API_BASE}/api/recruitment/applications/${encodeURIComponent(id)}/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not select this candidate.');
        }

        setData(prev => ({
          ...prev,
          candidates: prev.candidates.map(c => String(c.id) === String(id)
            ? {
                ...c,
                stage: 'Selected',
                username: result.username || c.username || '',
                employmentStatus: 'Offer Pending'
              }
            : c)
        }));

        // The backend returns the plaintext temporary password only once.
        if (result.temporary_password) {
          setCredentialCandidate({
            id: existingCandidate.id,
            name: existingCandidate.name,
            applicationId: existingCandidate.id,
            username: result.username,
            password: result.temporary_password
          });
        } else {
          setMessage(result.message || 'Candidate selected. Existing credentials remain active.');
        }
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
          setData(prev => ({
            ...prev,
            candidates: prev.candidates.map(c => String(c.id) === String(id)
              ? { ...c, joiningDate: patch.joiningDate, stage: 'Onboarding', employmentStatus: 'Joining Scheduled' }
              : c)
          }));
          setMessage(result.message || 'Joining date saved.');
          return;
        }
        setData(prev => ({
          ...prev,
          candidates: prev.candidates.map(c => String(c.id) === String(id) ? { ...c, ...patch } : c)
        }));
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

      setData(prev => ({
        ...prev,
        candidates: prev.candidates.map(c => String(c.id) === String(id) ? { ...c, ...patch } : c)
      }));

      if (patch.stage === 'Shortlisted') {
        setMessage('Candidate shortlisted. Use Schedule interview in that candidate row to arrange the interview.');
      } else if (patch.stage === 'Interview Completed') {
        setMessage('Interview marked completed. Review the interview feedback, then select or reject the candidate.');
      } else if (patch.stage === 'Rejected') {
        setMessage('Candidate application rejected.');
      } else if (patch.stage === 'On Hold') {
        setMessage('Candidate application placed on hold.');
      }
    } catch (error) {
      setMessage(`Could not update candidate: ${error.message}`);
    }
  };

  const approveRole = id => setData(prev => ({ ...prev, roles: prev.roles.map(r => r.id === id ? { ...r, status: 'Published' } : r) }));

  const addRole = e => {
    e.preventDefault();
    if (!roleForm.title.trim() || !roleForm.department.trim() || !roleForm.reason.trim()) {
      setMessage('Complete the job title, department and reason for hiring.');
      return;
    }
    setData(prev => ({ ...prev, roles: [{ ...roleForm, id: Date.now(), openings: Number(roleForm.openings), status: 'Pending Approval' }, ...prev.roles] }));
    setRoleForm({ title: '', department: '', openings: 1, type: 'Full-time', location: 'Hyderabad', priority: 'Normal', reason: '', description: '', skills: '', qualification: '', deadline: '' });
    setMessage('Role request submitted for approval.');
    setTab('Role Requests');
  };

  const visibleCandidates = useMemo(
    () => data.candidates.filter(c => `${c.name} ${c.email} ${c.jobTitle} ${c.stage}`.toLowerCase().includes(candidateQuery.toLowerCase())),
    [data.candidates, candidateQuery]
  );

  const stats = [
    ['Open positions', data.roles.filter(r => r.status === 'Published').length],
    ['Applications', data.candidates.length],
    ['Interviews scheduled', data.candidates.reduce((n, c) => n + (c.interviews || []).filter(i => ['Scheduled', 'Rescheduled'].includes(i.status)).length, 0)],
    ['Selected', data.candidates.filter(c => ['Selected', 'Consent', 'Documents', 'Onboarding', 'Employee'].includes(c.stage)).length]
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
    if (interviewForm.mode === 'Online' && !interviewForm.meetingLink.trim()) {
      setMessage('Please enter the online meeting link.');
      return;
    }
    if (interviewForm.mode === 'Offline' && !interviewForm.venue.trim()) {
      setMessage('Please enter the offline interview venue.');
      return;
    }
    const interview = {
      ...interviewForm,
      id: editingInterviewId || Date.now(),
      createdAt: new Date().toISOString(),
      dateTimeLabel: `${interviewForm.date} ${interviewForm.time}`
    };
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => {
        if (c.id !== interviewCandidate.id) return c;
        const old = Array.isArray(c.interviews) ? c.interviews : [];
        const interviews = editingInterviewId
          ? old.map(i => i.id === editingInterviewId ? { ...i, ...interview, updatedAt: new Date().toISOString() } : i)
          : [interview, ...old];
        return { ...c, interviews, stage: ['Rejected', 'On Hold'].includes(c.stage) ? c.stage : 'Interview Scheduled' };
      })
    }));
    setInterviewCandidate(null);
    setEditingInterviewId(null);
    setInterviewForm(emptyInterview);
    setTab('Interviews');
    setMessage(editingInterviewId ? 'Interview details updated.' : 'Interview scheduled successfully.');
  };

  const updateInterview = (candidateId, interviewId, patch) => {
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => {
        if (c.id !== candidateId) return c;
        const interviews = (c.interviews || []).map(i => i.id === interviewId ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
        const hasUpcoming = interviews.some(i => ['Scheduled', 'Rescheduled'].includes(i.status));
        const hasCompleted = interviews.some(i => i.status === 'Completed');
        let stage = c.stage;
        if (hasUpcoming) stage = 'Interview Scheduled';
        else if (hasCompleted && c.stage === 'Interview Scheduled') stage = 'Interview Completed';
        return { ...c, interviews, stage };
      })
    }));
  };

  const allInterviews = data.candidates.flatMap(c => (c.interviews || []).map(i => ({ ...i, candidateId: c.id, candidateName: c.name, candidateEmail: c.email, jobTitle: c.jobTitle })))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return <section className="recruitment-page">
    <style>{`
      .application-number{display:inline-block;color:#9d174d;background:#fce7f3;border:1px solid #f9a8d4;border-radius:8px;padding:6px 8px;font-size:12px;white-space:nowrap}.application-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.application-preview-field{border:1px solid #f1d5e2;border-radius:10px;padding:12px;min-width:0}.application-preview-field span{display:block;color:#9d174d;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:6px}.application-preview-field p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#30253a;font-size:13px}.application-preview-wide{grid-column:1/-1}.application-preview-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid #f1d5e2}.candidate-joining-control{display:grid;gap:5px;min-width:150px;margin:7px 0}.candidate-joining-control label{display:grid;gap:4px;font-size:11px;font-weight:700;color:#9d174d}.candidate-joining-control input{max-width:165px;border:1px solid #f1b6d0;border-radius:7px;padding:7px;font:inherit}.candidate-joining-control small{font-size:10px;color:#64748b}.shortlist-hint{display:block;margin-top:6px;color:#9d174d;font-size:11px;font-weight:700}.interview-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
      .interview-modal{width:min(850px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.25)}
      .interview-modal-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}
      .interview-modal-head h2{margin:0 0 5px}.interview-modal-head p{margin:0;color:#64748b;font-size:13px}
      .interview-close{border:0;background:#f1f5f9;border-radius:9px;padding:8px 12px;cursor:pointer}
      .interview-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .interview-form-grid label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}
      .interview-form-grid input,.interview-form-grid select,.interview-form-grid textarea{width:100%;min-width:0;border:1px solid #dbe2ea;border-radius:9px;padding:10px 11px;font:inherit;background:#fff;color:#0f172a}
      .interview-form-grid textarea{min-height:76px;resize:vertical}.interview-full{grid-column:1/-1}
      .interview-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      .interview-list{display:grid;gap:12px}.interview-card{border:1px solid #e2e8f0;border-radius:12px;padding:15px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .interview-card h3{margin:0 0 6px;font-size:15px}.interview-card p{margin:4px 0;color:#64748b;font-size:13px;overflow-wrap:anywhere}
      .interview-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.interview-actions select{max-width:175px}
      .recruitment-small.secondary{background:#eef2ff;color:#3730a3}.interview-tag{display:inline-block;border-radius:999px;background:#e0f2fe;color:#075985;padding:4px 9px;font-size:11px;font-weight:700}
      .interview-empty{padding:24px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px}
      @media(max-width:640px){.interview-form-grid{grid-template-columns:1fr}.interview-full{grid-column:auto}.interview-card{flex-direction:column}.interview-modal{padding:17px}}
    `}</style>

    <header className="recruitment-header">
      <div><span className="recruitment-eyebrow">DENTASSURE STAFF 360</span><h1>Recruitment Management</h1><p>Manage role requests, candidates, interviews and onboarding in one place.</p></div>
      <a className="recruitment-link" href="/careers" target="_blank" rel="noreferrer">Open Careers Page ↗</a>
    </header>

    <div className="recruitment-stats">{stats.map(([label, value], index) => <article className={`recruitment-stat stat-${index+1}`} key={label}><span>{label}</span><strong>{value}</strong><small>{index===0?'Published roles':index===1?'Total received':'Current pipeline'}</small></article>)}</div>

    <nav className="recruitment-tabs">
      {['Overview', 'Role Requests', 'Job Openings', 'Applications', 'Interviews'].map(item =>
        <button key={item} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setMessage(''); }}>{item}</button>
      )}
    </nav>

    {message && <div className="recruitment-message" role="status">{message}</div>}

    {tab === 'Overview' && <div className="recruitment-grid">
      <article className="recruitment-panel hiring-flow-panel"><div className="panel-heading-row"><div><span className="panel-kicker">PROCESS MAP</span><h2>End-to-end hiring workflow</h2><p className="recruitment-muted">Follow each stage from requesting a role to welcoming a new employee.</p></div><span className="flow-count">12 stages</span></div><div className="hiring-flow">{[{title:'Role request',desc:'Department submits need',icon:'✎'},{title:'HR review',desc:'Validate requirements',icon:'⌕'},{title:'Management approval',desc:'Approve headcount',icon:'✓'},{title:'Publish job',desc:'Careers page listing',icon:'↗'},{title:'Application',desc:'Candidate applies',icon:'＋'},{title:'Screening',desc:'Review profile',icon:'◉'},{title:'Shortlist',desc:'Move suitable profiles',icon:'★'},{title:'Interview',desc:'Schedule & assess',icon:'▣'},{title:'Feedback',desc:'Record decision',icon:'☑'},{title:'Offer & consent',desc:'Confirm acceptance',icon:'✉'},{title:'Documents',desc:'Verify credentials',icon:'▤'},{title:'Onboarding',desc:'Create employee record',icon:'→'}].map((step,index)=><React.Fragment key={step.title}><div className={`hiring-flow-step flow-step-${index+1}`}><span className="flow-step-number">{String(index+1).padStart(2,'0')}</span><span className="flow-step-icon">{step.icon}</span><strong>{step.title}</strong><small>{step.desc}</small></div>{index<11&&<span className="hiring-flow-connector" aria-hidden="true">→</span>}</React.Fragment>)}</div><div className="flow-legend"><span><i className="legend-dot pending"/> Request & approval</span><span><i className="legend-dot hiring"/> Candidate evaluation</span><span><i className="legend-dot complete"/> Hiring & onboarding</span></div></article>
      <article className="recruitment-panel"><h2>Needs attention</h2><p>{data.roles.filter(r => r.status === 'Pending Approval').length} role request(s) awaiting approval.</p><p>{data.candidates.filter(c => c.stage === 'Shortlisted').length} shortlisted candidate(s) need an interview scheduled.</p><p>{allInterviews.filter(i => ['Scheduled', 'Rescheduled'].includes(i.status)).length} upcoming or rescheduled interview(s).</p><p>{data.candidates.filter(c => c.stage === 'Documents').length} candidate(s) awaiting document review.</p></article>
    </div>}

    {tab === 'Role Requests' && <div className="recruitment-grid">
      <form className="recruitment-panel recruitment-form" onSubmit={addRole}>
        <h2>Request a new role</h2>
        <label>Job title *<input value={roleForm.title} onChange={e => setRoleForm({ ...roleForm, title: e.target.value })} required /></label>
        <label>Department *<input value={roleForm.department} onChange={e => setRoleForm({ ...roleForm, department: e.target.value })} required /></label>
        <div className="recruitment-two"><label>Openings<input type="number" min="1" value={roleForm.openings} onChange={e => setRoleForm({ ...roleForm, openings: e.target.value })} /></label><label>Employment type<select value={roleForm.type} onChange={e => setRoleForm({ ...roleForm, type: e.target.value })}><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option></select></label></div>
        <div className="recruitment-two"><label>Location<input value={roleForm.location} onChange={e => setRoleForm({ ...roleForm, location: e.target.value })} /></label><label>Priority<select value={roleForm.priority} onChange={e => setRoleForm({ ...roleForm, priority: e.target.value })}><option>Normal</option><option>High</option><option>Urgent</option></select></label></div>
        <label>Required qualification<input value={roleForm.qualification} onChange={e => setRoleForm({ ...roleForm, qualification: e.target.value })} /></label>
        <label>Required skills<input value={roleForm.skills} onChange={e => setRoleForm({ ...roleForm, skills: e.target.value })} /></label>
        <label>Reason for hiring *<textarea value={roleForm.reason} onChange={e => setRoleForm({ ...roleForm, reason: e.target.value })} required /></label>
        <label>Job description<textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} /></label>
        <label>Application deadline<input type="date" value={roleForm.deadline} onChange={e => setRoleForm({ ...roleForm, deadline: e.target.value })} /></label>
        <button className="recruitment-primary">＋ Submit role request</button>
      </form>
      <div className="recruitment-panel role-approvals-panel">
        <div className="recruitment-table-head"><div><h2>Role request approvals</h2><p className="recruitment-muted">Review requested positions and publish approved roles.</p></div><span className="recruitment-count-pill">{data.roles.length} request(s)</span></div>
        {data.roles.length === 0 ? <p className="recruitment-empty">No role requests yet.</p> :
          <div className="recruitment-table-wrap"><table className="recruitment-table role-requests-table"><thead><tr><th>Job title</th><th>Department</th><th>Openings</th><th>Employment type</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {data.roles.map(role => <tr key={role.id}>
              <td><strong>{role.title}</strong><small>{role.location || 'Location not specified'}</small></td>
              <td>{role.department || '—'}</td><td>{role.openings || 1}</td><td>{role.type || 'Full-time'}</td>
              <td><span className={`recruitment-badge ${role.priority === 'Urgent' || role.priority === 'High' ? 'amber' : ''}`}>{role.priority || 'Normal'}</span></td>
              <td><span className={`recruitment-badge ${role.status === 'Published' ? 'green' : role.status === 'Pending Approval' ? 'amber' : ''}`}>{role.status || 'Pending Approval'}</span></td>
              <td>{role.status === 'Pending Approval' ? <button type="button" className="recruitment-small action-approve" onClick={() => approveRole(role.id)}>✓ Approve & publish</button> : <span className="recruitment-muted">No action needed</span>}</td>
            </tr>)}
          </tbody></table></div>}
      </div>
    </div>}

    {tab === 'Job Openings' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><div><h2>Published careers</h2><p className="recruitment-muted">Only approved and published roles should appear on the public Careers Page.</p></div><span className="recruitment-count-pill">{data.roles.filter(r => r.status === 'Published').length} published</span></div>
      {data.roles.filter(r => r.status === 'Published').length === 0 ? <p className="recruitment-empty">No published job openings yet. Approve a role request to publish it.</p> :
        <div className="recruitment-table-wrap"><table className="recruitment-table role-requests-table"><thead><tr><th>Job title</th><th>Department</th><th>Location</th><th>Type</th><th>Openings</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {data.roles.filter(r => r.status === 'Published').map(role => <tr key={role.id}><td><strong>{role.title}</strong><small>{role.description || 'No description provided'}</small></td><td>{role.department || '—'}</td><td>{role.location || '—'}</td><td>{role.type || 'Full-time'}</td><td>{role.openings || 1}</td><td>{role.deadline || 'Not specified'}</td><td><span className="recruitment-badge green">Published</span></td><td><button type="button" className="recruitment-small secondary" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/careers`); setMessage('Careers Page address copied.'); }}>Copy careers link</button></td></tr>)}
        </tbody></table></div>}
    </div>}

    {tab === 'Applications' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><h2>Candidate applications</h2><input placeholder="Search candidates..." value={candidateQuery} onChange={e => setCandidateQuery(e.target.value)} /></div>
      {applicationsLoading && visibleCandidates.length === 0 ? <p className="recruitment-empty">Loading applications from the DentAssure database…</p> : visibleCandidates.length === 0 ? <p className="recruitment-empty">No applications found in the database yet. Submit a test application on the public Careers Page, then refresh this screen.</p> :
        <div className="recruitment-table-wrap"><table className="recruitment-table"><thead><tr><th>Application No.</th><th>Candidate</th><th>Applied role</th><th>Recruitment stage</th><th>Interview details</th><th>Actions</th></tr></thead><tbody>
          {visibleCandidates.map(c => <tr key={c.id}>
            <td><strong className="application-number">{c.id}</strong><small>Application reference</small></td>
            <td><strong>{c.name}</strong><small>{c.email} · {c.phone}</small><small>Temporary username: {c.username || 'Generated after candidate selection'}</small>{c.joiningDate && <small>Joining: {c.joiningDate} · {c.employmentStatus || 'Offer Pending'}</small>}</td>
            <td>{c.jobTitle}</td>
            <td><select aria-label={`Recruitment stage for ${c.name}`} value={STAGES.includes(c.stage) ? c.stage : 'Applied'} onChange={e => updateCandidate(c.id, { stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select>{c.stage === 'Shortlisted' && <small className="shortlist-hint">✓ Shortlisted — interview can be scheduled</small>}</td>
            <td>{(c.interviews || []).length ? <><span className="interview-tag">{(c.interviews || []).length} round(s)</span><small>{c.interviews[0].mode} · {c.interviews[0].date} {c.interviews[0].time}</small></> : <small>{c.interviewType && c.interviewType !== 'Not scheduled' ? `${c.interviewType} · details not scheduled` : 'Not scheduled'}</small>}</td>
            <td><div className="interview-actions">
              <button className="recruitment-small secondary" onClick={() => setPreviewCandidate(c)}>View Application</button>
              {c.stage === 'Shortlisted' && <button className="recruitment-small action-schedule" onClick={() => openInterviewForm(c)}>＋ Schedule interview</button>}
              {c.stage === 'Interview Scheduled' && <button className="recruitment-small action-schedule" onClick={() => openInterviewForm(c)}>＋ Add interview round</button>}
              {c.stage === 'Interview Completed' && <button className="recruitment-small action-schedule" onClick={() => updateCandidate(c.id, { stage: 'Selected' })}>✓ Select candidate</button>}
              {c.stage === 'Selected' && <div className="candidate-joining-control">
                <label>Joining date
                  <input type="date" value={c.joiningDate || ''} min={new Date().toISOString().slice(0, 10)} onChange={e => updateCandidate(c.id, { joiningDate: e.target.value, employmentStatus: 'Offer Pending' })} />
                </label>
                <small>{c.joiningDate ? `Status: ${c.employmentStatus || 'Offer Pending'}` : 'Set a joining date to enable employee conversion.'}</small>
              </div>}
              {c.stage === 'Employee' && <span className="recruitment-badge green">Employee ID: {c.employeeId || 'Created'}</span>}
              {c.stage === 'Selected' && <button className="recruitment-small secondary" onClick={() => updateCandidate(c.id, { stage: 'Consent' })}>Move to consent</button>}
              {(c.interviews || []).length > 0 && <button className="recruitment-small secondary" onClick={() => { setHistoryCandidate(c); setTab('Interviews'); }}>Interview history</button>}
            </div></td>
          </tr>)}
        </tbody></table></div>}
    </div>}

    {tab === 'Interviews' && <div className="recruitment-panel">
      <div className="recruitment-table-head"><div><h2>Interview Scheduler</h2><p className="recruitment-muted">Schedule online or offline interviews and track each round.</p></div><input placeholder="Search candidates..." value={candidateQuery} onChange={e => setCandidateQuery(e.target.value)} /></div>
      {historyCandidate && <div className="recruitment-message">Showing interview history for {historyCandidate.name}. <button className="recruitment-small secondary" onClick={() => setHistoryCandidate(null)}>Show all interviews</button></div>}
      {allInterviews.filter(i => (!historyCandidate || i.candidateId === historyCandidate.id) && `${i.candidateName} ${i.candidateEmail} ${i.jobTitle} ${i.round}`.toLowerCase().includes(candidateQuery.toLowerCase())).length === 0 ?
        <div className="interview-empty">No interviews found. Go to Applications, change a candidate's stage to <b>Shortlisted</b>, and click <b>Schedule interview</b>.</div> :
        <div className="interview-list">{allInterviews.filter(i => (!historyCandidate || i.candidateId === historyCandidate.id) && `${i.candidateName} ${i.candidateEmail} ${i.jobTitle} ${i.round}`.toLowerCase().includes(candidateQuery.toLowerCase())).map(i => <article className="interview-card" key={`${i.candidateId}-${i.id}`}>
          <div><h3>{i.candidateName} · {i.round}</h3><p>{i.jobTitle} · {i.candidateEmail}</p><p><b>{i.date}</b> at <b>{i.time}</b> · {i.duration} · Interviewer: {i.interviewer || 'Not assigned'}</p><p><span className="interview-tag">{i.mode}</span> &nbsp; <span className="recruitment-badge">{i.status}</span></p>
            {i.mode === 'Online' ? <><p>Platform: {i.platform || 'Not specified'}</p>{i.meetingLink && <p>Meeting link: <a href={i.meetingLink} target="_blank" rel="noreferrer">{i.meetingLink}</a></p>}{i.meetingPassword && <p>Meeting password: {i.meetingPassword}</p>}</> : <><p>Venue: {i.venue}</p>{i.room && <p>Room/Floor: {i.room}</p>}{i.contactPerson && <p>Contact person: {i.contactPerson}</p>}</>}
            {i.instructions && <p>Instructions: {i.instructions}</p>}
          </div>
          <div className="interview-actions">
            <button className="recruitment-small secondary" onClick={() => { const c = data.candidates.find(x => x.id === i.candidateId); if (c) openInterviewForm(c, i); }}>Edit / Reschedule</button>
            <select aria-label="Interview status" value={i.status || 'Scheduled'} onChange={e => updateInterview(i.candidateId, i.id, { status: e.target.value })}>{INTERVIEW_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          </div>
        </article>)}</div>}
    </div>}

    <p className="recruitment-note">Prototype note: interview and candidate data are saved in browser localStorage. This does not send emails automatically or sync across computers. Connect the module to the authenticated backend and database before using it for live recruitment.</p>

    {credentialCandidate && <div className="interview-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setCredentialCandidate(null); }}>
      <section className="interview-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-credentials-title">
        <div className="interview-modal-head"><div><h2 id="candidate-credentials-title">Temporary Staff 360 Login</h2><p>Generated for selected candidate: {credentialCandidate.name}</p></div><button type="button" className="interview-close" onClick={() => setCredentialCandidate(null)}>Close ✕</button></div>
        <div className="application-preview-grid">
          <div className="application-preview-field"><span>Application ID</span><p>{credentialCandidate.applicationId}</p></div>
          <div className="application-preview-field"><span>Username</span><p>{credentialCandidate.username}</p></div>
          <div className="application-preview-field application-preview-wide"><span>Temporary password</span><p>{credentialCandidate.password}</p></div>
        </div>
        <p className="recruitment-message">Copy these credentials now and share them securely. This prototype displays them here; a production backend should store only a password hash and provide a secure one-time credential handoff.</p>
        <div className="interview-form-actions"><button type="button" className="recruitment-primary" onClick={() => setCredentialCandidate(null)}>Done</button></div>
      </section>
    </div>}

    {previewCandidate && <div className="interview-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPreviewCandidate(null); }}>
      <section className="interview-modal application-preview-modal" role="dialog" aria-modal="true" aria-labelledby="application-preview-title">
        <div className="interview-modal-head"><div><h2 id="application-preview-title">Candidate Application Preview</h2><p>{previewCandidate.name || 'Candidate'} · {previewCandidate.jobTitle || previewCandidate.job_title || 'Role not specified'}</p></div><button type="button" className="interview-close" onClick={() => setPreviewCandidate(null)}>Close ✕</button></div>
        <div className="application-preview-grid">
          <div className="application-preview-field"><span>Application Number</span><p>{previewCandidate.id || 'Not available'}</p></div>
          <div className="application-preview-field"><span>Current Stage</span><p>{previewCandidate.stage || 'Applied'}</p></div>
          <div className="application-preview-field"><span>Full Name</span><p>{previewCandidate.name || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Email Address</span><p>{previewCandidate.email || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Phone Number</span><p>{previewCandidate.phone || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Qualification</span><p>{previewCandidate.qualification || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Experience</span><p>{previewCandidate.experience || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Applied Role</span><p>{previewCandidate.jobTitle || previewCandidate.job_title || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Department</span><p>{previewCandidate.department || 'Not provided'}</p></div>
          <div className="application-preview-field"><span>Skills</span><p>{previewCandidate.skills || 'Not provided'}</p></div>
          <div className="application-preview-field application-preview-wide"><span>LinkedIn Profile</span><p>{previewCandidate.linkedin ? <a href={previewCandidate.linkedin} target="_blank" rel="noreferrer">{previewCandidate.linkedin}</a> : 'Not provided'}</p></div>
          <div className="application-preview-field application-preview-wide"><span>Cover Letter</span><p>{previewCandidate.cover_letter || previewCandidate.coverLetter || 'No cover letter submitted'}</p></div>
          <div className="application-preview-field application-preview-wide"><span>Resume</span><p>{(previewCandidate.resume_url || previewCandidate.resumeUrl || previewCandidate.resume_path || previewCandidate.resumePath) ? <a href={`${API_BASE}/${String(previewCandidate.resume_url || previewCandidate.resumeUrl || previewCandidate.resume_path || previewCandidate.resumePath).replace(/^\//, '')}`} target="_blank" rel="noreferrer">View / Download Resume{previewCandidate.resume_name ? ` (${previewCandidate.resume_name})` : ''}</a> : (previewCandidate.resume_name || previewCandidate.resumeName || 'No resume file/reference available')}</p></div>
          <div className="application-preview-field"><span>Applied On</span><p>{previewCandidate.applied_at || previewCandidate.appliedAt ? new Date(previewCandidate.applied_at || previewCandidate.appliedAt).toLocaleString() : 'Not available'}</p></div>
        </div>
        <div className="application-preview-actions">
          {previewCandidate.stage === 'Interview Completed' ? <>
            <button type="button" className="recruitment-small secondary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'On Hold' }); setPreviewCandidate(null); }}>Keep on Hold</button>
            <button type="button" className="recruitment-small" style={{background:'#fee2e2',color:'#b91c1c',borderColor:'#fecaca'}} onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Rejected' }); setPreviewCandidate(null); }}>Reject</button>
            <button type="button" className="recruitment-primary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Selected' }); setPreviewCandidate(null); }}>✓ Select Candidate</button>
          </> : previewCandidate.stage === 'Selected' ? <>
            <button type="button" className="recruitment-small secondary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'On Hold' }); setPreviewCandidate(null); }}>Keep on Hold</button>
            <button type="button" className="recruitment-small" style={{background:'#fee2e2',color:'#b91c1c',borderColor:'#fecaca'}} onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Rejected' }); setPreviewCandidate(null); }}>Reject</button>
            <button type="button" className="recruitment-primary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Consent' }); setPreviewCandidate(null); }}>Continue to Consent</button>
          </> : <>
            <button type="button" className="recruitment-small secondary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'On Hold' }); setPreviewCandidate(null); }}>Keep on Hold</button>
            <button type="button" className="recruitment-small" style={{background:'#fee2e2',color:'#b91c1c',borderColor:'#fecaca'}} onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Rejected' }); setPreviewCandidate(null); }}>Reject</button>
            {['Applied', 'Screening'].includes(previewCandidate.stage || 'Applied') && <button type="button" className="recruitment-primary" onClick={() => { updateCandidate(previewCandidate.id, { stage: 'Shortlisted' }); setPreviewCandidate(null); }}>✓ Shortlist</button>}
          </>}
        </div>
      </section>
    </div>}

    {interviewCandidate && <div className="interview-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setInterviewCandidate(null); }}>
      <section className="interview-modal" role="dialog" aria-modal="true" aria-labelledby="interview-modal-title">
        <div className="interview-modal-head"><div><h2 id="interview-modal-title">{editingInterviewId ? 'Edit / Reschedule Interview' : 'Schedule Interview'}</h2><p>{interviewCandidate.name} · {interviewCandidate.jobTitle}</p></div><button type="button" className="interview-close" onClick={() => setInterviewCandidate(null)}>Close ✕</button></div>
        <form onSubmit={saveInterview}>
          <div className="interview-form-grid">
            <label>Interview mode *<select value={interviewForm.mode} onChange={e => setInterviewForm(v => ({ ...v, mode: e.target.value }))}><option>Online</option><option>Offline</option></select></label>
            <label>Interview round *<select value={interviewForm.round} onChange={e => setInterviewForm(v => ({ ...v, round: e.target.value }))}><option>HR Interview</option><option>Technical Interview</option><option>Managerial Interview</option><option>Final Interview</option><option>Other</option></select></label>
            <label>Interview date *<input type="date" min={new Date().toISOString().slice(0, 10)} value={interviewForm.date} onChange={e => setInterviewForm(v => ({ ...v, date: e.target.value }))} required /></label>
            <label>Interview time *<input type="time" value={interviewForm.time} onChange={e => setInterviewForm(v => ({ ...v, time: e.target.value }))} required /></label>
            <label>Duration<select value={interviewForm.duration} onChange={e => setInterviewForm(v => ({ ...v, duration: e.target.value }))}><option>15 minutes</option><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></label>
            <label>Interviewer name *<input value={interviewForm.interviewer} onChange={e => setInterviewForm(v => ({ ...v, interviewer: e.target.value }))} required placeholder="Enter interviewer name" /></label>
            {interviewForm.mode === 'Online' ? <>
              <label>Meeting platform<select value={interviewForm.platform} onChange={e => setInterviewForm(v => ({ ...v, platform: e.target.value }))}><option>Google Meet</option><option>Microsoft Teams</option><option>Zoom</option><option>Other</option></select></label>
              <label>Meeting link *<input type="url" value={interviewForm.meetingLink} onChange={e => setInterviewForm(v => ({ ...v, meetingLink: e.target.value }))} placeholder="https://..." required /></label>
              <label className="interview-full">Meeting password (if required)<input value={interviewForm.meetingPassword} onChange={e => setInterviewForm(v => ({ ...v, meetingPassword: e.target.value }))} /></label>
            </> : <>
              <label className="interview-full">Complete interview venue/address *<textarea value={interviewForm.venue} onChange={e => setInterviewForm(v => ({ ...v, venue: e.target.value }))} required placeholder="Office name, street, area, city, PIN code" /></label>
              <label>Floor / meeting room<input value={interviewForm.room} onChange={e => setInterviewForm(v => ({ ...v, room: e.target.value }))} placeholder="Floor or room number" /></label>
              <label>Contact person<input value={interviewForm.contactPerson} onChange={e => setInterviewForm(v => ({ ...v, contactPerson: e.target.value }))} /></label>
            </>}
            <label className="interview-full">Candidate instructions<textarea value={interviewForm.instructions} onChange={e => setInterviewForm(v => ({ ...v, instructions: e.target.value }))} placeholder="Documents to bring, joining instructions, reporting time, etc." /></label>
          </div>
          <div className="interview-form-actions"><button type="button" className="recruitment-small secondary" onClick={() => setInterviewCandidate(null)}>Cancel</button><button type="submit" className="recruitment-primary">{editingInterviewId ? 'Save changes' : 'Schedule interview'}</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
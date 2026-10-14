import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard,Users,BriefcaseBusiness,Target,FolderKanban,MessageCircle,WalletCards,Settings,Wifi,LogOut,Menu,Bell,ChevronDown,Clock3,Paperclip,Send,Plus,Upload,CheckCircle2,CalendarDays,Activity,Search,FileText,X,Smile,MoreVertical,Mic,Image as ImageIcon,CheckCheck,Camera,Download,UserRound,BarChart3} from 'lucide-react';
import './styles.css';
import './addons.css';
import RecruitmentManagement from './RecruitmentManagement.jsx';
import CareersPage from './CareersPage.jsx';
import CandidatePortal from './CandidatePortal.jsx';

const portalUsers={
  management:{username:'management',password:'Admin@2026',name:'Management',code:'MGMT',role:'Administrator',department:'Administration'},
  accountant:{username:'accountant',password:'Accountant@2026',name:'DentAssure Accountant',code:'DA-ACC-1001',role:'Accountant',department:'Finance & Payroll'},
  hr:{username:'hr',password:'HR@2026',name:'DentAssure HR',code:'DA-HR-1001',role:'HR Manager',department:'Human Resources'},
  deepak:{username:'deepak.kasarla',password:'Dent@2026',name:'Kasarla Deepak',code:'DA-EMP-1024',role:'Database Intern',department:'Clinical Operations'},
  gayathri:{username:'gayathri.madaka',password:'Gay@2026',name:'Gayathri Madaka',code:'DA-EMP-1025',role:'Employee',department:'Operations'}
};

const employees=[
{id:1,code:'DA-EMP-1024',name:'Kasarla Deepak',role:'Database Intern',department:'Clinical Operations',status:'Present',online:true,tasks:5,projects:2},
{id:2,code:'DA-EMP-1025',name:'Gayathri Madaka',role:'Employee',department:'Operations',status:'Present',online:true,tasks:3,projects:1}
];
const initialTasks=[
 {id:1,title:'Patient Assistance',description:'Complete assigned clinical support',priority:'High',status:'In Progress',progress:70,employee:'Deepak Kasarla'},
 {id:2,title:'Equipment Check',description:'Verify clinical equipment',priority:'Medium',status:'To Do',progress:30,employee:'Deepak Kasarla'},
 {id:3,title:"Inventory Update",description:"Update today's inventory",priority:'Normal',status:'Completed',progress:100,employee:'Deepak Kasarla'}
];
const projects=[{id:'DA-241',name:'Employee Portal',progress:91,status:'In Progress'},{id:'DA-244',name:'Attendance Integration',progress:82,status:'In Progress'}];
const files=[{name:'Employee-Portal-Requirements.pdf',project:'Employee Portal',size:'1.6 MB',date:'25 Aug 2026',new:true},{name:'Attendance-Integration-Task.docx',project:'Attendance Integration',size:'840 KB',date:'25 Aug 2026',new:true},{name:'Employee-Handbook.pdf',project:'Company',size:'2.4 MB',date:'24 Aug 2026',new:false}];

const CHAT_KEY = 'dentassure_team_conversations';
const NOTIFICATION_KEY = 'dentassure_notifications';

function conversationKey(a,b){return [a,b].sort().join('__')}
function getStoredMessages(){try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'[]')}catch{return []}}
function saveStoredMessages(messages){localStorage.setItem(CHAT_KEY,JSON.stringify(messages));window.dispatchEvent(new Event('dentassure-chat-update'));}
function getConversationMessages(a,b){const key=conversationKey(a,b);return getStoredMessages().filter(m=>conversationKey(m.from,m.to)===key)}
function addChatMessage(from,to,text,file=null,image=null){const message={id:Date.now()+Math.random(),from,to,text,file,image,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),date:new Date().toISOString()};saveStoredMessages([...getStoredMessages(),message]);return message}
function getNotifications(){try{return JSON.parse(localStorage.getItem(NOTIFICATION_KEY)||'[]')}catch{return []}}
function addNotification(target,title,text){const list=getNotifications();list.unshift({id:Date.now()+Math.random(),target,title,text,time:new Date().toISOString(),read:false});localStorage.setItem(NOTIFICATION_KEY,JSON.stringify(list.slice(0,50)));window.dispatchEvent(new Event('dentassure-notification-update'));}
function userKeyFromUser(user){const entry=Object.entries(portalUsers).find(([,value])=>value.code===user.code);return entry?.[0]||'management'}
function getOtherUsers(currentKey){return Object.entries(portalUsers).filter(([key])=>key!==currentKey).map(([key,user])=>({key,...user}))}
function getUserByKey(key){return portalUsers[key]||null}

const ATTENDANCE_KEY='dentassure_attendance_records';
const LEAVE_KEY='dentassure_leave_requests';
function getAttendanceRecords(){try{return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)||'[]')}catch{return []}}
function saveAttendanceRecords(list){localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(list));window.dispatchEvent(new Event('dentassure-attendance-update'))}
function getLeaveRequests(){try{return JSON.parse(localStorage.getItem(LEAVE_KEY)||'[]')}catch{return []}}
function saveLeaveRequests(list){localStorage.setItem(LEAVE_KEY,JSON.stringify(list));window.dispatchEvent(new Event('dentassure-leave-update'))}
function employeeAttendance(code){return getAttendanceRecords().find(x=>x.code===code&&x.date===new Date().toISOString().slice(0,10))||null}

const WORK_START_MINUTES = 9 * 60 + 30;
const WORK_END_MINUTES = 18 * 60 + 30;
function timeStringToMinutes(value){
  if(!value) return null;
  const match=String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if(!match) return null;
  let h=Number(match[1]), m=Number(match[2]);
  const ap=(match[3]||'').toUpperCase();
  if(ap==='AM' && h===12) h=0;
  if(ap==='PM' && h!==12) h+=12;
  if(h>23||m>59) return null;
  return h*60+m;
}
function arrivalIndicator(checkIn){
  const mins=timeStringToMinutes(checkIn);
  if(mins===null) return {label:'—',tone:'gray',minutes:0};
  const diff=mins-WORK_START_MINUTES;
  return diff>0 ? {label:`Late Arrival • ${diff} min late`,tone:'yellow',minutes:diff} : {label:'On Time',tone:'green',minutes:0};
}
function logoutIndicator(checkOut){
  const mins=timeStringToMinutes(checkOut);
  if(mins===null) return {label:'—',tone:'gray',minutes:0};
  const diff=WORK_END_MINUTES-mins;
  return diff>0 ? {label:`Early Logout • ${diff} min early`,tone:'orange',minutes:diff} : {label:'On Time Logout',tone:'green',minutes:0};
}

const EMPLOYEE_DETAILS_PREFIX='dentassure_employee_details_';
const EMPLOYEE_VERIFICATION_PREFIX='dentassure_employee_verification_';
function getEmployeeDetails(code){try{return JSON.parse(localStorage.getItem(EMPLOYEE_DETAILS_PREFIX+code)||'null')}catch{return null}}
function getEmployeeVerification(code){return localStorage.getItem(EMPLOYEE_VERIFICATION_PREFIX+code)||'pending'}
function saveEmployeeDetails(details){
  const existing=getEmployeeDetails(details.employeeCode);
  localStorage.setItem(EMPLOYEE_DETAILS_PREFIX+details.employeeCode,JSON.stringify({...details,updatedAt:new Date().toISOString()}));
  if(!existing)localStorage.setItem(EMPLOYEE_VERIFICATION_PREFIX+details.employeeCode,'pending');
  window.dispatchEvent(new Event('dentassure-profile-update'));
}
function setEmployeeVerification(code,status){localStorage.setItem(EMPLOYEE_VERIFICATION_PREFIX+code,status);window.dispatchEvent(new Event('dentassure-profile-update'));}
function money(value){return Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}

function downloadPayslip(details,selectedMonth,selectedYear){
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const month=monthNames[Number(selectedMonth)]+' '+selectedYear;
  const salaryValue=String(details.monthlySalary??'').trim();
  const taxValue=String(details.incomeTax??'').trim();
  const totalEarnings=Number(salaryValue||0);
  const totalDeductions=taxValue===''?null:Number(taxValue||0);
  const net=totalEarnings-(totalDeductions??0);
  const display=v=>String(v??'').trim()===''?'':esc(v);
  const moneyOrBlank=v=>String(v??'').trim()===''?'':money(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>DentAssure Payslip - ${esc(details.employeeName)} - ${esc(month)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#222;margin:0;padding:28px}.sheet{max-width:900px;margin:auto;border:2px solid #222}.company{display:flex;align-items:center;gap:18px;padding:16px 20px;border-bottom:2px solid #222}.company img{width:135px;height:58px;object-fit:contain}.company h1{font-size:20px;margin:0 0 6px;text-align:center}.company p{font-size:12px;line-height:1.4;margin:0;text-align:center}.title{text-align:center;font-size:18px;font-weight:800;padding:12px;border-bottom:1px solid #222}.info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #222}.info-col{display:grid;grid-template-columns:150px 1fr}.info-col:first-child{border-right:1px solid #222}.info-col div{padding:7px 9px;border-bottom:1px solid #ddd;font-size:11px;min-height:28px}.info-col div:nth-child(odd){font-weight:700;border-right:1px solid #ddd}.info-col div:nth-child(even){font-weight:600}.pay{width:100%;border-collapse:collapse}.pay th,.pay td{border:1px solid #222;padding:8px;font-size:11px}.pay th{font-size:12px;background:#f7f7f7}.pay td:nth-child(2),.pay td:nth-child(4){text-align:right}.total{font-weight:800}.net{padding:11px;border-top:0;font-weight:800;font-size:13px}.note{text-align:center;padding:12px;font-size:10px}.print{position:fixed;right:20px;top:20px;padding:10px 14px;border:0;border-radius:7px;background:#cf2766;color:#fff;font-weight:700}@media print{body{padding:0}.sheet{max-width:none}.print{display:none}}</style></head><body><button class="print" onclick="window.print()">Print / Save as PDF</button><div class="sheet">
  <div class="company"><img src="${location.origin}/dentassure-logo.png" alt="DentAssure"><div style="flex:1"><h1>DENTASSURE HEALTH PLANS PRIVATE LIMITED</h1><p>Plot no 11, 4th Floor, Insignia, RK Puram Main Rd,<br>Margadarshi Colony, Kothapet, Hyderabad, Telangana - 500102.</p></div></div>
  <div class="title">Payslip for the Month of ${esc(month)}</div>
  <div class="info"><div class="info-col"><div>Employee Name</div><div>${esc(details.employeeName)}</div><div>Employee Code</div><div>${esc(details.employeeCode)}</div><div>Designation</div><div>${esc(details.designation)}</div><div>Department</div><div>${esc(details.department)}</div><div>Bank Name</div><div>${display(details.bankName)}</div><div>Bank Account No</div><div>${display(details.bankAccount)}</div><div>Provident Fund No</div><div>${display(details.pfNo)}</div><div>UAN</div><div>${display(details.uan)}</div></div><div class="info-col"><div>PAN</div><div>${display(details.pan)}</div><div>State</div><div>${display(details.state)}</div><div>City</div><div>${display(details.city)}</div></div></div>
  <table class="pay"><thead><tr><th>Head</th><th>Earnings</th><th>Deductions</th><th>Amount</th></tr></thead><tbody><tr><td>Monthly Salary</td><td>${moneyOrBlank(salaryValue)}</td><td>INCOME TAX</td><td>${moneyOrBlank(taxValue)}</td></tr><tr class="total"><td>Total Earnings</td><td>${moneyOrBlank(salaryValue)}</td><td>Total Deductions</td><td>${totalDeductions===null?'':money(totalDeductions)}</td></tr></tbody></table><div class="net">Net Salary : ${money(net)} (Rs. ${esc(numberToWords(net))} rupees only)</div><div class="note">"This is a computer generated statement and does not require any signature or stamp."</div></div><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`;
  const win=window.open('','_blank','width=980,height=900');
  if(!win){alert('Please allow pop-ups to download the payslip.');return}
  win.document.write(html);win.document.close();
}

function numberToWords(num){
  const n=Math.round(Number(num)||0); if(n===0)return 'Zero';
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=x=>x<20?ones[x]:tens[Math.floor(x/10)]+(x%10?' '+ones[x%10]:'');
  const part=(x,unit)=>x?two(x)+' '+unit:'';
  let out=''; const crore=Math.floor(n/10000000); const lakh=Math.floor((n%10000000)/100000); const thousand=Math.floor((n%100000)/1000); const hundred=Math.floor((n%1000)/100); const rest=n%100;
  if(crore)out+=part(crore,'Crore')+' '; if(lakh)out+=part(lakh,'Lakh')+' '; if(thousand)out+=part(thousand,'Thousand')+' '; if(hundred)out+=ones[hundred]+' Hundred '; if(rest)out+=two(rest); return out.trim();
}

function Login({onLogin}){
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const submit=e=>{
  e.preventDefault();
  const user=Object.entries(portalUsers).find(([,u])=>u.username.toLowerCase()===username.trim().toLowerCase()&&u.password===password);
  if(!user){setError('Invalid username or password.');return}
  setError('');
  onLogin(user[0],user[1]);
 };
 return <div className="login-page"><div className="login-card"><div className="login-logo"><img src="/dentassure-logo.png" alt="DentAssure"/></div><h1>Employee Management Portal</h1><p>Secure access to your DentAssure workspace</p><form onSubmit={submit}><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" required/>{error&&<div className="login-error">{error}</div>}<button type="submit" className="primary wide login-button">SIGN IN</button></form><div className="login-footer"><span>Secure DentAssure Portal</span></div></div></div>}

function Sidebar({role,section,setSection,mobileOpen,setMobileOpen}){const management=[['dashboard','Dashboard',LayoutDashboard],['employees','Employees',Users],['attendance','Attendance & Hours',Clock3],['leave','Leave Management',CalendarDays],['wfh','Work From Home',CalendarDays],['reports','Reports',BarChart3],['workspace','Workspace',BriefcaseBusiness],['tasks','Tasks',Target],['projects','Projects',FolderKanban],['recruitment','Recruitment',BriefcaseBusiness],['documents','Documents & Verification',FileText],['biometric','Biometric Integration',Wifi],['chat','Team Chat',MessageCircle],['salary','Salary Management',WalletCards],['notifications','Notifications',Bell],['audit','Audit Logs',Activity],['settings','Settings',Settings]];const staff=[['dashboard','Dashboard',LayoutDashboard],['attendance','Attendance',Clock3],['leave','Leave Management',CalendarDays],['wfh','Work From Home',CalendarDays],['workspace','Workspace',BriefcaseBusiness],['tasks','My Tasks',Target],['chat','Team Chat',MessageCircle],['files','Files & Documents',Paperclip],['activity','Activity & Updates',Activity],['profile','My Profile',UserRound],['salary','Salary',WalletCards],['notifications','Notifications',Bell]];const accountant=[['salary','Salary & Payroll',WalletCards]];const hrItems=[['dashboard','HR Dashboard',LayoutDashboard],['employees','Employee Records',Users],['attendance','Attendance & Hours',Clock3],['leave','Leave Management',CalendarDays],['wfh','Work From Home',CalendarDays],['reports','HR Reports',BarChart3],['recruitment','Recruitment',BriefcaseBusiness],['documents','Documents & Verification',FileText],['tasks','Tasks',Target],['notifications','Notifications',Bell]];
const items=role==='management'?management:role==='accountant'?accountant:role==='hr'?hrItems:staff;return <><div className={'mobile-overlay '+(mobileOpen?'show':'')} onClick={()=>setMobileOpen(false)}/><aside className={'sidebar '+(mobileOpen?'open':'')}><div className="logo"><img src="/dentassure-logo.png" className="dentassure-logo" alt="DentAssure"/><div><small>{role==='management'?'Management':role==='accountant'?'Accountant':role==='hr'?'HR':'Staff'} Portal</small></div></div><nav><div className="nav-title">MAIN MENU</div>{items.map(([id,label,Icon])=><button key={id} className={'nav-item '+(section===id?'active':'')} onClick={()=>{setSection(id);setMobileOpen(false)}}><Icon size={17}/><span>{label}</span>{id==='chat'&&<em>5</em>}</button>)}</nav><div className="office-card"><div><span className="dot"/> Office Network</div><p>Portal available through the office network.</p></div></aside></>}

function Header({role,user,setMobileOpen,onLogout,employeeDetails}){
 const [showProfile,setShowProfile]=useState(false);
 const [showNotifications,setShowNotifications]=useState(false);
 const [profilePhoto,setProfilePhoto]=useState(()=>localStorage.getItem(`dentassure_profile_photo_${user.code}`)||'');
 const [photoError,setPhotoError]=useState('');
 const [notifications,setNotifications]=useState(()=>getNotifications().filter(n=>n.target===role));
 useEffect(()=>{const refresh=()=>setNotifications(getNotifications().filter(n=>n.target===role));window.addEventListener('dentassure-notification-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('dentassure-notification-update',refresh);window.removeEventListener('storage',refresh)}},[role]);
 const uploadProfilePhoto=e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){setPhotoError('Please select an image file.');return}if(file.size>2*1024*1024){setPhotoError('Profile photo must be 2 MB or smaller.');return}const reader=new FileReader();reader.onload=()=>{setProfilePhoto(reader.result);localStorage.setItem(`dentassure_profile_photo_${user.code}`,reader.result);setPhotoError('')};reader.readAsDataURL(file);e.target.value=''};
 const unread=notifications.filter(n=>!n.read).length;
 const openNotifications=()=>{setShowNotifications(!showNotifications);setShowProfile(false)};
 const markAllRead=()=>{const all=getNotifications().map(n=>n.target===role?{...n,read:true}:n);localStorage.setItem(NOTIFICATION_KEY,JSON.stringify(all));window.dispatchEvent(new Event('dentassure-notification-update'));};
 return <header className="header"><div className="head-left"><button className="icon-btn mobile-only" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div><h2>{role==='management'?'Management Dashboard':role==='accountant'?'Accountant — Salary Dashboard':role==='hr'?'HR Dashboard':'Staff Dashboard'}</h2><p>DentAssure Employee Portal</p></div></div><div className="head-right"><div className="wifi"><Wifi size={15}/><span>Office Wi-Fi</span></div><div className="notification-wrapper"><button className={'icon-btn '+(showNotifications?'notification-open':'')} onClick={openNotifications}><Bell size={18}/>{unread>0&&<i className="notification-count">{unread>9?'9+':unread}</i>}</button>{showNotifications&&<div className="notification-panel"><div className="notification-head"><div><b>Notifications</b><small>{unread?`${unread} unread update${unread>1?'s':''}`:'All caught up'}</small></div><button onClick={markAllRead}>Mark all read</button></div><div className="notification-list">{notifications.length===0?<div className="notification-empty"><Bell size={22}/><p>No new updates</p></div>:notifications.map(n=><button key={n.id} className={'notification-item '+(!n.read?'unread':'')} onClick={()=>{const all=getNotifications().map(x=>x.id===n.id?{...x,read:true}:x);localStorage.setItem(NOTIFICATION_KEY,JSON.stringify(all));window.dispatchEvent(new Event('dentassure-notification-update'))}}><span className="notification-dot"/><div><b>{n.title}</b><p>{n.text}</p><small>{new Date(n.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div></button>)}</div></div>}</div><div className="profile-wrapper"><button type="button" className={'profile '+(showProfile?'profile-open':'')} onClick={()=>{setShowProfile(!showProfile);setShowNotifications(false)}}><div className="avatar">{role==='management'?<span>M</span>:profilePhoto?<img src={profilePhoto} alt={user.name}/>:<span>{user.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span>}</div><div className="profile-text"><b>{role==='management'?'Management':role==='hr'?'DentAssure HR':user.name}</b><small>{role==='management'?'Administrator':user.role}</small></div><ChevronDown size={15} className={showProfile?'profile-chevron-open':''}/></button>{showProfile&&<div className="profile-dropdown"><div className="profile-dropdown-head"><div className="profile-large-avatar">{role==='management'?<span>M</span>:profilePhoto?<img src={profilePhoto} alt={user.name}/>:<span>{user.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span>}</div><div><h2>{role==='management'?'Management':role==='hr'?'DentAssure HR':user.name}</h2><p>{role==='management'?'Administrator':user.role}</p></div></div>{role!=='management'&&role!=='accountant'&&<><div className="profile-details"><div><small>Employee ID</small><b>{user.code}</b></div><div><small>Department</small><b>{user.department}</b></div><div><small>Position</small><b>{user.role}</b></div><div><small>State</small><b>{employeeDetails?.state||'—'}</b></div><div><small>City</small><b>{employeeDetails?.city||'—'}</b></div><div><small>Verification</small><b className={getEmployeeVerification(user.code)==='verified'?'profile-active':'profile-pending'}>{getEmployeeVerification(user.code)==='verified'?'Completed':'Pending'}</b></div></div><label className="profile-photo-upload"><Camera size={16}/><span>{profilePhoto?'Change Profile Photo':'Upload Profile Photo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePhoto}/></label>{photoError&&<div className="profile-photo-error">{photoError}</div>}</>}<button type="button" className="profile-logout" onClick={onLogout}><LogOut size={16}/>Logout</button></div>}</div></div></header>}

function Stat({icon,label,value,type}){return <div className="stat"><div className={'stat-icon '+type}>{icon}</div><strong>{value}</strong><span>{label}</span></div>}
function SectionHeader({title,sub,action}){return <div className="section-head"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function EmployeeDetailsManagement({employee,setToast}){
 const [details,setDetails]=useState(()=>getEmployeeDetails(employee.code));
 const [verification,setVerification]=useState(()=>getEmployeeVerification(employee.code));
 useEffect(()=>{const refresh=()=>{setDetails(getEmployeeDetails(employee.code));setVerification(getEmployeeVerification(employee.code))};window.addEventListener('dentassure-profile-update',refresh);return()=>window.removeEventListener('dentassure-profile-update',refresh)},[employee.code]);
 if(!details)return <div className="card employee-details-admin"><div className="card-title"><h3>{employee.name} — Employee Details</h3><span>Not submitted</span></div><p className="muted">The employee has not submitted their profile and salary details yet.</p></div>;
 const rows=[['Employee Name',details.employeeName],['Employee Code',details.employeeCode],['Designation',details.designation],['Department',details.department],['Bank Name',details.bankName],['Bank Account No',details.bankAccount],['Provident Fund No',details.pfNo],['UAN',details.uan],['PAN',details.pan],['Aadhaar Number',details.aadhaarNumber],['10th SSC Number',details.tenthSscNumber],['Intermediate/Diploma Reg. No',details.interDiplomaRegNo],['Higher Education Qualification',details.higherEducation],['State',details.state],['City',details.city],['Monthly Salary',details.monthlySalary]];
 const approve=()=>{setEmployeeVerification(employee.code,'verified');setVerification('verified');setToast(`${employee.name} verification completed`)};
 return <div className="card employee-details-admin"><div className="card-title"><div><h3>{employee.name} — Employee Details</h3><span>{employee.code}</span></div><span className={'status '+(verification==='verified'?'green':'yellow')}>{verification==='verified'?'Verification Completed':'Verification Pending'}</span></div><div className="admin-details-grid">{rows.map(([label,value])=><div key={label}><small>{label}</small><b>{String(value??'').trim()||'—'}</b></div>)}</div><div className="admin-doc-grid"><div><small>Aadhaar Document</small>{details.aadhaarDocument?<a href={details.aadhaarDocument.data} download={details.aadhaarDocument.name}>View / Download</a>:<b>—</b>}</div><div><small>PAN Document</small>{details.panDocument?<a href={details.panDocument.data} download={details.panDocument.name}>View / Download</a>:<b>—</b>}</div><div><small>10th SSC Certificate</small>{details.tenthCertificate?<a href={details.tenthCertificate.data} download={details.tenthCertificate.name}>View / Download</a>:<b>—</b>}</div><div><small>Inter / Diploma Certificate</small>{details.interDiplomaCertificate?<a href={details.interDiplomaCertificate.data} download={details.interDiplomaCertificate.name}>View / Download</a>:<b>—</b>}</div></div>{verification!=='verified'&&<button className="primary" onClick={approve}><CheckCircle2 size={16}/> Accept &amp; Complete Verification</button>}</div>
}

const ADDON_STORE='dentassure360_addons_v1';
function readAddonStore(){try{return JSON.parse(localStorage.getItem(ADDON_STORE)||'{}')}catch{return {}}}
function writeAddonStore(data){localStorage.setItem(ADDON_STORE,JSON.stringify(data));window.dispatchEvent(new Event('dentassure-addon-update'))}
function AddonModule({section,role,user,setToast}){
 const config={
  wfh:{title:'Work From Home',subtitle:'Submit and review work-from-home requests.',fields:[['fromDate','From date','date'],['toDate','To date','date'],['reason','Reason','text']],columns:['Employee','Dates','Reason','Status'],kind:'WFH request'},
  recruitment:{title:'Recruitment Management',subtitle:'Track manpower requests, job openings and candidate applications.',fields:[['position','Position','text'],['department','Department','text'],['candidate','Candidate name','text'],['email','Candidate email','email'],['stage','Stage','select']],columns:['Position','Department','Candidate','Email','Stage'],kind:'Recruitment record'},
  documents:{title:'Documents & Verification',subtitle:'Track employee document verification. Do not upload sensitive files to this local prototype.',fields:[['employee','Employee name','text'],['documentType','Document type','text'],['notes','Review notes','text'],['status','Status','select']],columns:['Employee','Document type','Review notes','Status'],kind:'Document review'},
  biometric:{title:'Biometric Integration',subtitle:'Monitor Secureye / ONtime integration readiness. This page does not connect to the device by itself.',fields:[['device','Device name','text'],['lastEvent','Last event reference','text'],['status','Integration status','select'],['notes','Notes','text']],columns:['Device name','Last event reference','Status','Notes'],kind:'Integration record'},
  notifications:{title:'Notifications',subtitle:'View and track local portal updates.',fields:[['title','Title','text'],['message','Message','text'],['status','Status','select']],columns:['Title','Message','Status'],kind:'Notification'},
  audit:{title:'Audit Logs',subtitle:'Record important prototype actions for review.',fields:[['actor','Actor','text'],['action','Action','text'],['details','Details','text']],columns:['Actor','Action','Details'],kind:'Audit record'},
  tasks:{title:'Task Management',subtitle:'Create tasks and track submission status.',fields:[['title','Task title','text'],['assignee','Assigned to','text'],['dueDate','Due date','date'],['status','Status','select']],columns:['Task title','Assigned to','Due date','Status'],kind:'Task'},
  projects:{title:'Projects',subtitle:'Track projects and owners.',fields:[['title','Project name','text'],['owner','Project owner','text'],['dueDate','Target date','date'],['status','Status','select']],columns:['Project name','Project owner','Target date','Status'],kind:'Project'},
  activity:{title:'Activity & Updates',subtitle:'Review recent activity in your portal.',fields:[['title','Activity title','text'],['message','Details','text']],columns:['Activity title','Details'],kind:'Activity'}
 };
 const c=config[section]; const [items,setItems]=useState(()=>readAddonStore()[section]||[]); const [form,setForm]=useState({}); const [search,setSearch]=useState('');
 useEffect(()=>{const refresh=()=>setItems(readAddonStore()[section]||[]);window.addEventListener('dentassure-addon-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('dentassure-addon-update',refresh);window.removeEventListener('storage',refresh)}},[section]);
 if(!c)return <><SectionHeader title="Module" sub="This module is not configured yet."/><div className="card"><p>Choose a module from the navigation menu.</p></div></>;
 const selectOptions={stage:['Applied','Screening','Interview','Selected','Rejected'],status:section==='wfh'?['Pending','Approved','Rejected']:section==='biometric'?['Not configured','Connected','Warning','Offline']:section==='documents'?['Pending','Verified','Rejected']:section==='notifications'?['Unread','Read']:['To Do','In Progress','Submitted','Under Review','Completed','Returned']};
 const save=e=>{e.preventDefault();const data=readAddonStore();const record={...form,id:Date.now(),createdAt:new Date().toISOString(),createdBy:user?.name||role||'User',employeeCode:user?.code||''};if(section==='wfh')record.status='Pending';else if(section==='documents')record.status=form.status||'Pending';else if(section==='biometric')record.status=form.status||'Not configured';else if(section==='notifications')record.status=form.status||'Unread';else if(section==='tasks'||section==='projects')record.status=form.status||'To Do';const next=[record,...(data[section]||[])];data[section]=next;writeAddonStore(data);setItems(next);setForm({});setToast(`${c.kind} saved`)};
 const updateStatus=(item,status)=>{const data=readAddonStore();const next=(data[section]||[]).map(x=>x.id===item.id?{...x,status,updatedAt:new Date().toISOString()}:x);data[section]=next;writeAddonStore(data);setItems(next);setToast(`Status updated to ${status}`)};
 const filtered=items.filter(item=>Object.values(item).join(' ').toLowerCase().includes(search.toLowerCase()));
 return <><SectionHeader title={c.title} sub={c.subtitle}/><div className="addon-layout"><div className="card addon-form-card"><div className="card-title"><h3>{section==='wfh'?'New WFH Request':`Add ${c.kind}`}</h3><span>{role==='management'?'Management':'Employee'} view</span></div><form className="addon-form" onSubmit={save}>{c.fields.map(([key,label,type])=><label key={key}>{label}{type==='select'?<select value={form[key]||''} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} required><option value="">Select {label.toLowerCase()}</option>{(selectOptions[key]||[]).map(v=><option key={v}>{v}</option>)}</select>:<input type={type} value={form[key]||''} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} required/>}</label>)}<button className="primary" type="submit"><Plus size={16}/> Save {c.kind}</button></form></div><div className="card addon-list-card"><div className="card-title"><h3>{c.title} Records</h3><span>{items.length} records</span></div><div className="toolbar"><div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..."/></div></div>{filtered.length===0?<div className="empty-state"><FileText size={24}/><b>No records yet</b><p>Records added in this prototype are saved in this browser only.</p></div>:<div className="table-wrap"><table><thead><tr>{c.columns.map(col=><th key={col}>{col}</th>)}{role==='management'&&<th>Action</th>}</tr></thead><tbody>{filtered.map(item=><tr key={item.id}>{c.fields.map(([key,label])=><td key={key}>{item[key]||'—'}</td>)}{role==='management'&&<td>{(section==='wfh'||section==='documents'||section==='biometric'||section==='tasks'||section==='projects')&&<select value={item.status||'Pending'} onChange={e=>updateStatus(item,e.target.value)} aria-label="Update status">{(selectOptions.status||['Pending','Approved','Rejected']).map(v=><option key={v}>{v}</option>)}</select>}</td>}</tr>)}</tbody></table></div>}</div></div><div className="addon-note"><b>Prototype limitation:</b> These records use browser localStorage. They are not shared across computers and are not a production backend. Connect the module to authenticated Node.js API endpoints and MySQL before using real employee, payroll, recruitment or biometric data.</div></>;
}

function HRDashboard({setSection}){
 const attendance=getAttendanceRecords();
 const leaves=getLeaveRequests();
 const today=new Date().toISOString().slice(0,10);
 const present=attendance.filter(r=>r.date===today&&r.status==='Present').length;
 const pendingLeaves=leaves.filter(r=>r.status==='Pending').length;
 const pendingVerification=employees.filter(e=>getEmployeeDetails(e.code)&&getEmployeeVerification(e.code)!=='verified').length;
 const recruitmentCount=(()=>{try{return JSON.parse(localStorage.getItem('dentassure_recruitment_v1')||'[]').length}catch{return 0}})();
 const cards=[['employees','Employee Records',employees.length,'Manage employee profiles and verification.',Users],['attendance','Present Today',present,'Review today’s attendance and working hours.',Clock3],['leave','Pending Leave Requests',pendingLeaves,'Review and update leave requests.',CalendarDays],['recruitment','Recruitment Records',recruitmentCount,'Track hiring requests and candidates.',BriefcaseBusiness],['documents','Pending Verification',pendingVerification,'Review employee documents and profile details.',FileText],['reports','HR Reports',leaves.length,'Open workforce and attendance reports.',BarChart3]];
 return <><SectionHeader title={<>Human Resources <span>Dashboard</span></>} sub="Employee records, attendance, leave, recruitment and verification overview."/><div className="stats"><Stat icon={<Users size={20}/>} value={employees.length} label="Total Employees" type="pink"/><Stat icon={<Clock3 size={20}/>} value={present} label="Present Today" type="teal"/><Stat icon={<CalendarDays size={20}/>} value={pendingLeaves} label="Pending Leave Requests" type="yellow"/><Stat icon={<FileText size={20}/>} value={pendingVerification} label="Pending Verification" type="teal"/></div><div className="employee-grid">{cards.map(([id,title,value,description,Icon])=><button className="employee-card" key={id} onClick={()=>setSection(id)}><div className="big-avatar"><Icon size={22}/></div><b>{title}</b><strong>{value}</strong><small>{description}</small></button>)}</div><div className="addon-note"><b>HR access:</b> This dashboard focuses on employee administration and people operations. Salary processing remains restricted to the Accountant workspace.</div></>;
}

function Management({section,setToast}){
 const [selected,setSelected]=useState(employees[0]);
 const [viewEmployee,setViewEmployee]=useState(null);
 const [tasks,setTasks]=useState(initialTasks);
 const [search,setSearch]=useState('');
 const [attendance,setAttendance]=useState(()=>getAttendanceRecords());
 const [leaves,setLeaves]=useState(()=>getLeaveRequests());
 useEffect(()=>{const a=()=>setAttendance(getAttendanceRecords());const l=()=>setLeaves(getLeaveRequests());window.addEventListener('dentassure-attendance-update',a);window.addEventListener('dentassure-leave-update',l);return()=>{window.removeEventListener('dentassure-attendance-update',a);window.removeEventListener('dentassure-leave-update',l)}},[]);
 const filtered=employees.filter(e=>(e.name+e.department+e.code).toLowerCase().includes(search.toLowerCase()));
  // Conditional returns are placed after hooks to follow React's Rules of Hooks.
  if(section==='recruitment') return <RecruitmentManagement />;
  if(['wfh','documents','biometric','notifications','audit','tasks','projects','activity'].includes(section)) {
    return <AddonModule section={section} role="management" user={{name:'Management',code:'MGMT'}} setToast={setToast}/>;
  }

 if(section==='employees')return <>
  <SectionHeader title="Employees Management" sub="View employee details and verify submitted profile information."/>
  <div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search employees..." value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="primary" onClick={()=>setToast('Add employee module opened')}><Plus size={16}/> New Employee</button></div>
  <div className="card table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Verification</th><th>Tasks</th><th>Projects</th><th>Action</th></tr></thead><tbody>{filtered.map(e=>{const d=getEmployeeDetails(e.code);const v=d?getEmployeeVerification(e.code):'not_submitted';return <tr key={e.id}><td><div className="person"><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{e.name}</b><small>{e.code}</small></div></div></td><td>{e.role}</td><td>{e.department}</td><td><span className={'status '+(v==='verified'?'green':v==='pending'?'yellow':'gray')}>{v==='verified'?'Verification Completed':v==='pending'?'Verification Pending':'Details Not Submitted'}</span></td><td>{e.tasks}</td><td>{e.projects}</td><td><button className="view-btn" onClick={()=>setViewEmployee(e)}>View</button></td></tr>})}</tbody></table></div>
  {viewEmployee&&<EmployeeDetailsManagement employee={viewEmployee} setToast={setToast}/>} 
 </>;
 if(section==='attendance'){
  const today=new Date().toISOString().slice(0,10);
  return <><SectionHeader title="Attendance & Working Hours" sub="Monitor daily check-in, check-out and active working hours."/><div className="card attendance-management"><div className="card-title"><h3>Today's Attendance</h3><span>{new Date().toLocaleDateString()}</span></div><div className="attendance-admin-table"><div className="attendance-admin-head"><span>Employee</span><span>Check-in</span><span>Arrival</span><span>Check-out</span><span>Logout</span><span>Working Hours</span><span>Status</span></div>{employees.map(e=>{const r=attendance.find(x=>x.code===e.code&&x.date===today);const arrival=r?.checkIn?arrivalIndicator(r.checkIn):{label:'—',tone:'gray'};const logout=r?.checkOut?logoutIndicator(r.checkOut):{label:r?.checkIn?'Working':'—',tone:r?.checkIn?'teal':'gray'};return <div className="attendance-admin-row" key={e.code}><div className="person"><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{e.name}</b><small>{e.code}</small></div></div><span>{r?.checkIn||'—'}</span><span className={'attendance-indicator '+arrival.tone}>{arrival.label}</span><span>{r?.checkOut||'—'}</span><span className={'attendance-indicator '+logout.tone}>{logout.label}</span><b>{r?.workingHours||'—'}</b><span className={'status '+(r?.status==='Present'?'green':'gray')}>{r?.status||'Not Checked In'}</span></div>})}</div></div></>;
 }
 if(section==='leave'){
  const updateLeave=(id,status)=>{const list=getLeaveRequests().map(x=>x.id===id?{...x,status,updatedAt:new Date().toISOString()}:x);saveLeaveRequests(list);setToast(`Leave request ${status.toLowerCase()}`)};
  return <><SectionHeader title="Leave Management" sub="Review employee leave requests and record approval status."/><div className="card leave-management"><div className="card-title"><h3>Leave Requests</h3><span>{leaves.length} request{leaves.length===1?'':'s'}</span></div>{leaves.length===0?<div className="empty-state"><CalendarDays size={28}/><b>No leave requests</b><p>Employee leave requests will appear here.</p></div>:<div className="leave-admin-list">{leaves.map(l=><div className="leave-admin-row" key={l.id}><div><b>{l.employeeName}</b><small>{l.employeeCode} • {l.leaveType}</small></div><div><span>{l.fromDate} to {l.toDate}</span><small>{l.reason}</small></div><span className={'status '+(l.status==='Approved'?'green':l.status==='Rejected'?'red':'yellow')}>{l.status}</span>{l.status==='Pending'&&<div className="leave-actions"><button className="approve-btn" onClick={()=>updateLeave(l.id,'Approved')}>Approve</button><button className="reject-btn" onClick={()=>updateLeave(l.id,'Rejected')}>Reject</button></div>}</div>)}</div>}</div></>;
 }
 if(section==='reports'){
  const attendance=getAttendanceRecords();
  const leaves=getLeaveRequests();
  const today=new Date().toISOString().slice(0,10);
  const todayAttendance=attendance.filter(x=>x.date===today);
  const present=todayAttendance.filter(x=>x.status==='Present').length;
  const currentlyWorking=todayAttendance.filter(x=>x.checkIn && !x.checkOut).length;
  const pendingLeaves=leaves.filter(x=>x.status==='Pending').length;
  const approvedLeaves=leaves.filter(x=>x.status==='Approved').length;
  const rejectedLeaves=leaves.filter(x=>x.status==='Rejected').length;
  const completedTasks=tasks.filter(x=>x.status==='Completed'||x.progress===100).length;
  const parseHours=value=>{if(!value||value==='Active'||value==='—')return 0;const h=String(value).match(/(\d+)h/);const m=String(value).match(/(\d+)m/);return (h?Number(h[1]):0)+(m?Number(m[1]):0)/60};
  const overallHours=attendance.reduce((sum,r)=>sum+parseHours(r.workingHours),0);
  return <>
   <SectionHeader title="Employee Reports" sub="Overall employee report covering attendance, working hours, leave, tasks and projects."/>
   <div className="stats">
    <Stat icon="👥" value={employees.length} label="Total Employees" type="pink"/>
    <Stat icon="✓" value={present} label="Present Today" type="teal"/>
    <Stat icon="⏱" value={currentlyWorking} label="Currently Working" type="yellow"/>
    <Stat icon="📅" value={pendingLeaves} label="Pending Leaves" type="teal"/>
   </div>
   <div className="card report-summary"><div className="card-title"><h3>Overall Employee Report</h3><span>All available records</span></div>
    <div className="table-wrap report-table-wrap"><table><thead><tr><th>Employee</th><th>Attendance Records</th><th>Late Arrivals</th><th>Early Logouts</th><th>Working Hours</th><th>Leave Requests</th><th>Approved Leave</th><th>Tasks</th><th>Projects</th></tr></thead><tbody>{employees.map(e=>{
      const records=attendance.filter(x=>x.code===e.code);
      const empLeaves=leaves.filter(x=>x.employeeCode===e.code);
      const hours=records.reduce((sum,r)=>sum+parseHours(r.workingHours),0);
      const h=Math.floor(hours), m=Math.round((hours-h)*60);
      return <tr key={e.code}><td><div className="person"><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{e.name}</b><small>{e.code} • {e.department}</small></div></div></td><td>{records.length}</td><td>{records.filter(r=>arrivalIndicator(r.checkIn).tone==='yellow').length}</td><td>{records.filter(r=>logoutIndicator(r.checkOut).tone==='orange').length}</td><td>{records.length?(h+'h '+m+'m'):'—'}</td><td>{empLeaves.length}</td><td>{empLeaves.filter(x=>x.status==='Approved').length}</td><td>{e.tasks}</td><td>{e.projects}</td></tr>})}</tbody></table></div>
   </div>
   <div className="report-grid">
    <div className="card report-summary"><div className="card-title"><h3>Today's Attendance & Working Hours</h3><span>{today}</span></div>{employees.map(e=>{const r=todayAttendance.find(x=>x.code===e.code);return <div className="report-employee-row" key={e.code}><div className="person"><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{e.name}</b><small>{e.code}</small></div></div><div className="report-metric"><small>Check-in</small><b>{r?.checkIn||'—'}</b>{r?.checkIn&&<span className={'attendance-indicator '+arrivalIndicator(r.checkIn).tone}>{arrivalIndicator(r.checkIn).label}</span>}</div><div className="report-metric"><small>Check-out</small><b>{r?.checkOut||'—'}</b>{r?.checkOut&&<span className={'attendance-indicator '+logoutIndicator(r.checkOut).tone}>{logoutIndicator(r.checkOut).label}</span>}</div><div className="report-metric"><small>Working Hours</small><b>{r?.workingHours||'—'}</b></div><span className={'status '+(r?.status==='Present'?'green':'gray')}>{r?.status||'Not Checked In'}</span></div>})}</div>
    <div className="card report-summary"><div className="card-title"><h3>Leave Overview</h3><span>{leaves.length} requests</span></div><div className="report-stat-list"><div><span>Pending</span><b>{pendingLeaves}</b></div><div><span>Approved</span><b>{approvedLeaves}</b></div><div><span>Rejected</span><b>{rejectedLeaves}</b></div></div>{leaves.length===0?<div className="empty-state"><CalendarDays size={24}/><p>No leave requests yet.</p></div>:<div className="report-leave-list">{leaves.slice(0,8).map(l=><div key={l.id}><div><b>{l.employeeName}</b><small>{l.leaveType} • {l.fromDate} to {l.toDate}</small></div><span className={'status '+(l.status==='Approved'?'green':l.status==='Rejected'?'red':'yellow')}>{l.status}</span></div>)}</div>}</div>
   </div>
   <div className="card report-summary"><div className="card-title"><h3>Work Summary</h3><span>Current portal data</span></div><div className="report-progress-grid"><div><small>Total Tasks</small><strong>{tasks.length}</strong><span>{completedTasks} completed</span></div><div><small>Active Tasks</small><strong>{tasks.length-completedTasks}</strong><span>In progress / to do</span></div><div><small>Total Projects</small><strong>{projects.length}</strong><span>{projects.filter(p=>p.status==='In Progress').length} active</span></div><div><small>Total Working Hours</small><strong>{Math.floor(overallHours)}h</strong><span>{Math.round((overallHours-Math.floor(overallHours))*60)}m recorded</span></div></div></div>
  </>;
 }
 if(section==='workspace')return <><SectionHeader title="Employee Workspace" sub="Open an employee workspace and review current work."/><div className="employee-grid">{employees.map(e=><button className={'employee-card '+(selected.id===e.id?'selected':'')} onClick={()=>setSelected(e)} key={e.id}><div className="big-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><b>{e.name}</b><span>{e.role}</span><small>{e.tasks} tasks • {e.projects} projects</small></button>)}</div><div className="card workspace-detail"><div className="detail-head"><div className="big-avatar">{selected.name.split(' ').map(x=>x[0]).join('')}</div><div><h2>{selected.name}</h2><p>{selected.code} • {selected.department}</p></div></div><div className="quick-actions"><button onClick={()=>setToast('Task assignment opened')}>🎯 Assign Task</button><button onClick={()=>setToast('Project assignment opened')}>📁 Assign Project</button><button onClick={()=>setToast('File upload opened')}>📎 Upload File</button></div></div></>;
 if(section==='tasks')return <><SectionHeader title="Task Management" sub="Assign, track and update staff tasks." action={<button className="primary" onClick={()=>setToast('New task form opened')}><Plus size={16}/> New Task</button>}/><div className="task-grid">{tasks.map(t=><div className="card task-card" key={t.id}><div className="task-top"><span className={'priority '+t.priority.toLowerCase()}>{t.priority}</span><span>{t.status}</span></div><h3>{t.title}</h3><p>{t.description}</p><small>Assigned to {t.employee}</small><div className="progress"><i style={{width:t.progress+'%'}}/></div><div className="task-bottom"><b>{t.progress}%</b><button onClick={()=>{setTasks(tasks.map(x=>x.id===t.id?{...x,progress:100,status:'Completed'}:x));setToast('Task updated')}}>Mark complete</button></div></div>)}</div></>;
 if(section==='projects')return <><SectionHeader title="Project Management" sub="Track active DentAssure projects." action={<button className="primary" onClick={()=>setToast('New project form opened')}><Plus size={16}/> New Project</button>}/><div className="project-grid">{projects.map(p=><div className="card project-card" key={p.id}><div className="project-icon"><FolderKanban size={20}/></div><div><small>{p.id}</small><h3>{p.name}</h3></div><span className="status green">{p.status}</span><div className="progress"><i style={{width:p.progress+'%'}}/></div><b>{p.progress}% complete</b></div>)}</div></>;
 if(section==='chat')return <TeamChat currentUserKey="management" setToast={setToast}/>;
 if(section==='salary')return <Salary management/>;
 if(section==='settings')return <><SectionHeader title="Settings" sub="Portal preferences and security controls."/><div className="card settings"><label>Office network access</label><div className="setting-row"><span>Require office Wi-Fi</span><input type="checkbox" defaultChecked/></div><div className="setting-row"><span>Desktop notifications</span><input type="checkbox" defaultChecked/></div></div></>;
 return <><SectionHeader title={<>Management <span>Dashboard</span></>} sub="Welcome back. Here's your management overview."/><div className="stats"><Stat icon="👥" value={employees.length} label="Total Employees" type="pink"/><Stat icon="✓" value="3" label="Present Today" type="teal"/><Stat icon="🎯" value="18" label="Active Tasks" type="yellow"/><Stat icon="📁" value="7" label="Active Projects" type="teal"/></div><div className="two-col"><div className="card"><div className="card-title"><h3>Employee Activity</h3><span>Today's status</span></div>{employees.map(e=><div className="activity-row" key={e.id}><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{e.name}</b><small>{e.department}</small></div><span className={'status '+(e.status==='Present'?'green':'gray')}>{e.status}</span></div>)}</div><div className="card"><div className="card-title"><h3>Quick Actions</h3><span>Staff Actions</span></div><div className="quick-list"><button onClick={()=>setToast('Task assignment opened')}>🎯 Assign Task <small>Give work to staff</small></button><button onClick={()=>setToast('New project opened')}>📁 New Project <small>Create project</small></button><button onClick={()=>setToast('Workspace opened')}>🧩 Workspace <small>Open employee work</small></button><button onClick={()=>setToast('Team chat opened')}>💬 Team Chat <small>Talk to staff</small></button></div></div></div></>}

function Staff({section,setToast,user,employeeDetails}){
 if(['wfh','tasks','notifications','activity'].includes(section))return <AddonModule section={section} role="staff" user={user} setToast={setToast}/>;
 const currentUserKey=userKeyFromUser(user);
 const userTasks=initialTasks.map(t=>({...t,employee:user.name}));
 const [checkedIn,setCheckedIn]=useState(()=>localStorage.getItem(`dentassure_checked_in_${user.code}`)==='true');
 const [checkInTime,setCheckInTime]=useState(()=>localStorage.getItem(`dentassure_checkin_time_${user.code}`)||'');
 const [clock,setClock]=useState(new Date());
 const [leaveType,setLeaveType]=useState('Casual Leave');
 const [fromDate,setFromDate]=useState('');
 const [toDate,setToDate]=useState('');
 const [reason,setReason]=useState('');
 const [leaveRefresh,setLeaveRefresh]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{const refresh=()=>setLeaveRefresh(x=>x+1);window.addEventListener('dentassure-leave-update',refresh);return()=>window.removeEventListener('dentassure-leave-update',refresh)},[]);
 const toggleAttendance=()=>{const today=new Date().toISOString().slice(0,10);const records=getAttendanceRecords();const existing=records.find(x=>x.code===user.code&&x.date===today);if(checkedIn){const now=new Date();const start=existing?.checkInTimestamp?new Date(existing.checkInTimestamp):null;const hours=start?((now-start)/3600000):0;const updated=records.map(x=>x.code===user.code&&x.date===today?{...x,checkOut:now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),checkOutTimestamp:now.toISOString(),workingHours:hours?`${Math.floor(hours)}h ${Math.floor((hours%1)*60)}m`:'—',status:'Present',logoutStatus:logoutIndicator(now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})).label,earlyLogoutMinutes:logoutIndicator(now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})).minutes}:x);saveAttendanceRecords(updated);localStorage.removeItem(`dentassure_checked_in_${user.code}`);localStorage.removeItem(`dentassure_checkin_time_${user.code}`);setCheckedIn(false);setCheckInTime('');addNotification('management','Attendance update',`${user.name} checked out`);setToast('Checked out successfully.')}else{const now=new Date();const record={code:user.code,employeeName:user.name,date:today,checkIn:now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),checkInTimestamp:now.toISOString(),checkOut:'',workingHours:'Active',status:'Present',arrivalStatus:arrivalIndicator(now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})).label,lateMinutes:arrivalIndicator(now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})).minutes};saveAttendanceRecords([...records.filter(x=>!(x.code===user.code&&x.date===today)),record]);localStorage.setItem(`dentassure_checked_in_${user.code}`,'true');localStorage.setItem(`dentassure_checkin_time_${user.code}`,record.checkIn);setCheckedIn(true);setCheckInTime(record.checkIn);addNotification('management','Attendance update',`${user.name} checked in at ${record.checkIn}`);setToast('Checked in successfully.')}};
if(section==='attendance')return <><SectionHeader title="Attendance" sub="Manage your daily office work session."/><div className="attendance card"><div className="attendance-icon"><Clock3 size={30}/></div><div><span className="eyebrow">CURRENT STATUS</span><h2>{checkedIn?'CHECKED IN':'CHECKED OUT'}</h2><p>{checkedIn?'Office Wi-Fi connected • Work session started.':'Work session closed successfully.'}</p></div><div className="clock">{clock.toLocaleTimeString()}</div><button className="primary" onClick={toggleAttendance}>{checkedIn?'CHECK OUT':'CHECK IN'}</button></div></>;
if(section==='leave'){
 const myLeaves=getLeaveRequests().filter(x=>x.employeeCode===user.code);
 const submitLeave=e=>{e.preventDefault();if(!fromDate||!toDate||!reason.trim()){setToast('Please complete the leave request');return}const list=getLeaveRequests();list.unshift({id:Date.now(),employeeCode:user.code,employeeName:user.name,leaveType,fromDate,toDate,reason:reason.trim(),status:'Pending',createdAt:new Date().toISOString()});saveLeaveRequests(list);addNotification('management','New leave request',`${user.name} requested ${leaveType} from ${fromDate} to ${toDate}`);setFromDate('');setToDate('');setReason('');setLeaveRefresh(x=>x+1);setToast('Leave request submitted')};
 return <><SectionHeader title="Leave Management" sub="Submit leave requests and track their approval status."/><div className="leave-grid"><div className="card leave-request-card"><div className="card-title"><h3>Request Leave</h3><span>Submit for Management approval</span></div><form onSubmit={submitLeave} className="leave-form"><label>Leave Type<select value={leaveType} onChange={e=>setLeaveType(e.target.value)}><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Permission</option></select></label><div className="leave-date-row"><label>From Date<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} required/></label><label>To Date<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} required/></label></div><label>Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Enter reason for leave" rows="4" required/></label><button className="primary" type="submit"><CalendarDays size={16}/> Submit Leave Request</button></form></div><div className="card leave-history-card"><div className="card-title"><h3>My Leave Requests</h3><span>{myLeaves.length}</span></div>{myLeaves.length===0?<div className="empty-state"><CalendarDays size={24}/><p>No leave requests submitted.</p></div>:<div className="leave-history-list">{myLeaves.map(l=><div className="leave-history-row" key={l.id}><div><b>{l.leaveType}</b><small>{l.fromDate} to {l.toDate}</small></div><span className={'status '+(l.status==='Approved'?'green':l.status==='Rejected'?'red':'yellow')}>{l.status}</span></div>)}</div>}</div></div></>;
 }
if(section==='workspace')return <><SectionHeader title="My Workspace" sub="Your current tasks and projects."/><div className="stats"><Stat icon="🎯" value="3" label="My Tasks" type="pink"/><Stat icon="📁" value="2" label="My Projects" type="teal"/></div><div className="task-grid">{userTasks.map(t=><div className="card task-card" key={t.id}><div className="task-top"><span className={'priority '+t.priority.toLowerCase()}>{t.priority}</span><span>{t.status}</span></div><h3>{t.title}</h3><p>{t.description}</p><div className="progress"><i style={{width:t.progress+'%'}}/></div><b>{t.progress}% complete</b></div>)}</div></>;
if(section==='chat')return <TeamChat currentUserKey={currentUserKey} setToast={setToast}/>;
if(section==='files')return <><SectionHeader title="Files & Documents" sub="Documents assigned by management."/><div className="card file-list">{files.map(f=><div className="file-row" key={f.name}><div className="file-icon"><FileText size={20}/></div><div><b>{f.name} {f.new&&<span className="new">NEW</span>}</b><small>{f.date} • {f.size} • Uploaded by Management</small></div><span className="file-project">{f.project}</span><button onClick={()=>setToast('File opened')}>OPEN</button></div>)}</div></>;
if(section==='profile')return <MyProfile user={user} details={employeeDetails}/>;
if(section==='activity')return <><SectionHeader title="Activity & Updates" sub="Recent activity from your workspace."/><div className="card"><div className="activity-row"><div className="activity-icon">📎</div><div><b>New file uploaded by Management</b><small>Employee Portal Requirements</small></div></div><div className="activity-row"><div className="activity-icon">💬</div><div><b>New Team Chat message</b><small>Management sent you a message</small></div></div></div></>;
if(section==='salary')return <Salary user={user} details={employeeDetails}/>;return <><SectionHeader title={<>Welcome, <span>{user.name} 👋</span></>} sub="Here is your work overview for today."/><div className="stats"><Stat icon="✓" value={checkedIn?'CHECKED IN':'CHECKED OUT'} label="Attendance" type="teal"/><Stat icon="🎯" value="3" label="My Tasks" type="pink"/><Stat icon="📁" value="2" label="My Projects" type="yellow"/><Stat icon="📎" value="3" label="My Files" type="teal"/></div><div className="two-col"><div className="card"><div className="card-title"><h3>Today's Attendance</h3><span>{clock.toLocaleDateString()}</span></div><div className="attendance-mini"><div><b>{checkedIn?(checkInTime||'—'):'—'}</b><small>Check-in time</small></div><button className="primary" onClick={toggleAttendance}>{checkedIn?'CHECK OUT':'CHECK IN'}</button></div></div><div className="card"><div className="card-title"><h3>Recent Activity</h3><span>Updates</span></div><div className="activity-row"><div className="activity-icon">📎</div><div><b>New file uploaded</b><small>Employee Portal Requirements</small></div></div><div className="activity-row"><div className="activity-icon">💬</div><div><b>New chat message</b><small>Management sent you a message</small></div></div></div></div></>}

function TeamChat({currentUserKey,setToast}){
 const currentUser=getUserByKey(currentUserKey);
 const contacts=getOtherUsers(currentUserKey);
 const [selectedUserKey,setSelectedUserKey]=useState(()=>contacts[0]?.key||null);
 const [messages,setMessages]=useState(()=>contacts[0]?getConversationMessages(currentUserKey,contacts[0].key):[]);
 const [message,setMessage]=useState('');
 const [typing,setTyping]=useState(false);
 const [showEmoji,setShowEmoji]=useState(false);
 const [attached,setAttached]=useState(null);
 const [reaction,setReaction]=useState(null);
 const messageEnd=React.useRef(null);
 const fileInput=React.useRef(null);
 const emojis=['😊','👍','❤️','🎉','👏','🔥','✅','😂','😍','🚀','💯','🙏'];
 const selectedUser=contacts.find(u=>u.key===selectedUserKey);
 const initials=name=>name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
 const refresh=()=>setMessages(selectedUserKey?getConversationMessages(currentUserKey,selectedUserKey):[]);
 useEffect(()=>{refresh()},[currentUserKey,selectedUserKey]);
 useEffect(()=>{const r=()=>refresh();window.addEventListener('dentassure-chat-update',r);window.addEventListener('storage',r);return()=>{window.removeEventListener('dentassure-chat-update',r);window.removeEventListener('storage',r)}},[currentUserKey,selectedUserKey]);
 useEffect(()=>{messageEnd.current?.scrollIntoView({behavior:'smooth'})},[messages,typing]);
 const selectContact=key=>{setSelectedUserKey(key);setMessage('');setAttached(null);setTyping(false)};
 const sendMessage=async()=>{if(!selectedUserKey||(!message.trim()&&!attached))return;let imageData=null;if(attached&&attached.type.startsWith('image/')){imageData=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(attached)})}const text=message.trim()||`Sent an attachment: ${attached?.name||'file'}`;addChatMessage(currentUserKey,selectedUserKey,text,attached?.name||null,imageData);setMessage('');setAttached(null);if(fileInput.current)fileInput.current.value='';setTyping(false);setShowEmoji(false);setToast(`Message sent to ${selectedUser.name}`);addNotification(selectedUserKey,`New message from ${currentUser.name}`,text)};
 return <>
 <SectionHeader title={<>Team <span>Chat</span></>} sub="Chat privately with any member of the DentAssure team."/>
 <div className="chat-shell workspace-chat-shell">
  <aside className="chat-users workspace-chat-users">
   <div className="chat-users-top"><div><b>Team Members</b><small>{contacts.length} available</small></div><div className="team-status-dot"/></div>
   <div className="chat-user-list">
    {contacts.map(contact=>{const conv=getConversationMessages(currentUserKey,contact.key);const last=conv[conv.length-1];return <button key={contact.key} className={'chat-user '+(selectedUserKey===contact.key?'active':'')} onClick={()=>selectContact(contact.key)}>
      <div className="avatar-wrap"><div className="mini-avatar">{contact.key==='management'?'MG':initials(contact.name)}</div><span className="presence online"/></div>
      <div className="chat-user-copy"><b>{contact.name}</b><small>{last?last.text:contact.role}</small></div>
     </button>})}
   </div>
   <div className="team-chat-note"><MessageCircle size={15}/><span>Select any team member to start a private conversation.</span></div>
  </aside>
  <section className="chat-main enhanced-chat">
   {selectedUser?<><header className="chat-head enhanced-head"><div className="avatar-wrap"><div className="mini-avatar">{selectedUser.key==='management'?'MG':initials(selectedUser.name)}</div><span className="presence online"/></div><div className="chat-head-copy"><b>{selectedUser.name}</b><small><span className="live-dot"/>{selectedUser.role}</small></div><div className="chat-head-actions"><button className="chat-icon-btn"><MessageCircle size={17}/></button></div></header>
   <div className="chat-banner"><span>💬</span><div><b>Private conversation</b><small>Only {currentUser.name} and {selectedUser.name} can see this conversation.</small></div></div>
   <div className="messages enhanced-messages">
    {messages.length===0&&<><div className="chat-welcome-animation"><div className="welcome-orb">{selectedUser.key==='management'?'MG':initials(selectedUser.name)}</div><b>Conversation with {selectedUser.name}</b><small>Send a message to start this conversation.</small></div><div className="day-divider"><span>Today</span></div></>}
    {messages.length>0&&<div className="day-divider"><span>Today</span></div>}
    {messages.map((m,i)=>{const outgoing=m.from===currentUserKey;const sender=getUserByKey(m.from);return <div className={'message-row '+(outgoing?'outgoing':'incoming')} key={m.id||i} style={{'--delay':`${Math.min(i,12)*45}ms`}}>
      {!outgoing&&<div className="message-avatar">{m.from==='management'?'MG':initials(sender?.name||m.from)}</div>}
      <div className="message-stack"><div className="chat-bubble"><div className="bubble-top"><span>{sender?.name||m.from}</span></div><p>{m.text}</p>{m.image&&<img className="chat-image" src={m.image} alt={m.file||'Shared image'} onClick={()=>window.open(m.image,'_blank','noopener,noreferrer')}/>} {m.file&&<div className="attachment-chip"><Paperclip size={13}/><span>{m.file}</span></div>}<div className="bubble-meta"><time>{m.time}</time>{outgoing&&<CheckCheck size={13}/>}</div></div><div className="reaction-row">{['👍','❤️','😊'].map(r=><button key={r} className={reaction===r?'selected':''} onClick={()=>setReaction(reaction===r?null:r)}>{r}</button>)}</div></div>
      {outgoing&&<div className="message-avatar self">{initials(currentUser.name)}</div>}
     </div>})}
    {typing&&<div className="typing-row"><div className="message-avatar">{initials(currentUser.name)}</div><div className="typing-bubble"><i/><i/><i/></div><span>typing…</span></div>}
    <div ref={messageEnd}/></div>
   <div className="composer-wrap">
    {showEmoji&&<div className="emoji-panel animated-panel">{emojis.map(e=><button key={e} onClick={()=>{setMessage(message+e);setShowEmoji(false)}}>{e}</button>)}</div>}
    {attached&&<div className="attachment-preview"><Paperclip size={14}/><span>{attached.name}</span><button onClick={()=>setAttached(null)}><X size={14}/></button></div>}
    <div className="composer enhanced-composer"><button className="chat-icon-btn" onClick={()=>fileInput.current?.click()}><Paperclip size={18}/></button><input ref={fileInput} type="file" hidden onChange={e=>setAttached(e.target.files?.[0]||null)}/><button className="chat-icon-btn" onClick={()=>setShowEmoji(!showEmoji)}><Smile size={18}/></button><input value={message} onChange={e=>{setMessage(e.target.value);setTyping(!!e.target.value.trim())}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder={`Message ${selectedUser.name}`}/><button className="chat-icon-btn voice"><Mic size={17}/></button><button className="send enhanced-send" onClick={sendMessage} disabled={!message.trim()&&!attached}><Send size={17}/></button></div>
    <div className="composer-hint"><span>Enter to send</span><span>•</span><span>Private conversation</span></div>
   </div></>:<div className="empty-chat"><MessageCircle size={42}/><h2>Select a team member</h2><p>Choose someone from the left to start chatting.</p></div>}
  </section>
 </div></>
}

function EmployeeDetailsGate({user,onComplete}){
 const existing=getEmployeeDetails(user.code);
 const blank={employeeName:user.name,employeeCode:user.code,designation:user.role,department:user.department,bankName:'',bankAccount:'',pfNo:'',uan:'',pan:'',aadhaarNumber:'',tenthSscNumber:'',interDiplomaRegNo:'',higherEducation:'',state:'',city:'',monthlySalary:'',incomeTax:'',aadhaarDocument:null,panDocument:null,tenthCertificate:null,interDiplomaCertificate:null};
 const [form,setForm]=useState(()=>({...blank,...(existing||{})}));
 const [error,setError]=useState('');
 const [uploading,setUploading]=useState(false);
 const fields=[['bankName','Bank Name'],['bankAccount','Bank Account No'],['pfNo','Provident Fund No'],['uan','UAN'],['pan','PAN Number'],['aadhaarNumber','Aadhaar Number'],['tenthSscNumber','10th SSC Number'],['interDiplomaRegNo','Inter / Diploma Registration Number'],['higherEducation','Higher Education Qualification'],['state','State'],['city','City'],['monthlySalary','Monthly Salary']];
 const requiredDocs=[['aadhaarDocument','Aadhaar Document'],['panDocument','PAN Document'],['tenthCertificate','10th SSC Certificate'],['interDiplomaCertificate','Inter / Diploma Certificate']];
 const readFile=(file,key)=>{if(!file)return; if(file.size>5*1024*1024){setError(`${key} must be 5 MB or smaller.`);return} setUploading(true);const reader=new FileReader();reader.onload=()=>{setForm(f=>({...f,[key]:{name:file.name,type:file.type,data:reader.result}}));setUploading(false);setError('')};reader.readAsDataURL(file)};
 const submit=e=>{e.preventDefault();const missing=fields.filter(([key])=>!String(form[key]??'').trim());const missingDocs=requiredDocs.filter(([key])=>!form[key]?.data);if(missing.length||missingDocs.length){const names=[...missing.map(x=>x[1]),...missingDocs.map(x=>x[1])];setError(`Please fill/upload: ${names.slice(0,4).join(', ')}${names.length>4?' and remaining required fields.':''}`);return}saveEmployeeDetails(form);onComplete(form)};
 const update=(key,value)=>setForm(f=>({...f,[key]:value}));
 return <div className="details-gate"><div className="details-modal details-modal-large"><div className="warning-icon">!</div><h2>Employee Details Required</h2><p>Complete your employee details and documents once. After saving, the details will remain in your profile and Management must verify them.</p><form onSubmit={submit}><div className="details-grid"><label>Employee Name<input value={form.employeeName} readOnly/></label><label>Employee Code<input value={form.employeeCode} readOnly/></label><label>Designation<input value={form.designation} readOnly/></label><label>Department<input value={form.department} readOnly/></label>{fields.map(([key,label])=><label key={key}>{label}<input type={key==='monthlySalary'||key==='incomeTax'?'number':'text'} value={form[key]??''} onChange={e=>update(key,e.target.value)} required/></label>)}</div><div className="document-upload-grid">{requiredDocs.map(([key,label])=><label className="document-upload" key={key}><span>{label}</span><input type="file" accept="application/pdf,image/*" onChange={e=>readFile(e.target.files?.[0],key)} required={!form[key]?.data}/>{form[key]?.name&&<small>✓ {form[key].name}</small>}</label>)}</div>{error&&<div className="details-error">{error}</div>}<button className="primary wide" type="submit" disabled={uploading}><CheckCircle2 size={17}/>{uploading?'Reading document…':'Save Details & Continue'}</button></form></div></div>
}
function MyProfile({user,details}){
 const verification=getEmployeeVerification(user.code);
 if(!details)return <><SectionHeader title="My Profile" sub="Your employee profile and verification details."/><div className="card"><p>Employee details have not been submitted yet.</p></div></>;
 const info=[['Employee Name',details.employeeName],['Employee Code',details.employeeCode],['Designation',details.designation],['Department',details.department],['Bank Name',details.bankName],['Bank Account No',details.bankAccount],['PAN Number',details.pan],['Aadhaar Number',details.aadhaarNumber],['10th SSC Number',details.tenthSscNumber],['Inter / Diploma Registration Number',details.interDiplomaRegNo],['Higher Education Qualification',details.higherEducation],['Provident Fund No',details.pfNo],['UAN',details.uan],['State',details.state],['City',details.city],['Monthly Salary',details.monthlySalary]];
 const docs=[['Aadhaar Document',details.aadhaarDocument],['PAN Document',details.panDocument],['10th SSC Certificate',details.tenthCertificate],['Inter / Diploma Certificate',details.interDiplomaCertificate]];
 return <><SectionHeader title="My Profile" sub="Your submitted employee information and verification status."/><div className="profile-status-card"><div><span className="eyebrow">EMPLOYEE VERIFICATION</span><h2>{verification==='verified'?'Verified by Management':'Verification Pending'}</h2><p>{verification==='verified'?'Your submitted details have been accepted by Management.':'Your details are saved and waiting for Management verification.'}</p></div><span className={'status '+(verification==='verified'?'green':'yellow')}>{verification==='verified'?'Verified':'Pending'}</span></div><div className="card employee-profile-card"><div className="profile-section-title"><h3>Employee Details</h3><span>{user.code}</span></div><div className="profile-info-grid">{info.map(([label,value])=><div key={label}><small>{label}</small><b>{String(value??'').trim()||'—'}</b></div>)}</div><div className="profile-section-title"><h3>Documents</h3><span>Submitted Documents</span></div><div className="profile-doc-grid">{docs.map(([label,doc])=><div key={label}><small>{label}</small>{doc?.data?<a href={doc.data} download={doc.name}>View / Download</a>:<b>Not uploaded</b>}</div>)}</div></div></>
}

const PAYROLL_KEY='dentassure_salary_payroll_v1';
function getPayrollRecords(){try{return JSON.parse(localStorage.getItem(PAYROLL_KEY)||'[]')}catch{return []}}
function savePayrollRecords(records){localStorage.setItem(PAYROLL_KEY,JSON.stringify(records));window.dispatchEvent(new Event('dentassure-payroll-update'))}
function payrollKey(code,month,year){return `${code}__${year}-${String(Number(month)+1).padStart(2,'0')}`}
function getPayrollRecord(code,month,year){return getPayrollRecords().find(r=>r.key===payrollKey(code,month,year))||null}

function Salary({management=false,user,details,accountant=false,setToast=()=>{}}){
 const current=new Date();
 const [selectedMonth,setSelectedMonth]=useState(String(current.getMonth()));
 const [selectedYear,setSelectedYear]=useState(String(current.getFullYear()));
 const [showSearch,setShowSearch]=useState(false);
 const [payrollRefresh,setPayrollRefresh]=useState(0);
 const [references,setReferences]=useState({});
 useEffect(()=>{const refresh=()=>setPayrollRefresh(v=>v+1);window.addEventListener('dentassure-payroll-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('dentassure-payroll-update',refresh);window.removeEventListener('storage',refresh)}},[]);
 const years=Array.from({length:5},(_,i)=>String(current.getFullYear()-2+i));
 const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const selectedLabel=`${monthNames[Number(selectedMonth)]} ${selectedYear}`;
 const payrollForEmployee=e=>getPayrollRecord(e.code,selectedMonth,selectedYear);
 const setStatus=(employee,status)=>{
   const records=getPayrollRecords();
   const key=payrollKey(employee.code,selectedMonth,selectedYear);
   const old=records.find(r=>r.key===key);
   const record={...(old||{}),key,employeeCode:employee.code,employeeName:employee.name,month:Number(selectedMonth),year:Number(selectedYear),status,transactionReference:(references[employee.code]??old?.transactionReference??'').trim(),updatedAt:new Date().toISOString(),updatedBy:user?.name||'Accountant'};
   const next=[record,...records.filter(r=>r.key!==key)];
   savePayrollRecords(next);
   setToast(`${employee.name}: salary status set to ${status}`);
 };
 if(accountant)return <>
   <SectionHeader title="Salary & Payroll Dashboard" sub="Accountant workspace — payroll processing and salary-credit status only."/>
   <div className="stats">
    <Stat icon="₹" value={employees.length} label="Employees in Payroll" type="pink"/>
    <Stat icon="…" value={employees.filter(e=>payrollForEmployee(e)?.status==='Pending').length} label="Pending" type="yellow"/>
    <Stat icon="↻" value={employees.filter(e=>payrollForEmployee(e)?.status==='Processing').length} label="Processing" type="teal"/>
    <Stat icon="✓" value={employees.filter(e=>payrollForEmployee(e)?.status==='Credited').length} label="Salary Credited" type="teal"/>
   </div>
   <div className="card salary-management">
    <div className="salary-management-head"><div><span className="eyebrow">ACCOUNTANT WORKSPACE</span><h2>Monthly Salary Processing</h2><p>Update the status only after checking the actual bank/payment record. Mark “Credited” only after successful credit confirmation.</p></div><WalletCards size={28}/></div>
    <div className="salary-filter-bar">
     <label>Month<select value={selectedMonth} onChange={e=>{setSelectedMonth(e.target.value);setShowSearch(false)}}>{monthNames.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></label>
     <label>Year<select value={selectedYear} onChange={e=>{setSelectedYear(e.target.value);setShowSearch(false)}}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
     <button className="secondary" onClick={()=>setShowSearch(true)}><Search size={16}/> Refresh Payroll</button>
    </div>
    {showSearch&&<div className="salary-filter-result"><CheckCircle2 size={16}/><span>Showing payroll status for <b>{selectedLabel}</b>.</span></div>}
    <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Net Salary (estimate)</th><th>Credit Status</th><th>Bank / Transaction Reference</th><th>Update Status</th></tr></thead><tbody>
     {employees.map(e=>{const d=getEmployeeDetails(e.code);const record=payrollForEmployee(e);const status=record?.status||'Pending';const net=Number(d?.monthlySalary||0)-Number(d?.incomeTax||0);return <tr key={e.code}>
      <td><div className="person"><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><b>{e.name}</b><small>{e.code} • {e.role}</small></div></div></td>
      <td>₹{money(net)}</td>
      <td><span className={'status '+(status==='Credited'?'green':status==='Failed'?'red':status==='Processing'?'teal':'yellow')}>{status}</span>{record?.updatedAt&&<small style={{display:'block',marginTop:4}}>Updated {new Date(record.updatedAt).toLocaleDateString()}</small>}</td>
      <td><input aria-label={`Transaction reference for ${e.name}`} placeholder="UTR / reference (optional)" value={references[e.code]??record?.transactionReference??''} onChange={ev=>setReferences(v=>({...v,[e.code]:ev.target.value}))}/></td>
      <td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="secondary" onClick={()=>setStatus(e,'Pending')}>Pending</button><button className="secondary" onClick={()=>setStatus(e,'Processing')}>Processing</button><button className="primary" onClick={()=>{if(!window.confirm(`Confirm that ${e.name}'s ${selectedLabel} salary has actually been credited?`))return;setStatus(e,'Credited')}}>Mark Credited</button><button className="reject-btn" onClick={()=>setStatus(e,'Failed')}>Failed</button></div></td>
     </tr>})}
    </tbody></table></div>
   </div>
   <div className="addon-note"><b>Important:</b> This current version stores payroll status in this browser's localStorage. It does not verify bank transfers or sync across devices. Connect this screen to authenticated backend APIs and a payroll database before real use.</div>
 </>;
 if(management)return <>
   <SectionHeader title="Salary Management" sub="Review salary-credit status for the selected month."/>
   <div className="card salary-management">
    <div className="salary-management-head"><div><span className="eyebrow">PAYROLL OVERVIEW</span><h2>Salary Credit Status</h2><p>Accountant maintains the payment status. Employees can see only their own salary status.</p></div><WalletCards size={28}/></div>
    <div className="salary-filter-bar"><label>Month<select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>{monthNames.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></label><label>Year<select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label></div>
    {employees.map(e=>{const record=payrollForEmployee(e);const status=record?.status||'Pending';return <div className="salary-employee-row" key={e.code}><div className="mini-avatar">{e.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><b>{e.name}</b><small>{e.code} • {selectedLabel}</small></div><span className={'status '+(status==='Credited'?'green':status==='Failed'?'red':status==='Processing'?'teal':'yellow')}>{status}</span></div>})}
   </div>
 </>;
 if(!details)return <div/>;
 const totalEarnings=Number(details.monthlySalary||0);
 const totalDeductions=Number(details.incomeTax||0);
 const net=totalEarnings-totalDeductions;
 const record=getPayrollRecord(user.code,selectedMonth,selectedYear);
 const status=record?.status||'Pending';
 const credited=status==='Credited';
 return <>
   <SectionHeader title="My Salary" sub="Check whether your salary has been credited and download your payslip after confirmation."/>
   <div className="card salary-summary">
    <div className="salary-icon">₹</div><div><span className="eyebrow">{selectedLabel.toUpperCase()}</span><h2>₹{money(net)}</h2><p>Estimated net salary based on your saved profile details.</p></div>
    <span className={'status '+(credited?'green':status==='Failed'?'red':status==='Processing'?'teal':'yellow')}>{status}</span>
   </div>
   <div className="card payslip-selector-card">
    <div className="payslip-selector-head"><div><span className="eyebrow">SALARY CREDIT STATUS</span><h2>{credited?'Salary Credited':status==='Failed'?'Salary Credit Failed':status==='Processing'?'Salary Processing':'Salary Pending'}</h2><p>{credited?'Your salary is marked as credited. You can now download the payslip.':status==='Failed'?'The salary credit was marked as failed. Please contact the Finance team.':status==='Processing'?'Your salary payment is being processed. Payslip download is locked until credit confirmation.':'Your salary has not yet been marked as credited for this month.'}</p></div><WalletCards size={28}/></div>
    <div className="salary-filter-bar"><label>Month<select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>{monthNames.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></label><label>Year<select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
    <button className="primary" disabled={!credited} onClick={()=>downloadPayslip(details,selectedMonth,selectedYear)}><Download size={16}/> Download Payslip</button></div>
    <div className="salary-selected-info"><span>Selected Period</span><b>{selectedLabel}</b><span className={'status '+(credited?'green':status==='Failed'?'red':status==='Processing'?'teal':'yellow')}>{status}</span></div>
    {record?.transactionReference&&<p className="muted">Payment reference: {record.transactionReference}</p>}
    {record?.updatedAt&&<p className="muted">Last updated: {new Date(record.updatedAt).toLocaleString()}</p>}
   </div>
   <div className="addon-note">Salary status is currently a browser-local prototype. For trustworthy company-wide updates, the payroll status must be saved and checked through the backend database.</div>
 </>;
}

function App(){
 const [role,setRole]=useState(()=>sessionStorage.getItem('dentassure_role')||null);
 const [user,setUser]=useState(()=>{try{return JSON.parse(sessionStorage.getItem('dentassure_user')||'null')}catch{return null}});
 const [section,setSection]=useState('dashboard');
 const [mobileOpen,setMobileOpen]=useState(false);
 const [toast,setToast]=useState('');
 const [employeeDetails,setEmployeeDetails]=useState(()=>user&&user.code?getEmployeeDetails(user.code):null);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(t)}},[toast]);
 useEffect(()=>{const refresh=()=>{if(user?.code)setEmployeeDetails(getEmployeeDetails(user.code))};window.addEventListener('dentassure-profile-update',refresh);return()=>window.removeEventListener('dentassure-profile-update',refresh)},[user]);
 if(!role||!user)return <Login onLogin={(r,u)=>{sessionStorage.setItem('dentassure_role',r);sessionStorage.setItem('dentassure_user',JSON.stringify(u));setRole(r);setUser(u);setEmployeeDetails(r==='management'||r==='accountant'||r==='hr'?null:getEmployeeDetails(u.code));setSection(r==='accountant'?'salary':'dashboard')}}/>;
 const logout=()=>{sessionStorage.removeItem('dentassure_role');sessionStorage.removeItem('dentassure_user');setRole(null);setUser(null);setEmployeeDetails(null);setSection('dashboard');setMobileOpen(false)};
 if(role!=='management'&&role!=='accountant'&&role!=='hr'&&(!employeeDetails||!employeeDetails.state||!employeeDetails.city||employeeDetails.monthlySalary===undefined))return <EmployeeDetailsGate user={user} onComplete={details=>setEmployeeDetails(details)}/>;
 return <div className="app"><Sidebar role={role} section={section} setSection={setSection} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/><main className="main"><Header role={role} user={user} employeeDetails={employeeDetails} setMobileOpen={setMobileOpen} onLogout={logout}/><div className="content"> {role==='management'?<Management section={section} setToast={setToast}/>:role==='accountant'?<Salary accountant user={user} setToast={setToast}/>:role==='hr'?(section==='dashboard'?<HRDashboard setSection={setSection}/>:<Management section={section} setToast={setToast}/>):<><div className="verification-status-wrap">{employeeDetails&&getEmployeeVerification(user.code)==='pending'?<div className="verification-banner pending"><div><span className="verification-dot"/><div><b>Verification Pending</b><p>Your details are saved. Management approval is pending.</p></div></div></div>:employeeDetails?<div className="verification-banner verified"><div><span className="verification-dot"/><div><b>Verification Completed</b><p>Your employee details have been accepted by Management.</p></div></div></div>:null}</div><Staff section={section} setToast={setToast} user={user} employeeDetails={employeeDetails}/></>}</div></main>{toast&&<div className="toast">{toast}</div>}</div>}

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

createRoot(document.getElementById('root')).render(
  currentPath === '/careers'
    ? <CareersPage />
    : currentPath === '/candidate-portal' || currentPath === '/candidate'
      ? <CandidatePortal />
      : <App />
);

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
let sites = [
  { id:'P-2041', name:'Udaan Skill Centre', district:'Lucknow', state:'Uttar Pradesh', scheme:'SMILE', risk:'High', score:58, camera:'Live', attendance:62, lastInspection:'14 Aug 2026' },
  { id:'P-1872', name:'Saksham Residential Institute', district:'Jaipur', state:'Rajasthan', scheme:'PM-DAKSH', risk:'Medium', score:76, camera:'Live', attendance:84, lastInspection:'09 Aug 2026' },
  { id:'P-3108', name:'Nayi Disha Foundation', district:'Bhopal', state:'Madhya Pradesh', scheme:'NAMASTE', risk:'Low', score:91, camera:'Offline', attendance:89, lastInspection:'18 Aug 2026' },
  { id:'P-2234', name:'Aasha Rehabilitation Centre', district:'Patna', state:'Bihar', scheme:'SMILE', risk:'High', score:53, camera:'Live', attendance:57, lastInspection:'02 Aug 2026' },
  { id:'P-1146', name:'Prerna Education Trust', district:'Kolkata', state:'West Bengal', scheme:'PM-DAKSH', risk:'Low', score:94, camera:'Live', attendance:93, lastInspection:'12 Aug 2026' }
];
const indiaCoverage = [
  ['Andhra Pradesh','Visakhapatnam'],['Arunachal Pradesh','Itanagar'],['Assam','Guwahati'],['Bihar','Patna'],['Chhattisgarh','Raipur'],['Goa','Panaji'],['Gujarat','Ahmedabad'],['Haryana','Gurugram'],['Himachal Pradesh','Shimla'],['Jharkhand','Ranchi'],['Karnataka','Bengaluru'],['Kerala','Thiruvananthapuram'],['Madhya Pradesh','Bhopal'],['Maharashtra','Mumbai'],['Manipur','Imphal'],['Meghalaya','Shillong'],['Mizoram','Aizawl'],['Nagaland','Kohima'],['Odisha','Bhubaneswar'],['Punjab','Ludhiana'],['Rajasthan','Jaipur'],['Sikkim','Gangtok'],['Tamil Nadu','Chennai'],['Telangana','Hyderabad'],['Tripura','Agartala'],['Uttar Pradesh','Lucknow'],['Uttarakhand','Dehradun'],['West Bengal','Kolkata'],['Andaman and Nicobar Islands','Port Blair'],['Chandigarh','Chandigarh'],['Dadra and Nagar Haveli and Daman and Diu','Daman'],['Delhi','New Delhi'],['Jammu and Kashmir','Srinagar'],['Ladakh','Leh'],['Lakshadweep','Kavaratti'],['Puducherry','Puducherry']
];
indiaCoverage.forEach(([state,district],index)=>{if(!sites.some(site=>site.state===state))sites.push({id:`P-${4000+index}`,name:`${district} Social Support Centre`,district,state,scheme:['SMILE','PM-DAKSH','NAMASTE'][index%3],risk:['Low','Medium','High'][index%3],score:72+(index%23),camera:index%5===0?'Offline':'Live',attendance:68+(index%29),lastInspection:`${(index%27)+1} Aug 2026`})});
let inspections = [
  { id:'INSP-9082', site:'Udaan Skill Centre', inspector:'Arjun Mehta', due:'Today, 15:30', status:'Assigned', priority:'High' },
  { id:'INSP-9074', site:'Aasha Rehabilitation Centre', inspector:'Nisha Kapoor', due:'Today, 17:00', status:'In progress', priority:'High' },
  { id:'INSP-9061', site:'Saksham Residential Institute', inspector:'Vikram Singh', due:'23 Aug, 10:00', status:'Scheduled', priority:'Medium' }
];
let alerts = [
  { id:'AL-102', type:'Attendance anomaly', site:'Udaan Skill Centre', text:'Attendance dropped 27% from weekly baseline.', severity:'critical', time:'8 min ago' },
  { id:'AL-101', type:'CCTV offline', site:'Nayi Disha Foundation', text:'Camera 02 has been unavailable for 41 minutes.', severity:'warning', time:'22 min ago' },
  { id:'AL-100', type:'Evidence review', site:'Aasha Rehabilitation Centre', text:'Potentially duplicate image detected in last report.', severity:'warning', time:'1 hr ago' }
];
let reports = [];
let feedback = [];
const cameraRooms = new Map();
const employees = [{id:'GOV-2026-1001',name:'Arjun Mehta',email:'arjun.mehta@dosje.gov.in',password:'Saarthi@2026',role:'PMU Inspector',verified:true}];
const pendingVerifications = new Map();
const sessions = new Map();
const json = (res, data, status=200) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
const body = req => new Promise(resolve => { let raw=''; req.on('data', c => raw+=c); req.on('end', () => { try { resolve(JSON.parse(raw||'{}')); } catch { resolve({}); } }); });
const sessionUser = req => { const token=(req.headers.authorization||'').replace('Bearer ',''); return sessions.get(token); };

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/auth/signup' && req.method === 'POST') {
    const data=await body(req); const email=String(data.email||'').toLowerCase(); const employeeId=String(data.employeeId||'').toUpperCase();
    if(!/^GOV-\d{4}-\d{4,}$/.test(employeeId)) return json(res,{error:'Use a valid Government Employee ID (for example GOV-2026-1001).'},400);
    if(!/^[^@]+@(gov\.in|nic\.in|dosje\.gov\.in)$/.test(email)) return json(res,{error:'Use your authorized government email address.'},400);
    if(String(data.password||'').length<8) return json(res,{error:'Password must contain at least 8 characters.'},400);
    if(employees.some(e=>e.id===employeeId||e.email===email)) return json(res,{error:'This employee account already exists. Please sign in.'},409);
    pendingVerifications.set(email,{id:employeeId,name:String(data.name||'Government Employee'),email,password:data.password,role:'Department Official'});
    return json(res,{verificationRequired:true,message:'Verification code sent to your registered government email.',demoCode:'123456'});
  }
  if (url.pathname === '/api/auth/verify' && req.method === 'POST') {
    const data=await body(req); const pending=pendingVerifications.get(String(data.email||'').toLowerCase());
    if(!pending || data.code!=='123456') return json(res,{error:'Invalid or expired verification code.'},400);
    const employee={...pending,verified:true}; employees.push(employee); pendingVerifications.delete(employee.email);
    const token=crypto.randomUUID(); sessions.set(token,employee); return json(res,{token,user:{name:employee.name,employeeId:employee.id,role:employee.role}});
  }
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const data=await body(req); const user=employees.find(e=>(e.email===String(data.identifier||'').toLowerCase()||e.id===String(data.identifier||'').toUpperCase())&&e.password===data.password);
    if(!user) return json(res,{error:'Employee ID/email or password is incorrect.'},401);
    const token=crypto.randomUUID(); sessions.set(token,user); return json(res,{token,user:{name:user.name,employeeId:user.id,role:user.role}});
  }
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') { sessions.delete((req.headers.authorization||'').replace('Bearer ','')); return json(res,{ok:true}); }
  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    const data=await body(req); if(!data.category||!data.message) return json(res,{error:'Please select a grievance category and describe the issue.'},400);
    if(!/^\d{10}$/.test(String(data.phone||'').replace(/\D/g,''))) return json(res,{error:'Enter a valid 10-digit beneficiary mobile number for verification.'},400);
    const item={id:'GRV-'+Math.floor(100000+Math.random()*899999),category:data.category,ngo:data.ngo||'Not specified',message:data.message,phone:String(data.phone).replace(/\D/g,''),anonymous:Boolean(data.anonymous),submittedAt:new Date().toISOString(),status:'Received'};
    feedback.unshift(item); alerts.unshift({id:'AL-'+Math.floor(500+Math.random()*99),type:'Beneficiary grievance',site:item.ngo,text:`New ${item.category.toLowerCase()} grievance received.`,severity:'warning',time:'Just now'}); return json(res,{reference:item.id,status:item.status},201);
  }
  if (url.pathname.startsWith('/api/') && !sessionUser(req)) return json(res,{error:'Authentication required.'},401);
  if (url.pathname === '/api/dashboard') return json(res, { sites, inspections, alerts, reports, stats:{ monitored:128, live:116, inspections:18, compliance:87 } });
  if (url.pathname === '/api/assign' && req.method === 'POST') {
    const data = await body(req); const eligible = ['Arjun Mehta','Nisha Kapoor','Vikram Singh','Meera Iyer'];
    const assigned = eligible[Math.floor(Math.random()*eligible.length)];
    const target = sites.find(s=>s.id===data.siteId) || sites[0];
    const job = {id:'INSP-'+Math.floor(9000+Math.random()*999), site:target.name, inspector:assigned, due:'Within 24 hours', status:'Assigned', priority:target.risk};
    inspections.unshift(job); alerts.unshift({id:'AL-'+Math.floor(200+Math.random()*99),type:'Inspection assigned',site:target.name,text:`Randomized assignment created for ${assigned}.`,severity:'info',time:'Just now'});
    return json(res, job, 201);
  }
  if (url.pathname === '/api/reports' && req.method === 'POST') {
    const data = await body(req); const report = {id:'RPT-'+crypto.randomUUID().slice(0,6).toUpperCase(), ...data, submittedAt:new Date().toISOString(), status:'Under review'};
    reports.unshift(report); alerts.unshift({id:'AL-'+Math.floor(300+Math.random()*99),type:'Report received',site:data.site,text:'Geo-tagged inspection report submitted for review.',severity:'info',time:'Just now'});
    return json(res, report, 201);
  }
  if (url.pathname === '/api/vc' && req.method === 'POST') {
    const data = await body(req); const alert={id:'AL-'+Math.floor(400+Math.random()*99),type:'VC verification initiated',site:data.site,text:`Secure surprise VC request sent to ${data.contact||'project staff'}.`,severity:'info',time:'Just now'}; alerts.unshift(alert); return json(res, alert, 201);
  }
  if (url.pathname === '/api/camera/room' && req.method === 'POST') {
    const data=await body(req); const roomId=data.roomId || crypto.randomUUID().slice(0,8); if(!cameraRooms.has(roomId)) cameraRooms.set(roomId,[]); return json(res,{roomId});
  }
  if (url.pathname === '/api/camera/signal' && req.method === 'POST') {
    const data=await body(req); if(!data.roomId||!data.clientId||!data.signal) return json(res,{error:'Invalid camera signal.'},400); if(!cameraRooms.has(data.roomId)) cameraRooms.set(data.roomId,[]); cameraRooms.get(data.roomId).push({from:data.clientId,signal:data.signal}); return json(res,{ok:true});
  }
  if (url.pathname === '/api/camera/signals' && req.method === 'GET') {
    const roomId=url.searchParams.get('roomId'), clientId=url.searchParams.get('clientId'); const signals=(cameraRooms.get(roomId)||[]); const received=signals.filter(x=>x.from!==clientId); cameraRooms.set(roomId,signals.filter(x=>x.from===clientId)); return json(res,{signals:received});
  }
  let file = url.pathname === '/' ? 'public/index.html' : `public${decodeURIComponent(url.pathname)}`;
  file = path.resolve(file); const root = path.resolve('public');
  if (!file.startsWith(root)) return json(res,{error:'Forbidden'},403);
  fs.readFile(file, (err, content) => { if (err) return json(res,{error:'Not found'},404); const ext=path.extname(file); const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'}; res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); res.end(content); });
});
server.listen(PORT, () => console.log(`Saarthi is running at http://localhost:${PORT}`));

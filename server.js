const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
let sites = [
  { id:'P-2041', name:'Udaan Skill Centre', district:'Lucknow', state:'Uttar Pradesh', scheme:'SMILE', risk:'High', score:58, camera:'Live', attendance:62, lastInspection:'14 Aug 2026',lat:26.8467,lng:80.9462 },
  { id:'P-1872', name:'Saksham Residential Institute', district:'Jaipur', state:'Rajasthan', scheme:'PM-DAKSH', risk:'Medium', score:76, camera:'Live', attendance:84, lastInspection:'09 Aug 2026',lat:26.9124,lng:75.7873 },
  { id:'P-3108', name:'Nayi Disha Foundation', district:'Bhopal', state:'Madhya Pradesh', scheme:'NAMASTE', risk:'Low', score:91, camera:'Offline', attendance:89, lastInspection:'18 Aug 2026',lat:23.2599,lng:77.4126 },
  { id:'P-2234', name:'Aasha Rehabilitation Centre', district:'Patna', state:'Bihar', scheme:'SMILE', risk:'High', score:53, camera:'Live', attendance:57, lastInspection:'02 Aug 2026',lat:25.5941,lng:85.1376 },
  { id:'P-1146', name:'Prerna Education Trust', district:'Kolkata', state:'West Bengal', scheme:'PM-DAKSH', risk:'Low', score:94, camera:'Live', attendance:93, lastInspection:'12 Aug 2026',lat:22.5726,lng:88.3639 }
];
const indiaCoverage = [
  ['Andhra Pradesh','Visakhapatnam',17.6868,83.2185],['Arunachal Pradesh','Itanagar',27.0844,93.6053],['Assam','Guwahati',26.1445,91.7362],['Bihar','Patna',25.5941,85.1376],['Chhattisgarh','Raipur',21.2514,81.6296],['Goa','Panaji',15.4909,73.8278],['Gujarat','Ahmedabad',23.0225,72.5714],['Haryana','Gurugram',28.4595,77.0266],['Himachal Pradesh','Shimla',31.1048,77.1734],['Jharkhand','Ranchi',23.3441,85.3096],['Karnataka','Bengaluru',12.9716,77.5946],['Kerala','Thiruvananthapuram',8.5241,76.9366],['Madhya Pradesh','Bhopal',23.2599,77.4126],['Maharashtra','Mumbai',19.076,72.8777],['Manipur','Imphal',24.817,93.9368],['Meghalaya','Shillong',25.5788,91.8933],['Mizoram','Aizawl',23.7271,92.7176],['Nagaland','Kohima',25.6751,94.1086],['Odisha','Bhubaneswar',20.2961,85.8245],['Punjab','Ludhiana',30.901,75.8573],['Rajasthan','Jaipur',26.9124,75.7873],['Sikkim','Gangtok',27.3389,88.6065],['Tamil Nadu','Chennai',13.0827,80.2707],['Telangana','Hyderabad',17.385,78.4867],['Tripura','Agartala',23.8315,91.2868],['Uttar Pradesh','Lucknow',26.8467,80.9462],['Uttarakhand','Dehradun',30.3165,78.0322],['West Bengal','Kolkata',22.5726,88.3639],['Andaman and Nicobar Islands','Port Blair',11.6234,92.7265],['Chandigarh','Chandigarh',30.7333,76.7794],['Dadra and Nagar Haveli and Daman and Diu','Daman',20.3974,72.8328],['Delhi','New Delhi',28.6139,77.209],['Jammu and Kashmir','Srinagar',34.0837,74.7973],['Ladakh','Leh',34.1526,77.5771],['Lakshadweep','Kavaratti',10.5667,72.642],['Puducherry','Puducherry',11.9416,79.8083]
];
indiaCoverage.forEach(([state,district,lat,lng],index)=>{if(!sites.some(site=>site.state===state))sites.push({id:`P-${4000+index}`,name:`${district} Social Support Centre`,district,state,scheme:['SMILE','PM-DAKSH','NAMASTE'][index%3],risk:['Low','Medium','High'][index%3],score:72+(index%23),camera:index%5===0?'Offline':'Live',attendance:68+(index%29),lastInspection:`${(index%27)+1} Aug 2026`,lat,lng})});
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
const mobileCctvRooms = new Map();
const inspectorRoster = [
  {name:'Arjun Mehta',states:['Uttar Pradesh','Uttarakhand','Delhi','Haryana'],workload:2,conflicts:[]},
  {name:'Nisha Kapoor',states:['Rajasthan','Gujarat','Madhya Pradesh','Maharashtra','Goa'],workload:1,conflicts:[]},
  {name:'Vikram Singh',states:['Bihar','Jharkhand','West Bengal','Odisha','Assam','Sikkim'],workload:2,conflicts:[]},
  {name:'Meera Iyer',states:['Tamil Nadu','Kerala','Karnataka','Telangana','Andhra Pradesh','Puducherry'],workload:1,conflicts:[]}
];
const employees = [{id:'GOV-2026-1001',name:'Arjun Mehta',email:'arjun.mehta@dosje.gov.in',password:'Saarthi@2026',role:'PMU Inspector',verified:true}];
const pendingVerifications = new Map();
const sessions = new Map();
const json = (res, data, status=200) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
const body = req => new Promise(resolve => { let raw=''; req.on('data', c => raw+=c); req.on('end', () => { try { resolve(JSON.parse(raw||'{}')); } catch { resolve({}); } }); });
const sessionUser = req => { const token=(req.headers.authorization||'').replace('Bearer ',''); return sessions.get(token); };

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const origin=req.headers.origin||'';
  if(['https://saarthi-monitoring.onrender.com','capacitor://localhost','http://localhost'].includes(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  }
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
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
  const publicCameraEndpoint=['/api/mobile-cctv/room','/api/mobile-cctv/signal','/api/mobile-cctv/signals'].includes(url.pathname);
  if (url.pathname.startsWith('/api/') && !publicCameraEndpoint && !sessionUser(req)) return json(res,{error:'Authentication required.'},401);
  if (url.pathname === '/api/dashboard') return json(res, { sites, inspections, alerts, reports, inspectors:inspectorRoster.map(({name,workload})=>({name,workload,role:'PMU Inspector'})), stats:{ monitored:128, live:116, inspections:18, compliance:87 } });
  if (url.pathname === '/api/assign' && req.method === 'POST') {
    const data = await body(req);
    const riskOrder={High:0,Medium:1,Low:2}; const availableSites=sites.filter(s=>!s.inspectionAssigned);
    const target = data.siteId ? sites.find(s=>s.id===data.siteId) : availableSites.sort((a,b)=>riskOrder[a.risk]-riskOrder[b.risk])[0];
    if(!target) return json(res,{error:'No unassigned projects are currently available for inspection.'},409);
    if(target.inspectionAssigned) return json(res,{error:'This project has already been assigned for inspection.'},409);
    const conflictFree=inspectorRoster.filter(inspector=>!inspector.conflicts.includes(target.id));
    let inspector,assignmentBasis;
    if(data.inspectorName){
      inspector=conflictFree.find(person=>person.name===data.inspectorName);
      if(!inspector)return json(res,{error:'Selected inspector is unavailable or has a conflict for this project.'},400);
      assignmentBasis='Specific inspector selected by authorised official';
    }else{
      const stateEligible=conflictFree.filter(person=>person.states.includes(target.state));
      const candidatePool=stateEligible.length?stateEligible:conflictFree;
      const lowestWorkload=Math.min(...candidatePool.map(person=>person.workload));
      const balancedCandidates=candidatePool.filter(person=>person.workload===lowestWorkload);
      inspector=balancedCandidates[Math.floor(Math.random()*balancedCandidates.length)];
      assignmentBasis=stateEligible.length?'State coverage + lowest workload + randomized tie-break':'Lowest workload + randomized tie-break';
    }
    inspector.workload+=1;
    target.inspectionAssigned=true;
    const job = {id:'INSP-'+Math.floor(9000+Math.random()*999), site:target.name, inspector:inspector.name, due:data.due||'Within 24 hours', status:'Assigned', priority:data.priority||target.risk, notes:data.notes||'', finding:data.finding||'', evidence:data.evidence||'', location:data.location||'', assignmentBasis};
    inspections.unshift(job); alerts.unshift({id:'AL-'+Math.floor(200+Math.random()*99),type:'Inspection assigned',site:target.name,text:`Assigned to ${inspector.name}: ${assignmentBasis}.`,severity:'info',time:'Just now'});
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
  if (url.pathname === '/api/mobile-cctv/room' && req.method === 'POST') {
    const data=await body(req); const roomId=data.roomId || crypto.randomUUID().slice(0,10); if(!mobileCctvRooms.has(roomId)) mobileCctvRooms.set(roomId,[]); return json(res,{roomId});
  }
  if (url.pathname === '/api/mobile-cctv/signal' && req.method === 'POST') {
    const data=await body(req); if(!data.roomId||!data.clientId||!data.signal) return json(res,{error:'Invalid mobile CCTV signal.'},400);
    if(!mobileCctvRooms.has(data.roomId)) mobileCctvRooms.set(data.roomId,[]);
    mobileCctvRooms.get(data.roomId).push({id:crypto.randomUUID(),from:data.clientId,target:data.target||null,signal:data.signal,createdAt:Date.now()}); return json(res,{ok:true});
  }
  if (url.pathname === '/api/mobile-cctv/signals' && req.method === 'GET') {
    const roomId=url.searchParams.get('roomId'), clientId=url.searchParams.get('clientId'), queued=mobileCctvRooms.get(roomId)||[];
    const received=queued.filter(item=>item.from!==clientId&&(!item.target||item.target===clientId)); const receivedIds=new Set(received.map(item=>item.id));
    mobileCctvRooms.set(roomId,queued.filter(item=>!receivedIds.has(item.id)&&Date.now()-item.createdAt<600000)); return json(res,{signals:received});
  }
  let file = url.pathname === '/' ? 'public/index.html' : `public${decodeURIComponent(url.pathname)}`;
  file = path.resolve(file); const root = path.resolve('public');
  if (!file.startsWith(root)) return json(res,{error:'Forbidden'},403);
  fs.readFile(file, (err, content) => { if (err) return json(res,{error:'Not found'},404); const ext=path.extname(file); const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}; res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); res.end(content); });
});
server.listen(PORT, () => console.log(`Saarthi is running at http://localhost:${PORT}`));

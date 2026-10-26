const API='http://127.0.0.1:5000/api';
let incidentCreated=false;
function localDemoPortal(fire,em){
  const u=new URL('./emergency.html',location.href);
  u.searchParams.set('demo','1');
  u.searchParams.set('floor',String(fire.fIdx));
  u.searchParams.set('room',fire.room.id);
  u.searchParams.set('stair',em.safeStair||fire.safeStair||'STAIR_A');
  return u.toString();
}

async function createFirefighterIncident(detail){
  if(incidentCreated) return;
  const fire=window.__RESQ_STATE?.fire; const em=window.__RESQ_STATE?.emergency; if(!fire||!em)return;
  incidentCreated=true;
  try{
    const r=await fetch(`${API}/emergency/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      floor:fire.fIdx,room:fire.room.id,gas_value:230,temperature:75,fire_emergency:true,
      sensor_id:'AI-CAMERA-VERIFIED',device_id:'RESQ3D-SERVER',affected_rooms:em.affectedRooms,people_at_risk:em.peopleAtRisk,send_email:true
    })});
    if(!r.ok) throw new Error('Emergency API returned '+r.status);
    const d=await r.json();
    showAlert(d);
  }catch(e){
    console.warn('ResQ3D emergency link:',e);
    incidentCreated=false;
    const fire=window.__RESQ_STATE?.fire; const em=window.__RESQ_STATE?.emergency;
    if(fire&&em){
      showAlert({portal_url:localDemoPortal(fire,em),email_sent:false,incident:{incident_id:'DEMO-LOCAL'}});
    }
  }
}
function showAlert(d){
  let b=document.getElementById('phase12Alert');
  if(!b){b=document.createElement('div');b.id='phase12Alert';b.innerHTML='<span id="p12Text"></span><button id="p12Open">OPEN FIREFIGHTER PORTAL</button>';document.getElementById('app').appendChild(b);document.getElementById('p12Open').onclick=()=>{const u=b.dataset.url;if(u)window.open(u,'_blank');};}
  b.dataset.url=d.portal_url||''; const sent=d.email_sent?'📧 Firefighter email sent.':'📧 Email not configured — portal created for demo.'; document.getElementById('p12Text').textContent=`${sent} ${d.incident?.incident_id||''}`;b.classList.add('show');
}
window.addEventListener('resq3d:emergency-started',e=>setTimeout(()=>createFirefighterIncident(e.detail),250));
window.addEventListener('resq3d:emergency-cleared',async()=>{incidentCreated=false;try{await fetch(`${API}/emergency/clear`,{method:'POST'});}catch{}});
window.addEventListener('load',()=>{
  const p=new URLSearchParams(location.search); if(p.get('emergency')==='1') document.body.classList.add('portal-mode');
  if(window.__RESQ_STATE?.fire)createFirefighterIncident({});
});

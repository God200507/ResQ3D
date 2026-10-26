const API='http://127.0.0.1:5000/api';
const q=new URLSearchParams(location.search); const token=q.get('token');
const $=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function twinUrl(incident){
  const u=new URL('./index.html',location.href);
  u.searchParams.set('emergency','1');u.searchParams.set('floor',incident.floor);u.searchParams.set('room',incident.room);u.searchParams.set('stair',incident.recommended_stair||'STAIR_B');
  if(token) u.searchParams.set('token',token); else u.searchParams.set('demo','1');
  return u.toString();
}
function cameraMarkup(c){
  const stream=(c.stream_url||'').trim();
  let media='';
  if(stream){
    const lower=stream.toLowerCase();
    if(/\.(mp4|webm|ogg)(\?|#|$)/.test(lower)) media=`<video class="live-media" src="${esc(stream)}" controls autoplay muted playsinline></video>`;
    else if(/\.(jpg|jpeg|png|gif|webp)(\?|#|$)/.test(lower)) media=`<img class="live-media" src="${esc(stream)}" alt="${esc(c.name)} camera">`;
    else media=`<iframe class="live-media stream-frame" src="${esc(stream)}" title="${esc(c.name)} live camera"></iframe>`;
  } else {
    media=`<div class="feed"><span class="cam-grid"></span><span class="fire-dot"></span><span class="smoke"></span><span class="cam-center">LIVE CAMERA • DEMO</span></div>`;
  }
  return `<div class="cam" data-camera="${esc(c.camera_id)}"><div class="cam-title"><span>📷 ${esc(c.camera_id)} · ${esc(c.name)}</span><span class="online">● ${esc(c.status||'ONLINE')}</span></div>${media}<div class="cam-actions"><button class="cam-focus" data-floor="${esc(c.floor)}" data-room="${esc(c.room)}">FOCUS IN 3D</button>${stream?`<a class="cam-open" href="${esc(stream)}" target="_blank" rel="noopener">OPEN SOURCE</a>`:''}</div><div class="cam-note">${stream?'Configured camera source. For production CCTV, use a browser-compatible HLS/WebRTC gateway; RTSP is not directly playable by browsers.':'Demo camera node — add stream_url in data/cameras.json for a real browser-compatible camera source.'}</div></div>`;
}
async function renderDemo(){
  const floor=Number(q.get('floor')||0);
  const room=q.get('room')||'F2_LAB_01';
  const stair=q.get('stair')||'STAIR_A';
  let cams=[];
  try{ const r=await fetch('./data/cameras.json',{cache:'no-store'}); if(r.ok) cams=await r.json(); }catch{}
  cams=(Array.isArray(cams)?cams:[]).filter(c=>Number(c.floor)===floor && String(c.room||'').toUpperCase().includes(room.toUpperCase().split('_').slice(0,2).join('_')));
  if(!cams.length && Array.isArray(cams)) cams=(await (async()=>{try{const r=await fetch('./data/cameras.json');return r.ok?await r.json():[]}catch{return []}})()).filter(c=>Number(c.floor)===floor).slice(0,3);
  const incident={building:'ResQ3D Institutional Building',floor,room,sensor_id:'AI-CAMERA-VERIFIED',gas_value:230,temperature:75,risk_level:'HIGH',recommended_stair:stair,people_at_risk:16,incident_id:'DEMO-'+Date.now(),created_at:new Date().toISOString()};
  render({incident,cameras:cams});
}

function render(data){
  const i=data.incident||{}; const cams=data.cameras||[];
  $('portalStatus').textContent='🔐 INCIDENT LINK VERIFIED'; $('title').textContent=`${i.building} · Floor ${i.floor} · ${i.room}`;
  $('meta').textContent=`🔥 Fire confirmed · ${i.sensor_id||'AI VERIFIED'} · ${new Date(i.created_at).toLocaleString()}`;
  $('risk').textContent=i.risk_level||'CRITICAL'; $('incidentId').textContent=i.incident_id||'---'; $('camCount').textContent=`${cams.length} cameras`;
  $('incidentInfo').innerHTML=`<div><b>Location:</b> Floor ${esc(i.floor)} · ${esc(i.room)}</div><div><b>Gas/Smoke:</b> ${esc(i.gas_value)}</div><div><b>Temperature:</b> ${esc(i.temperature)} °C</div><div><b>People at risk:</b> ${esc(i.people_at_risk??'Calculating')}</div><div><b>Safe stair:</b> ${esc(i.recommended_stair)}</div>`;
  $('aiInfo').innerHTML=`<div><b>AI status:</b> 🔥 FIRE CONFIRMED</div><div><b>Incident:</b> ${esc(i.incident_id)}</div><div><b>Recommended access:</b> ${esc(i.recommended_stair)}</div><div><b>Digital twin:</b> All 5 floors visible · incident highlighted</div><div><b>Camera mapping:</b> ${cams.length} relevant camera node(s)</div>`;
  $('cameras').innerHTML=cams.length?cams.map(cameraMarkup).join(''):'<div class="info">No camera is mapped to this incident location.</div>';
  $('twinFrame').src=twinUrl(i);
  document.querySelectorAll('.cam-focus').forEach(btn=>btn.onclick=()=>focusTwin(btn.dataset.floor,btn.dataset.room));
}
function focusTwin(floor,room){
  const iframe=$('twinFrame');
  const u=new URL(iframe.src);u.searchParams.set('emergency','1');u.searchParams.set('floor',floor);u.searchParams.set('room',room);u.searchParams.set('token',token);iframe.src=u.toString();
  iframe.scrollIntoView({behavior:'smooth',block:'center'});
}
async function load(){
 if(q.get('demo')==='1'){
   $('portalStatus').textContent='🟢 DEMO FIREFIGHTER DASHBOARD';
   await renderDemo();
   return;
 }
 if(!token){$('portalStatus').textContent='❌ INVALID LINK';$('title').textContent='Emergency link missing';return;}
 try{const r=await fetch(`${API}/emergency/${encodeURIComponent(token)}`,{cache:'no-store'});if(!r.ok)throw new Error('Invalid or expired emergency link');render(await r.json());}
 catch(e){$('portalStatus').textContent='❌ ACCESS DENIED';$('title').textContent=e.message;}}
load();

import { startFire, clearSimulation } from './simulation.js';
import { allRooms } from './building.js';
import { LEVEL_NAMES } from './config.js';

const API_BASE = 'http://127.0.0.1:5000/api';
const POLL_MS = 2000;

let lastFireKey = null;
let lastEmergencyState = false;

function el(id){ return document.getElementById(id); }

function createPanel(){
  if(el('iotPanel')) return;
  const panel=document.createElement('div');
  panel.id='iotPanel';
  panel.innerHTML=`
    <div class="iot-title">🔌 IOT SENSOR MONITOR</div>
    <div class="iot-status" id="iotConnection">🟡 Connecting...</div>
    <div class="iot-card"><span>Device</span><b id="iotDevice">---</b></div>
    <div class="iot-card"><span>Gas / Smoke</span><b id="iotGas">---</b></div>
    <div class="iot-card"><span>Temperature</span><b id="iotTemp">---</b></div>
    <div class="iot-card"><span>Location</span><b id="iotLocation">---</b></div>
    <div class="iot-card"><span>Last Update</span><b id="iotTime">---</b></div>
    <div class="iot-alert safe" id="iotStatus">🟢 SAFE</div>
    <div class="iot-history-title">Recent Sensor Events</div>
    <div id="iotHistory" class="iot-history">No events yet.</div>
    <div class="ai-title">🧠 AI EMERGENCY RISK</div>
    <div class="ai-risk-row"><span>Recommended Stair</span><b id="aiStair">---</b></div>
    <div id="aiEvacReason" class="ai-recommendation">Waiting for evacuation analysis...</div>
    <div class="ai-risk-row"><span>Risk Score</span><b id="aiRiskScore">-- / 100</b></div>
    <div class="ai-risk-row"><span>Risk Level</span><b id="aiRiskLevel">---</b></div>
    <div id="aiRecommendation" class="ai-recommendation">Waiting for sensor analysis...</div>
    <button id="iotReset" class="iot-reset">↻ Reset IoT Emergency</button>
  `;
  document.getElementById('app').appendChild(panel);
  el('iotReset').addEventListener('click', resetIoT);
}

function setConnection(online){
  const node=el('iotConnection');
  if(node) node.textContent=online?'🟢 IoT API ONLINE':'🔴 IoT API OFFLINE';
}

function updatePanel(data){
  if(!data) return;
  el('iotDevice').textContent=data.device_id||'---';
  el('iotGas').textContent=Number(data.gas_value||0).toFixed(0);
  el('iotTemp').textContent=`${Number(data.temperature||0).toFixed(2)} °C`;
  el('iotLocation').textContent=`Floor ${data.floor??'--'} • ${data.room||'Unknown'}`;
  el('iotTime').textContent=data.timestamp?new Date(data.timestamp).toLocaleTimeString():'---';
  const status=el('iotStatus');
  if(data.fire_emergency){status.textContent='🔥 FIRE EMERGENCY';status.className='iot-alert fire';}
  else if(data.gas_detected){status.textContent='⚠ GAS / SMOKE WARNING';status.className='iot-alert warning';}
  else if(data.high_temperature){status.textContent='🌡 HIGH TEMPERATURE';status.className='iot-alert warning';}
  else {status.textContent='🟢 SAFE';status.className='iot-alert safe';}
}

function renderHistory(items){
  const box=el('iotHistory');
  if(!box) return;
  if(!items?.length){box.textContent='No events yet.';return;}
  box.innerHTML=items.slice(0,5).map(x=>{
    const state=x.fire_emergency?'🔥 FIRE':x.gas_detected?'⚠ GAS':x.high_temperature?'🌡 HEAT':'🟢 SAFE';
    const time=x.timestamp?new Date(x.timestamp).toLocaleTimeString():'--';
    return `<div class="iot-history-row"><span>${state}</span><b>${time}</b><small>F${x.floor} · ${x.room}</small></div>`;
  }).join('');
}

function normalize(v){return String(v||'').trim().toLowerCase();}

function findSensorRoom(data){
  const floorIndex=Number(data.floor)-1;
  const wanted=normalize(data.room);
  const sameFloor=allRooms.filter(r=>r.floorIdx===floorIndex);
  let room=sameFloor.find(r=>normalize(r.id)===wanted||normalize(r.name)===wanted);
  if(room) return room;
  room=sameFloor.find(r=>normalize(r.name).includes(wanted)||wanted.includes(normalize(r.name)));
  if(room) return room;
  return sameFloor.find(r=>normalize(r.id).includes(wanted));
}

async function getEvacuationPlan(data, room, riskData){
  const fireX=(Number(room.x1)+Number(room.x2))/2;
  const payload={
    fire_floor: room.floorIdx,
    fire_x: fireX,
    risk_level: riskData?.level || (data.fire_emergency ? 'HIGH' : 'LOW'),
    affected_rooms: Number(riskData?.affected_rooms || 1),
    people_at_risk: Number(riskData?.people_at_risk || 10)
  };
  const response=await fetch(`${API_BASE}/evacuation`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok) throw new Error(`Evacuation API HTTP ${response.status}`);
  return response.json();
}

function updateEvacuationPanel(plan){
  const stair=el('aiStair');
  const reason=el('aiEvacReason');
  if(stair) stair.textContent=plan?.selected_stair_name || '---';
  if(reason) reason.textContent=plan?.reason || 'Waiting for evacuation analysis...';
}

async function triggerIoTEmergency(data){
  if(!data.fire_emergency){
    lastFireKey=null;
    lastEmergencyState=false;
    updateEvacuationPanel(null);
    return;
  }

  const room=findSensorRoom(data);
  if(!room){
    console.warn('ResQ3D IoT: room not found:',data.floor,data.room);
    return;
  }

  const fireKey=`${room.id}:${data.device_id||'device'}`;
  if(lastFireKey===fireKey&&lastEmergencyState) return;

  try{
    const riskResponse=await fetch(`${API_BASE}/risk?t=${Date.now()}`,{cache:'no-store'});
    const riskData=riskResponse.ok?await riskResponse.json():null;
    const plan=await getEvacuationPlan(data,room,riskData);
    updateEvacuationPanel(plan);

    lastFireKey=fireKey;
    lastEmergencyState=true;

    console.log(`🧠 AI EVACUATION -> ${plan.selected_stair_name}`);
    startFire(room._group,null,{safeStair:plan.selected_stair});
  }catch(error){
    console.warn('ResQ3D AI evacuation:',error.message);
    lastFireKey=fireKey;
    lastEmergencyState=true;
    startFire(room._group);
  }
}

async function pollSensor(){
  try{
    const response=await fetch(`${API_BASE}/sensor?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    setConnection(true);
    updatePanel(data);
    triggerIoTEmergency(data);
  }catch(error){
    setConnection(false);
    console.warn('ResQ3D IoT:',error.message);
  }
}


function updateRiskPanel(data){
  const score=el('aiRiskScore');
  const level=el('aiRiskLevel');
  const rec=el('aiRecommendation');
  if(!score||!level||!rec||!data) return;
  score.textContent=`${data.score} / 100`;
  level.textContent=data.level||'---';
  level.className=`ai-level ${String(data.level||'').toLowerCase()}`;
  rec.innerHTML=(data.recommendations||[]).slice(0,3).map(x=>`<div>• ${x}</div>`).join('');
}

async function pollRisk(){
  try{
    const response=await fetch(`${API_BASE}/risk?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    updateRiskPanel(await response.json());
  }catch(error){
    console.warn('AI risk:',error.message);
  }
}

async function pollHistory(){
  try{
    const response=await fetch(`${API_BASE}/history?t=${Date.now()}`,{cache:'no-store'});
    if(response.ok) renderHistory(await response.json());
  }catch(error){ console.warn('IoT history:',error.message); }
}

async function resetIoT(){
  try{
    await fetch(`${API_BASE}/reset`,{method:'POST'});
  }catch(error){ console.warn('IoT reset:',error.message); }
  lastFireKey=null;
  lastEmergencyState=false;
  clearSimulation();
  await pollSensor();
  await pollHistory();
}

function startIoTMonitor(){
  createPanel();
  pollSensor();
  pollHistory();
  pollRisk();
  setInterval(pollSensor,POLL_MS);
  setInterval(pollHistory,5000);
  setInterval(pollRisk,2000);
}

document.addEventListener('click',event=>{
  if(event.target?.id==='btnClear'){
    lastFireKey=null;
    lastEmergencyState=false;
  }
});

window.addEventListener('load',()=>setTimeout(startIoTMonitor,500));

export { startIoTMonitor, pollSensor, pollHistory, pollRisk, resetIoT };

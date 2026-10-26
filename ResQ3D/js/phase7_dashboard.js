const API='http://127.0.0.1:5000/api';
function el(id){return document.getElementById(id);}

function createCommandPanel(){
  if(el('commandPanel')) return;
  const p=document.createElement('div'); p.id='commandPanel';
  p.innerHTML=`
    <div class="cmd-title">🚨 RESQ3D COMMAND CENTER</div>
    <div class="cmd-grid">
      <div><span>Active Sensors</span><b id="cmdActive">0</b></div>
      <div><span>Fire Nodes</span><b id="cmdFire">0</b></div>
      <div><span>Affected Floors</span><b id="cmdFloors">0</b></div>
      <div><span>System</span><b id="cmdSystem">ONLINE</b></div>
    </div>
    <div class="cmd-section">LIVE INCIDENT</div>
    <div id="cmdIncident" class="cmd-incident safe">No active emergency</div>
    <div class="cmd-section">RESPONSE TIMELINE</div>
    <div id="cmdTimeline" class="cmd-timeline">Waiting for events...</div>
    <div class="cmd-actions">
      <button id="cmdMultiFire">🔥 Multi-Sensor Fire</button>
      <button id="cmdReset">↻ Reset</button>
    </div>`;
  document.getElementById('app').appendChild(p);
  el('cmdMultiFire').onclick=async()=>{
    const sensors=[
      {sensor_id:'SENSOR-F2-LAB',device_id:'TINKERCAD-MULTI',floor:2,room:'F2_LAB_01',gas_value:230,temperature:75},
      {sensor_id:'SENSOR-F1-LAB',device_id:'TINKERCAD-MULTI',floor:1,room:'F1_LAB_01',gas_value:205,temperature:58},
      {sensor_id:'SENSOR-F3-IOT',device_id:'TINKERCAD-MULTI',floor:3,room:'F3_IOT_LAB',gas_value:90,temperature:25}
    ];
    await fetch(API+'/multisensor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sensors})});
    pollCommandCenter();
  };
  el('cmdReset').onclick=()=>window.__RESQ_MULTISENSOR?.reset();
}

async function pollCommandCenter(){
  try{
    const r=await fetch(`${API}/incident?t=${Date.now()}`,{cache:'no-store'}); if(!r.ok)throw new Error('offline');
    const d=await r.json();
    el('cmdActive').textContent=d.active_nodes||0;
    el('cmdFire').textContent=d.fire_nodes?.length||0;
    el('cmdFloors').textContent=d.affected_floors?.length||0;
    el('cmdSystem').textContent='ONLINE';
    const box=el('cmdIncident');
    if(d.fire_nodes?.length){
      box.className='cmd-incident fire';
      box.innerHTML=`🔥 FIRE INCIDENT<br><small>${d.fire_nodes.map(x=>`F${x.floor} · ${x.room}`).join('<br>')}</small>`;
    }else if(d.gas_nodes?.length||d.heat_nodes?.length){
      box.className='cmd-incident warning';
      box.innerHTML=`⚠ SENSOR WARNING<br><small>${d.gas_nodes.length} gas · ${d.heat_nodes.length} heat</small>`;
    }else{
      box.className='cmd-incident safe'; box.textContent='🟢 No active emergency';
    }
    const hist=await (await fetch(`${API}/history?t=${Date.now()}`,{cache:'no-store'})).json();
    el('cmdTimeline').innerHTML=(hist||[]).slice(0,6).map(x=>{
      const s=x.fire_emergency?'🔥 FIRE':x.gas_detected?'⚠ GAS':x.high_temperature?'🌡 HEAT':'🟢 SAFE';
      return `<div><span>${s}</span><b>F${x.floor} · ${x.room}</b><small>${x.timestamp?new Date(x.timestamp).toLocaleTimeString():'--'}</small></div>`;
    }).join('')||'Waiting for events...';
  }catch(e){ if(el('cmdSystem'))el('cmdSystem').textContent='OFFLINE'; }
}

window.addEventListener('load',()=>setTimeout(()=>{createCommandPanel();pollCommandCenter();setInterval(pollCommandCenter,2000);},900));
export {pollCommandCenter};

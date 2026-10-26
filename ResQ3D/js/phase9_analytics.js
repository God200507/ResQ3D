const API9='http://127.0.0.1:5000/api';
const q9=id=>document.getElementById(id);

function createAnalyticsPanel(){
  if(q9('analyticsPanel')) return;
  const p=document.createElement('div'); p.id='analyticsPanel';
  p.innerHTML=`
    <div class="p9-title">📊 INCIDENT ANALYTICS</div>
    <div class="p9-grid">
      <div><span>Total Events</span><b id="p9Events">0</b></div>
      <div><span>Fire Events</span><b id="p9Fires">0</b></div>
      <div><span>Gas Warnings</span><b id="p9Gas">0</b></div>
      <div><span>Heat Warnings</span><b id="p9Heat">0</b></div>
    </div>
    <div class="p9-subtitle">EVENT DISTRIBUTION</div>
    <div id="p9Floors" class="p9-list">Waiting...</div>
    <div class="p9-subtitle">INCIDENT REPLAY</div>
    <div class="p9-replay"><input id="p9Replay" type="range" min="0" max="0" value="0"><div><span id="p9ReplayLabel">No events</span><button id="p9ReplayBtn">▶ Replay</button></div></div>`;
  document.getElementById('app').appendChild(p);
  q9('p9ReplayBtn').onclick=replayEvent;
}

let p9History=[];
async function pollAnalytics(){
  try{
    const r=await fetch(`${API9}/analytics?t=${Date.now()}`,{cache:'no-store'}); if(!r.ok) throw 0;
    const d=await r.json();
    q9('p9Events').textContent=d.total_events||0;
    q9('p9Fires').textContent=d.fire_events||0;
    q9('p9Gas').textContent=d.gas_warnings||0;
    q9('p9Heat').textContent=d.temperature_warnings||0;
    const floors=d.events_by_floor||{};
    q9('p9Floors').innerHTML=Object.keys(floors).length?Object.entries(floors).map(([f,n])=>`<div><span>Floor ${f}</span><b>${n} event${n===1?'':'s'}</b></div>`).join(''):'No events';
    const h=await (await fetch(`${API9}/history?t=${Date.now()}`,{cache:'no-store'})).json();
    p9History=h||[];
    const slider=q9('p9Replay'); slider.max=Math.max(0,p9History.length-1); slider.value=0; updateReplayLabel();
  }catch(e){ if(q9('p9Floors')) q9('p9Floors').textContent='API offline'; }
}
function updateReplayLabel(){
  const i=Number(q9('p9Replay')?.value||0), x=p9History[i];
  q9('p9ReplayLabel').textContent=x?`${x.fire_emergency?'🔥 FIRE':x.gas_detected?'⚠ GAS':x.high_temperature?'🌡 HEAT':'🟢 SAFE'} · F${x.floor} · ${x.room}`:'No events';
}
async function replayEvent(){
  const x=p9History[Number(q9('p9Replay')?.value||0)]; if(!x) return;
  try{ await fetch(`${API9}/sensor`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)}); window.dispatchEvent(new CustomEvent('resq3d:replay',{detail:x})); }catch(e){}
}
window.addEventListener('load',()=>setTimeout(()=>{createAnalyticsPanel();pollAnalytics();setInterval(pollAnalytics,7000);q9('p9Replay')?.addEventListener('input',updateReplayLabel);},1200));
export {pollAnalytics};

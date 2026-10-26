const API10='http://127.0.0.1:5000/api';
const q10=id=>document.getElementById(id);
function createOpsPanel(){
 if(q10('opsPanel'))return;
 const p=document.createElement('div');p.id='opsPanel';
 p.innerHTML=`<div class="p10-title">🛡️ OPERATIONS & REPORT</div><div id="p10Health" class="p10-health">Checking system...</div><div class="p10-nodes" id="p10Nodes"></div><div class="p10-actions"><button id="p10Report">📄 Export Report</button><button id="p10Print">🖨 Print Report</button></div>`;
 document.getElementById('app').appendChild(p);
 q10('p10Report').onclick=exportReport;q10('p10Print').onclick=printReport;
}
async function pollHealth(){
 try{const r=await fetch(`${API10}/system-health?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();q10('p10Health').textContent=`🟢 API ONLINE · ${d.sensor_nodes} sensor nodes`;
 q10('p10Nodes').innerHTML=(d.nodes||[]).map(n=>`<div><span>${n.sensor_id}</span><b class="${n.status==='ALERT'?'alert':'normal'}">${n.status}</b></div>`).join('');}
 catch(e){q10('p10Health').textContent='🔴 API OFFLINE';q10('p10Nodes').textContent='Start backend/server.py';}
}
async function getReport(){const r=await fetch(`${API10}/report?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('Report unavailable');return r.json();}
async function exportReport(){try{const d=await getReport();const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ResQ3D_Incident_Report_${new Date().toISOString().slice(0,19).replaceAll(':','-')}.json`;a.click();URL.revokeObjectURL(a.href);}catch(e){alert('Start the ResQ3D IoT API first.');}}
async function printReport(){try{const d=await getReport();const rows=(d.recent_events||[]).map(x=>`<tr><td>${x.timestamp||''}</td><td>F${x.floor}</td><td>${x.room}</td><td>${x.gas_value}</td><td>${x.temperature}</td><td>${x.fire_emergency?'FIRE':x.gas_detected?'GAS':x.high_temperature?'HEAT':'SAFE'}</td></tr>`).join('');const w=window.open('','_blank');w.document.write(`<html><head><title>ResQ3D Emergency Report</title><style>body{font-family:Arial;padding:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:7px;font-size:12px}h1{color:#123}</style></head><body><h1>ResQ3D Emergency Incident Report</h1><p>Generated: ${d.generated_at}</p><p>Sensors: ${d.sensor_count} | Events: ${d.event_count} | Fire events: ${d.fire_event_count}</p><table><tr><th>Time</th><th>Floor</th><th>Room</th><th>Gas</th><th>Temp</th><th>Status</th></tr>${rows}</table></body></html>`);w.document.close();w.focus();w.print();}catch(e){alert('Start the ResQ3D IoT API first.');}}
window.addEventListener('load',()=>setTimeout(()=>{createOpsPanel();pollHealth();setInterval(pollHealth,5000);},1500));
export {pollHealth,exportReport,printReport};

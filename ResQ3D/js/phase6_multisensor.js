import { allRooms } from './building.js';
import { startFire, addSpreadFire, clearSimulation } from './simulation.js';

const API='http://127.0.0.1:5000/api';
let lastIncidentKey='';

function findRoom(node){
  return allRooms.find(r=>r.id===node.room) || allRooms.find(r=>r.floorIdx===Number(node.floor) && String(r.name).toLowerCase().includes(String(node.room).toLowerCase()));
}

async function pollMultiSensor(){
  try{
    const r=await fetch(`${API}/sensors?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error('sensor API');
    const nodes=await r.json();
    const fireNodes=nodes.filter(x=>x.fire_emergency);
    if(!fireNodes.length){lastIncidentKey='';return;}
    const key=fireNodes.map(x=>x.sensor_id).sort().join('|');
    if(key===lastIncidentKey) return;
    lastIncidentKey=key;

    const primary=findRoom(fireNodes[0]);
    if(!primary) return;

    // iot.js handles the primary single-sensor fire. For a multi-sensor
    // incident, add the other active sensor locations as additional sources.
    if(fireNodes.length===1){
      window.dispatchEvent(new CustomEvent('resq3d:multisensor',{detail:{nodes,fireNodes}}));
      return;
    }

    fireNodes.slice(1).forEach(node=>{
      const room=findRoom(node);
      if(room) addSpreadFire(room);
    });

    window.dispatchEvent(new CustomEvent('resq3d:multisensor',{detail:{nodes,fireNodes}}));
  }catch(e){console.warn('Multi-sensor monitor:',e.message);}
}

async function resetMultiSensor(){
  try{await fetch(`${API}/reset`,{method:'POST'});}catch(e){console.warn(e.message);}
  lastIncidentKey='';
  clearSimulation();
  pollMultiSensor();
}

window.addEventListener('load',()=>setTimeout(()=>{
  pollMultiSensor();
  setInterval(pollMultiSensor,2000);
},800));

window.__RESQ_MULTISENSOR={poll:pollMultiSensor,reset:resetMultiSensor};
export {pollMultiSensor,resetMultiSensor};

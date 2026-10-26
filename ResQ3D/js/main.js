import * as THREE from 'three';
import { buildSite } from './site.js';
import { buildBuilding } from './building.js';
import { scene, camera, renderer, controls, floorGroups } from './scene.js';
import { state } from './state.js';
import { FLOOR_Y } from './config.js';
import { startFire, clearSimulation, buildEvacuation, setupEmergencyUI, updateEvacuation, updateFireSpread, setupAmbientPeople } from './simulation.js';
import { getSelectedRoom } from './interaction.js';

window.addEventListener('error', e=>{const box=document.getElementById('errorBox');if(box){box.style.display='block';box.innerHTML=`<b>Error:</b> ${e.message}<br><small>${e.filename||''}:${e.lineno||0}</small>`;}const loader=document.getElementById('loader');if(loader)loader.classList.add('hide');});

try { buildSite(); buildBuilding(); setupAmbientPeople(); window.__RESQ_STATE=state; console.log('✓ Digital twin built successfully.'); } catch(e) { console.error('Build failed:',e); window.dispatchEvent(new ErrorEvent('error',{message:e.message||String(e)})); }

document.getElementById('btnFire').onclick=()=>startFire(getSelectedRoom());
setupEmergencyUI();
document.getElementById('btnEvac').onclick=()=>{const target=getSelectedRoom()||(state.fire?state.fire.room._group:null);if(target)buildEvacuation(target);else {const r=window.__RESQ_ALL_ROOMS?.find(r=>r.mainEntrance);if(r)buildEvacuation(r._group);}};
document.getElementById('btnClear').onclick=()=>{clearSimulation();window.dispatchEvent(new CustomEvent('resq3d:emergency-cleared'));};
window.addEventListener('resq3d:demo-fire',e=>{const room=(window.__RESQ_ALL_ROOMS||[]).find(r=>r.id===e.detail);if(room)startFire(room._group,null,{spread:false});});

// Phase 12: firefighter portal opens the exact incident location automatically.
const portalParams=new URLSearchParams(location.search);
if(portalParams.get('emergency')==='1') {
  setTimeout(async()=>{
    const roomId=portalParams.get('room');
    const floorIdx=parseInt(portalParams.get('floor')||'0',10);
    const room=(window.__RESQ_ALL_ROOMS||[]).find(r=>r.id===roomId) || (window.__RESQ_ALL_ROOMS||[]).find(r=>r.floorIdx===floorIdx);
    if(!room) return;
    // Firefighter view keeps all floors visible and highlights the incident.
    const safeStair=portalParams.get('stair')||((room.x1+room.x2)/2<0?'STAIR_A':'STAIR_B');
    startFire(room._group,null,{safeStair});
    buildEvacuation(room._group);
    document.body.classList.add('firefighter-twin-mode');
  },900);
}

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),0.05);const t=performance.now()*0.001;controls.update();updateFireSpread(dt);if(state.fire&&state.fire.group){[state.fire.group,...(window.__RESQ_SIM?.secondaryFires||[]).map(x=>x.group)].forEach(g=>g?.children?.forEach((c,i)=>{const s=0.88+Math.sin(t*6+(c.userData.phase||0))*0.18;c.scale.set(s,0.92+Math.sin(t*7+i)*0.16,s);c.rotation.y+=dt*1.4;c.position.y=(c.userData.baseY||0.5)*(0.92+Math.sin(t*5+i)*0.08); }));}if(window.__RESQ_SIM?.fireLights)window.__RESQ_SIM.fireLights.forEach((l,i)=>l.intensity=2.6+Math.sin(t*11+i)*0.8+Math.random()*0.5);if(window.__RESQ_SIM?.smokeParticles)window.__RESQ_SIM.smokeParticles.forEach(s=>{s.userData.rise+=dt*s.userData.speed;s.position.y=s.userData.startY+s.userData.rise;s.rotation.y+=dt*0.4;const sc=1+s.userData.rise*0.14;s.scale.set(sc,sc,sc);s.material.opacity=Math.max(0,0.34-s.userData.rise*0.012);if(s.userData.rise>26){s.userData.rise=0;s.position.y=s.userData.startY;}});if(window.__RESQ_SIM?.dangerZones)window.__RESQ_SIM.dangerZones.forEach((z,i)=>z.material.opacity=0.10+Math.sin(t*3+i)*0.05);if(window.__RESQ_SIM?.ambientPeople)window.__RESQ_SIM.ambientPeople.forEach((p,i)=>{
  const u=p.userData;
  if(!u.ambient || u.evacuating) return;
  const phase=u.ambientPhase||i;
  const tt=t*(u.patrolSpeed||0.55)+phase;
  const radius=u.patrolRadius||2.0;
  const sx=u.patrolStartX??p.position.x;
  const sz=u.patrolStartZ??p.position.z;
  p.position.x=sx+Math.cos(tt)*radius;
  p.position.z=sz+Math.sin(tt)*(radius*(u.patrolZScale||0.7));
  p.rotation.y=Math.atan2(Math.cos(tt),-Math.sin(tt));
  const walk=Math.sin(tt*5.2)*0.55;
  p.userData.leftArm.rotation.x=walk;
  p.userData.rightArm.rotation.x=-walk;
  p.userData.leftLeg.rotation.x=-walk;
  p.userData.rightLeg.rotation.x=walk;
});updateEvacuation(dt);renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
setTimeout(()=>{ const l=document.getElementById('loader'); if(l) l.classList.add('hide'); }, 700);
animate();
camera.position.set(52,38,58); controls.target.set(0,9,0); controls.update();

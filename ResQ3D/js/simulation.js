import * as THREE from 'three';
import { B, FLOOR_Y, FLOOR_H, LEVEL_NAMES } from './config.js';
import { simGroup, camera, controls, floorGroups, buildingGroup } from './scene.js';
import { allRooms } from './building.js';
import { state } from './state.js';
import { setActiveFloor, applyLayers } from './interaction.js';
import { MAT } from './materials.js';

let smokeParticles = [];
let fireLight = null;
let fireLights = [];
let dangerZone = null;
let dangerZones = [];
let dangerEdges = null;
let dangerEdgesList = [];
let secondaryFires = [];
let routeGroup = null;
let ambientPeople = [];
let emergencyShellHidden = false;
let ambientPatrolClock = 0;

function el(id){ return document.getElementById(id); }

function removeAmbientPeople(){
  ambientPeople.forEach(p=>p.parent?.remove(p));
  ambientPeople.length=0;
}

function createAmbientPeople(){
  removeAmbientPeople();
  const spots=[
    [-11,-0.9],[-5,0.8],[5,-0.8],[11,0.8]
  ];
  let idx=0;
  for(let f=0;f<5;f++){
    spots.forEach(([x,z],j)=>{
      const p=createPerson(idx++);
      p.position.set(x,FLOOR_Y[f]+0.08,z);
      p.userData.ambient=true;
      p.userData.floorIdx=f;
      p.userData.ambientPhase=(f*1.7)+j;
      p.userData.patrolStartX=x;
      p.userData.patrolStartZ=z;
      p.userData.patrolRadius=1.8+(j*0.6);
      p.userData.patrolSpeed=0.55+(j*0.08);
      p.userData.patrolTime=(f*2.3)+(j*1.17);
      p.userData.patrolZScale=0.65+(j%2)*0.12;
      p.scale.setScalar(1.18);
      simGroup.add(p);
      ambientPeople.push(p);
    });
  }
}

function setEmergencyStructureView(on, floorIdx=0){
  // Emergency mode keeps the complete building visible. The firefighter/demo
  // view should never hide floors; only the incident room is emphasized.
  emergencyShellHidden=on;
  buildingGroup.children.forEach(child=>{
    if(child.userData?.isFloor) child.visible=true;
    else child.visible=true;
  });
  state.layers.structure=state.layers.structure ?? false;
  applyLayers();
}


function focusEmergencyCamera(room){
  const cx=(room.x1+room.x2)/2, cz=(room.z1+room.z2)/2;
  const y=FLOOR_Y[room.floorIdx];
  // Keep all floors visible in the practical demo. The camera only centers on the incident.
  setEmergencyStructureView(true,room.floorIdx);
  camera.position.set(cx+30,y+22,cz+34);
  controls.target.set(0,9,0);
  controls.update();
}

function roomCenter(room){
  return { x:(room.x1+room.x2)/2, z:(room.z1+room.z2)/2 };
}

function restoreRoomVisuals(){
  allRooms.forEach(r=>{
    const mesh = r._group?.userData?.floorMesh;
    if(!mesh || !mesh.material) return;
    if(mesh.userData.originalColor !== undefined) mesh.material.color.setHex(mesh.userData.originalColor);
    if(mesh.userData.originalEmissive !== undefined) mesh.material.emissive.setHex(mesh.userData.originalEmissive);
    if(mesh.userData.originalEmissiveIntensity !== undefined) mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity;
  });
}

function clearSimulation(){
  smokeParticles.forEach(p=>p.parent?.remove(p));
  smokeParticles.length=0;
  while(simGroup.children.length) simGroup.remove(simGroup.children[0]);
  restoreRoomVisuals();
  setEmergencyStructureView(false,0);
  state.fire=null;
  state.evac=null;
  state.emergency=null;
  fireLight=null;
  fireLights.length=0;
  dangerZone=null;
  dangerZones.length=0;
  dangerEdges=null;
  dangerEdgesList.length=0;
  secondaryFires.length=0;
  routeGroup=null;
  createAmbientPeople();
  window.dispatchEvent(new CustomEvent('resq3d:emergency-cleared'));
  if(el('statusText')){
    el('statusText').textContent='SYSTEM ONLINE';
    el('statusText').style.color='';
  }
  updateEmergencyPanel();
}

function getAffectedRooms(fireRoom){
  const c=roomCenter(fireRoom);
  return allRooms.filter(r=>{
    const rc=roomCenter(r);
    const dx=rc.x-c.x, dz=rc.z-c.z;
    const horizontal=Math.sqrt(dx*dx+dz*dz);
    const floorGap=Math.abs(r.floorIdx-fireRoom.floorIdx);
    return (floorGap===0 && horizontal<=9.5) || (floorGap===1 && horizontal<=7.0);
  });
}

function markAffectedRooms(fireRoom){
  const affected=getAffectedRooms(fireRoom);
  const affectedIds=new Set(affected.map(r=>r.id));
  allRooms.forEach(r=>{
    const mesh=r._group?.userData?.floorMesh;
    if(!mesh) return;
    if(mesh.userData.originalColor===undefined) mesh.userData.originalColor=mesh.material.color.getHex();
    if(mesh.userData.originalEmissive===undefined) mesh.userData.originalEmissive=mesh.material.emissive?.getHex?.() ?? 0;
    if(mesh.userData.originalEmissiveIntensity===undefined) mesh.userData.originalEmissiveIntensity=mesh.material.emissiveIntensity ?? 0;
    if(r.id===fireRoom.id){
      mesh.material.color.setHex(0xff3b30);
      mesh.material.emissive.setHex(0x8b0000);
      mesh.material.emissiveIntensity=0.7;
    } else if(affectedIds.has(r.id)) {
      mesh.material.color.setHex(0xff8c42);
      mesh.material.emissive.setHex(0x552200);
      mesh.material.emissiveIntensity=0.28;
    }
  });
  return affected;
}

function chooseSafeStair(fireRoom){
  const c=roomCenter(fireRoom);
  // Use the staircase on the opposite side of the fire.
  // Stair A is left/NW; Stair B is right/SE.
  return c.x < 0 ? 'STAIR_B' : 'STAIR_A';
}

function createDangerZone(room, yBase, floorH){
  const cx=(room.x1+room.x2)/2, cz=(room.z1+room.z2)/2;
  const geo=new THREE.BoxGeometry(room.x2-room.x1, floorH-0.3, room.z2-room.z1);
  const zone=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xff2a2a,transparent:true,opacity:0.20,depthWrite:false}));
  zone.position.set(cx,yBase+(floorH-0.3)/2,cz);
  simGroup.add(zone);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xff4444,transparent:true,opacity:0.9}));
  edges.position.copy(zone.position);
  simGroup.add(edges);
  dangerZones.push(zone);
  dangerEdgesList.push(edges);
  dangerZone=zone;
  dangerEdges=edges;
}

function createFire(room,yBase){
  const cx=(room.x1+room.x2)/2, cz=(room.z1+room.z2)/2;
  const fireGroup=new THREE.Group();
  fireGroup.position.set(cx,yBase+0.65,cz);
  fireGroup.name='FIRE';
  const flameMat=new THREE.MeshBasicMaterial({color:0xff6a00,transparent:true,opacity:0.78,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let i=0;i<10;i++){
    const h=1.3+Math.random()*2.0;
    const cone=new THREE.Mesh(new THREE.ConeGeometry(0.45+Math.random()*0.4,h,7),flameMat);
    cone.position.set((Math.random()-0.5)*2.4,h/2,(Math.random()-0.5)*2.4);
    cone.userData.phase=Math.random()*Math.PI*2;
    cone.userData.baseY=h/2;
    fireGroup.add(cone);
  }
  simGroup.add(fireGroup);
  const light=new THREE.PointLight(0xff5a00,5.5,34,2);
  light.position.set(cx,yBase+3.2,cz);
  simGroup.add(light);
  fireLight=light;
  fireLights.push(light);
  return fireGroup;
}

function createSmoke(room,yBase){
  const cx=(room.x1+room.x2)/2, cz=(room.z1+room.z2)/2;
  const smokeMat=new THREE.MeshBasicMaterial({color:0x2a2a2a,transparent:true,opacity:0.32,depthWrite:false});
  for(let i=0;i<28;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(0.5+Math.random()*0.8,7,6),smokeMat.clone());
    s.position.set(cx+(Math.random()-0.5)*2.5,yBase+1+Math.random()*2,cz+(Math.random()-0.5)*2.5);
    s.userData.speed=0.25+Math.random()*0.5;
    s.userData.rise=0;
    s.userData.startY=s.position.y;
    simGroup.add(s);
    smokeParticles.push(s);
  }
}

function createRoute(roomGroup,safeStair){
  const room=roomGroup.userData.room;
  const fIdx=roomGroup.userData.floorIdx;
  focusEmergencyCamera(room);
  const yBase=FLOOR_Y[fIdx];
  const c=roomCenter(room);
  const useStairA=safeStair==='STAIR_A';
  const stairX=useStairA?-15.5:15.5;
  const stairEntryZ=useStairA?-2.5:2.5;
  const pts=[];
  const doorPos=roomGroup.userData.doorWorld;
  const doorX=doorPos?.x ?? c.x;
  const doorZ=doorPos?.z ?? (room.z2<=0?B.CZ0:B.CZ1);
  pts.push(new THREE.Vector3(doorX,yBase+0.35,doorZ));
  pts.push(new THREE.Vector3(doorX,yBase+0.35,0));
  pts.push(new THREE.Vector3(stairX,yBase+0.35,0));
  pts.push(new THREE.Vector3(stairX,yBase+0.35,stairEntryZ));

  for(let f=fIdx;f>=0;f--){
    const yy=FLOOR_Y[f]+0.35;
    const zz=useStairA?-4.0:4.0;
    pts.push(new THREE.Vector3(stairX,yy,zz));
    if(f>0) pts.push(new THREE.Vector3(stairX,FLOOR_Y[f-1]+0.35,useStairA?-6.5:6.5));
  }
  pts.push(new THREE.Vector3(stairX,0.35,0));
  const exitX=useStairA?B.X0-1.5:B.X1+1.5;
  pts.push(new THREE.Vector3(exitX,0.35,0));
  pts.push(new THREE.Vector3(exitX+(useStairA?-14:14),0.35,20));
  pts.push(new THREE.Vector3(-32,0.35,26));

  routeGroup=new THREE.Group();
  routeGroup.name='SAFE_EVACUATION_ROUTE';
  const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.35);
  routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,260,0.18,8,false),new THREE.MeshBasicMaterial({color:0x00ff9d,transparent:true,opacity:0.9})));
  routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,260,0.34,8,false),new THREE.MeshBasicMaterial({color:0x00ff9d,transparent:true,opacity:0.16,blending:THREE.AdditiveBlending,depthWrite:false})));
  pts.forEach((p,i)=>{
    if(i%2) return;
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,8),new THREE.MeshBasicMaterial({color:0x00ff9d}));
    m.position.copy(p); routeGroup.add(m);
  });
  simGroup.add(routeGroup);
  return {curve,routeGroup,people:[]};
}

function createPerson(index){
  const person = new THREE.Group();
  person.name = `EVACUEE_${String(index+1).padStart(2,'0')}`;

  // Low-poly human: head + torso + arms + legs.
  // The model is intentionally lightweight so many people can move smoothly.
  const skin = new THREE.MeshStandardMaterial({color:0xf1c7a5,roughness:0.8});
  const clothes = [0x2d7ff9,0x27ae60,0xf39c12,0x9b59b6,0xe74c3c,0x16a085][index%6];
  const shirtMat = new THREE.MeshStandardMaterial({color:clothes,roughness:0.75,emissive:clothes,emissiveIntensity:0.12});
  const pantsMat = new THREE.MeshStandardMaterial({color:0x263238,roughness:0.9});
  const shoeMat = new THREE.MeshStandardMaterial({color:0x111820,roughness:0.95});

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23,0.27,0.62,8),shirtMat);
  torso.position.y=1.08;
  person.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18,10,8),skin);
  head.position.y=1.57;
  person.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.12,8),skin);
  neck.position.y=1.38;
  person.add(neck);

  const armGeo = new THREE.CylinderGeometry(0.055,0.065,0.58,7);
  const legGeo = new THREE.CylinderGeometry(0.075,0.085,0.72,7);

  const leftArm = new THREE.Mesh(armGeo,shirtMat);
  const rightArm = new THREE.Mesh(armGeo,shirtMat);
  leftArm.position.set(-0.30,1.10,0);
  rightArm.position.set(0.30,1.10,0);
  leftArm.rotation.z=-0.18;
  rightArm.rotation.z=0.18;
  person.add(leftArm,rightArm);

  const leftLeg = new THREE.Mesh(legGeo,pantsMat);
  const rightLeg = new THREE.Mesh(legGeo,pantsMat);
  leftLeg.position.set(-0.12,0.48,0);
  rightLeg.position.set(0.12,0.48,0);
  person.add(leftLeg,rightLeg);

  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.08,0.28),shoeMat);
  const rightShoe = leftShoe.clone();
  leftShoe.position.set(-0.12,0.10,0.07);
  rightShoe.position.set(0.12,0.10,0.07);
  person.add(leftShoe,rightShoe);

  person.userData.leftArm=leftArm;
  person.userData.rightArm=rightArm;
  person.userData.leftLeg=leftLeg;
  person.userData.rightLeg=rightLeg;
  person.userData.phase=index*0.7;
  person.userData.speed=0.11+((index%4)*0.018);
  person.userData.progress=-index*0.035;
  person.userData.evacuated=false;
  person.scale.setScalar(0.92);

  return person;
}

function buildPersonEvacuationCurve(person, safeStair){
  const stairA = safeStair === 'STAIR_A';
  const stairX = stairA ? -15.5 : 15.5;
  const stairEntryZ = stairA ? -2.5 : 2.5;
  const floorIdx = Number.isFinite(person.userData.floorIdx) ? person.userData.floorIdx : 0;
  const yBase = FLOOR_Y[floorIdx] + 0.35;
  const start = person.position.clone();
  start.y = yBase;
  const pts = [start];
  pts.push(new THREE.Vector3(start.x, yBase, 0));
  pts.push(new THREE.Vector3(stairX, yBase, 0));
  pts.push(new THREE.Vector3(stairX, yBase, stairEntryZ));
  for(let f=floorIdx; f>=0; f--){
    const yy=FLOOR_Y[f]+0.35;
    const zz=stairA ? -4.0 : 4.0;
    pts.push(new THREE.Vector3(stairX,yy,zz));
    if(f>0) pts.push(new THREE.Vector3(stairX,FLOOR_Y[f-1]+0.35,stairA?-6.5:6.5));
  }
  const exitX=stairA ? B.X0-1.5 : B.X1+1.5;
  pts.push(new THREE.Vector3(exitX,0.35,0));
  pts.push(new THREE.Vector3(exitX+(stairA?-14:14),0.35,20));
  pts.push(new THREE.Vector3(-32,0.35,26));
  return new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.22);
}

function prepareAmbientPeopleForEvacuation(safeStair){
  ambientPeople.forEach((p,i)=>{
    p.userData.evacuating=true;
    p.userData.evacuated=false;
    p.userData.evacCurve=buildPersonEvacuationCurve(p,safeStair);
    p.userData.progress=0;
    p.userData.speed=0.075+((i%5)*0.008);
    p.userData.phase=i*0.7;
    p.userData.floorIdx=p.userData.floorIdx ?? Math.max(0,Math.round((p.position.y-0.08)/4));
    p.userData.ambient=false;
    p.scale.setScalar(1.22);
  });
  return ambientPeople.slice();
}

function updateEvacuation(dt){
  const ev=state.evac;
  if(!ev || !ev.people || !ev.people.length) return;
  ev.people.forEach((p,i)=>{
    if(p.userData.evacuated) return;
    const curve=p.userData.evacCurve;
    if(!curve) return;
    p.userData.progress += dt*(p.userData.speed||0.075);
    const t=Math.min(p.userData.progress,1);
    p.position.copy(curve.getPointAt(t));
    const tangent=curve.getTangentAt(Math.min(t,0.999));
    p.rotation.y=Math.atan2(tangent.x,tangent.z);
    const walk=Math.sin(performance.now()*0.014+(p.userData.phase||i))*0.68;
    p.userData.leftArm.rotation.x=walk;
    p.userData.rightArm.rotation.x=-walk;
    p.userData.leftLeg.rotation.x=-walk;
    p.userData.rightLeg.rotation.x=walk;
    if(p.userData.progress>=1){
      p.userData.evacuated=true;
      p.userData.leftArm.rotation.x=0;
      p.userData.rightArm.rotation.x=0;
      p.userData.leftLeg.rotation.x=0;
      p.userData.rightLeg.rotation.x=0;
      ev.evacuatedCount=(ev.evacuatedCount||0)+1;
    }
  });
  if(ev.evacuatedCount>=ev.people.length){
    ev.completed=true;
    if(el('statusText')){
      el('statusText').textContent='✓ EVACUATION COMPLETE';
      el('statusText').style.color='#4dffb8';
    }
  }
}

function buildEvacuation(roomGroup,options={}){
  if(!roomGroup) return;
  const room=roomGroup.userData.room;
  const safeStair=options.safeStair || state.fire?.safeStair || chooseSafeStair(room);
  const route=createRoute(roomGroup,safeStair);
  const people=prepareAmbientPeopleForEvacuation(safeStair);
  state.evac={curve:route.curve,routeGroup:route.routeGroup,people,safeStair,evacuatedCount:0,completed:false,totalPeople:people.length,decision:'AI selected '+safeStair+' from fire location; all occupants routed to that stair.'};
  if(el('statusText')){el('statusText').textContent='⚠ EVACUATION ACTIVE · '+safeStair;el('statusText').style.color='#ffd166';}
  updateEmergencyPanel();
}

function getSpreadCandidates(fireRoom){
  const sameFloor=allRooms.filter(r=>r.floorIdx===fireRoom.floorIdx && r.id!==fireRoom.id);
  const adjacent=sameFloor
    .map(r=>({r,d:Math.hypot(roomCenter(r).x-roomCenter(fireRoom).x,roomCenter(r).z-roomCenter(fireRoom).z)}))
    .filter(x=>x.d<=12)
    .sort((a,b)=>a.d-b.d)
    .map(x=>x.r);
  const upper=allRooms.filter(r=>Math.abs(r.floorIdx-fireRoom.floorIdx)===1)
    .map(r=>({r,d:Math.hypot(roomCenter(r).x-roomCenter(fireRoom).x,roomCenter(r).z-roomCenter(fireRoom).z)}))
    .filter(x=>x.d<=8)
    .sort((a,b)=>a.d-b.d)
    .map(x=>x.r);
  return [...adjacent.slice(0,2),...upper.slice(0,1)];
}

function addSpreadFire(room){
  if(!room || secondaryFires.some(x=>x.room.id===room.id)) return false;
  const yBase=FLOOR_Y[room.floorIdx];
  const group=createFire(room,yBase);
  createSmoke(room,yBase);
  createDangerZone(room,yBase,FLOOR_H[room.floorIdx]);
  secondaryFires.push({room,group,startedAt:Date.now()});
  return true;
}

function startFireSpread(){
  if(!state.fire) return;
  const candidates=getSpreadCandidates(state.fire.room);
  state.fire.spreadCandidates=candidates;
  state.fire.spreadIndex=0;
  state.fire.spreadTimer=0;
  state.fire.spreadActive=true;
}

function updateFireSpread(dt){
  if(!state.fire?.spreadActive) return;
  state.fire.spreadTimer+=dt;
  if(state.fire.spreadIndex < state.fire.spreadCandidates.length && state.fire.spreadTimer>=4){
    const room=state.fire.spreadCandidates[state.fire.spreadIndex++];
    addSpreadFire(room);
    state.fire.spreadTimer=0;
    state.fire.affectedRooms = getAffectedRooms(state.fire.room);
    if(state.emergency){
      state.emergency.affectedRooms=Math.max(state.emergency.affectedRooms,state.fire.affectedRooms.length+secondaryFires.length);
      state.emergency.peopleAtRisk=Math.max(state.emergency.peopleAtRisk,state.emergency.affectedRooms*8);
    }
    updateEmergencyPanel();
  }
  if(state.fire.spreadIndex>=state.fire.spreadCandidates.length) state.fire.spreadActive=false;
}

function clearEmergencyObjects(){
  smokeParticles.forEach(p=>p.parent?.remove(p));
  smokeParticles.length=0;
  // Keep ambient people in the scene; only remove previous emergency objects.
  const keep = new Set(ambientPeople);
  [...simGroup.children].forEach(child=>{
    if(!keep.has(child)) simGroup.remove(child);
  });
  restoreRoomVisuals();
  state.fire=null;
  state.evac=null;
  state.emergency=null;
  fireLight=null;
  fireLights.length=0;
  dangerZone=null;
  dangerZones.length=0;
  dangerEdges=null;
  dangerEdgesList.length=0;
  secondaryFires.length=0;
  routeGroup=null;
}

function startFire(roomGroup,forceRoom=null,options={}){
  // Start an emergency without reloading or rebuilding the page.
  // The normal building and ambient people remain visible on every floor.
  clearEmergencyObjects();
  if(forceRoom) roomGroup=forceRoom._group;
  if(!roomGroup){
    const fIdx=state.activeFloor==='all'?2:parseInt(state.activeFloor,10);
    const candidates=allRooms.filter(r=>r.floorIdx===fIdx);
    if(!candidates.length) return;
    roomGroup=candidates[Math.floor(Math.random()*candidates.length)]._group;
  }

  const room=roomGroup.userData.room;
  const fIdx=roomGroup.userData.floorIdx;
  // Keep all five floors visible; gently focus the camera on the incident.
  const cx=(room.x1+room.x2)/2, cz=(room.z1+room.z2)/2;
  camera.position.set(cx+28,FLOOR_Y[fIdx]+20,cz+32);
  controls.target.set(0,9,0);
  controls.update();
  setEmergencyStructureView(true,fIdx);
  const yBase=FLOOR_Y[fIdx];
  const affected=markAffectedRooms(room);
  createDangerZone(room,yBase,FLOOR_H[fIdx]);
  const fireGroup=createFire(room,yBase);
  createSmoke(room,yBase);
  const safeStair=options.safeStair || chooseSafeStair(room);
  const risk=affected.length>=5?'HIGH':affected.length>=3?'MEDIUM':'LOW';

  state.fire={room,fIdx,x:cx,z:cz,y:yBase,group:fireGroup,safeStair,risk,affectedRooms:affected};
  state.emergency={active:true,severity:risk,affectedRooms:affected.length,peopleAtRisk:ambientPeople.length,safeStair,startedAt:new Date().toLocaleTimeString()};

  if(el('statusText')){
    el('statusText').textContent='⚠ FIRE DETECTED · '+room.id;
    el('statusText').style.color='#ff6b6b';
  }
  updateEmergencyPanel();
  window.dispatchEvent(new CustomEvent('resq3d:emergency-started',{detail:{room,fIdx}}));
  // All random occupants already inside the building become evacuees.
  buildEvacuation(roomGroup,{safeStair});
  if(options.spread) startFireSpread();
}


function populateEmergencyRooms(){
  const floorSel=el('emergencyFloor');
  const roomSel=el('emergencyRoom');
  if(!floorSel || !roomSel) return;
  floorSel.innerHTML='';
  LEVEL_NAMES.forEach((name,i)=>{
    const o=document.createElement('option');o.value=String(i);o.textContent=name;floorSel.appendChild(o);
  });
  const refresh=()=>{
    const idx=parseInt(floorSel.value,10);
    roomSel.innerHTML='';
    allRooms.filter(r=>r.floorIdx===idx).forEach(r=>{
      const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' — '+r.name;roomSel.appendChild(o);
    });
  };
  floorSel.addEventListener('change',refresh);
  refresh();
}

function setupEmergencyUI(){
  populateEmergencyRooms();
  const start=el('btnStartEmergency');
  if(start) start.onclick=()=>{
    const id=el('emergencyRoom')?.value;
    const room=allRooms.find(r=>r.id===id);
    if(room) startFire(room._group);
  };
  const sev=el('emergencySeverity');
  if(sev) sev.addEventListener('change',()=>{ state.manualSeverity=sev.value; });
  updateEmergencyPanel();
}

function updateEmergencyPanel(){
  const box=el('emergencyInfo');
  if(!box) return;
  if(!state.emergency || !state.fire){
    box.innerHTML='<div class="em-empty">No active emergency<br><span>Select a floor and room to simulate an incident.</span></div>';
    return;
  }
  const e=state.emergency,f=state.fire;
  box.innerHTML=`
    <div class="em-status"><span class="em-dot"></span> EMERGENCY ACTIVE</div>
    <div class="em-grid">
      <div><span>Location</span><b>${f.room.name}</b></div>
      <div><span>Floor</span><b>${LEVEL_NAMES[f.fIdx]}</b></div>
      <div><span>Severity</span><b class="risk-${e.severity.toLowerCase()}">${e.severity}</b></div>
      <div><span>Affected Rooms</span><b>${e.affectedRooms}</b></div>
      <div><span>Spread Status</span><b>${state.fire?.spreadActive?'SPREADING':'CONTAINED'}</b></div>
      <div><span>People at Risk</span><b>${e.peopleAtRisk}</b></div>
      <div><span>Safe Stair</span><b>${e.safeStair}</b></div>
    </div>
    <div class="em-route">🟢 Safe route: <strong>Room → Corridor → ${e.safeStair} → Ground Exit → Assembly Point</strong></div>
    <div class="em-route em-people">👥 Evacuation: <strong>${state.evac?.evacuatedCount||0} / ${state.evac?.people?.length||0}</strong> people reached the assembly point.</div>
    <div class="em-route">🧠 AI decision: <strong>${state.evac?.decision||('Use '+e.safeStair+' based on fire location.')}</strong></div>`;
}

window.__RESQ_SIM={
  get smokeParticles(){return smokeParticles;},
  get fireLight(){return fireLight;},
  get fireLights(){return fireLights;},
  get dangerZones(){return dangerZones;},
  get dangerEdgesList(){return dangerEdgesList;},
  get secondaryFires(){return secondaryFires;},
  updateFireSpread,
  get dangerZone(){return dangerZone;},
  get routeGroup(){return routeGroup;},
  get ambientPeople(){return ambientPeople;}
};

function setupAmbientPeople(){ createAmbientPeople(); }

export { clearSimulation,startFire,buildEvacuation,setupEmergencyUI,updateEmergencyPanel,updateEvacuation,chooseSafeStair,updateFireSpread,startFireSpread,addSpreadFire,setupAmbientPeople,focusEmergencyCamera };

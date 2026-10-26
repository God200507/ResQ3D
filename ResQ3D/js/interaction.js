import * as THREE from 'three';
import { FLOOR_Y, LEVEL_NAMES, LEVEL_TAGS, ROOM_TYPES } from './config.js';
import { buildingGroup, siteGroup, camera, controls, renderer, floorGroups } from './scene.js';
import { allRooms } from './building.js';
import { MAT } from './materials.js';
import { state } from './state.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
const rightPanel = document.getElementById('rightPanel');
let hoveredRoom = null;
let selectedRoom = null;

function setPointer(e){ pointer.x=(e.clientX/innerWidth)*2-1; pointer.y=-(e.clientY/innerHeight)*2+1; }
function roomFromObject(obj){ let o=obj; while(o){ if(o.userData&&o.userData.isRoom) return o; o=o.parent; } return null; }
function highlightRoom(group,on){ if(!group) return; const fm=group.userData.floorMesh; if(!fm||!fm.material)return; fm.material.emissive=new THREE.Color(on?0x00d4ff:0x000000); fm.material.emissiveIntensity=on?0.55:0; }
function selectRoom(group){ if(selectedRoom)highlightRoom(selectedRoom,false); selectedRoom=group; highlightRoom(group,true); const room=group.userData.room,typeInfo=ROOM_TYPES[room.type],floorIdx=group.userData.floorIdx; const tag=document.getElementById('rpTag'); tag.textContent=typeInfo.tag; tag.style.background=`rgba(${(typeInfo.color>>16)&255},${(typeInfo.color>>8)&255},${typeInfo.color&255},0.22)`; tag.style.color=`#${typeInfo.color.toString(16).padStart(6,'0')}`; tag.style.border=`1px solid rgba(${(typeInfo.color>>16)&255},${(typeInfo.color>>8)&255},${typeInfo.color&255},0.5)`; document.getElementById('rpTitle').textContent=room.name; document.getElementById('rpId').textContent=room.id; const capMap={class:60,lab:40,seminar:150,faculty:20,office:15,common:40,lobby:80,wash:12,storage:4}; const cap=capMap[room.type]||30; const nearest=(room.x1+room.x2)/2<0?'STAIR_A (Main, NW)':'STAIR_B (Emergency, SE)'; const exit=(room.x1+room.x2)/2<0?'West Emergency Exit':'East Fire Escape'; document.getElementById('rpBody').innerHTML=`<div class="rp-row"><span class="k">Level</span><span class="v">${LEVEL_NAMES[floorIdx]}</span></div><div class="rp-row"><span class="k">Category</span><span class="v">${typeInfo.label}</span></div><div class="rp-row"><span class="k">Floor Area</span><span class="v">${room.area.toFixed(1)} m²</span></div><div class="rp-row"><span class="k">Dimensions</span><span class="v">${(room.x2-room.x1).toFixed(1)} × ${(room.z2-room.z1).toFixed(1)} m</span></div><div class="rp-row"><span class="k">Est. Capacity</span><span class="v">${cap} persons</span></div><div class="rp-row"><span class="k">Primary Exit</span><span class="v">Corridor Door</span></div><div class="rp-row"><span class="k">Nearest Stair</span><span class="v">${nearest}</span></div><div class="rp-row"><span class="k">Evac. Direction</span><span class="v">${exit}</span></div><div class="rp-row"><span class="k">Smoke Detector</span><span class="v" style="color:#4dffb8">Installed</span></div><div class="rp-row"><span class="k">Fire Alarm</span><span class="v" style="color:#4dffb8">In Corridor</span></div><div class="rp-row" style="border:none"><span class="k">Status</span><span class="v" style="color:#4dffb8">● SAFE</span></div>`; rightPanel.classList.add('show'); }
function deselectRoom(){if(selectedRoom)highlightRoom(selectedRoom,false); selectedRoom=null; rightPanel.classList.remove('show');}
function getSelectedRoom(){return selectedRoom;}

renderer.domElement.addEventListener('pointermove',e=>{setPointer(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(buildingGroup.children,true);let found=null;for(const h of hits){const r=roomFromObject(h.object);if(r&&r.visible){found=r;break;}}if(found!==hoveredRoom){if(hoveredRoom&&hoveredRoom!==selectedRoom)highlightRoom(hoveredRoom,false);hoveredRoom=found;if(hoveredRoom&&hoveredRoom!==selectedRoom)highlightRoom(hoveredRoom,true);}if(found){tooltip.style.display='block';tooltip.style.left=(e.clientX+16)+'px';tooltip.style.top=(e.clientY-10)+'px';tooltip.textContent=found.userData.room.name;document.body.style.cursor='pointer';}else{tooltip.style.display='none';document.body.style.cursor='default';}});
renderer.domElement.addEventListener('pointerdown',e=>{setPointer(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(buildingGroup.children,true);let found=null;for(const h of hits){const r=roomFromObject(h.object);if(r&&r.visible){found=r;break;}}if(found)selectRoom(found);else deselectRoom();});
document.getElementById('rpClose').onclick=deselectRoom;

const floorList=document.getElementById('floorList');
function makeFloorBtn(label,tag,value){const b=document.createElement('button');b.className='floor-btn'+(value==='all'?' active':'');b.dataset.value=value;b.innerHTML=`<span class="badge">${tag}</span><span>${label}</span>`;b.onclick=()=>setActiveFloor(value);return b;}
floorList.appendChild(makeFloorBtn('All Floors','ALL','all'));for(let i=4;i>=0;i--)floorList.appendChild(makeFloorBtn(LEVEL_NAMES[i],LEVEL_TAGS[i],String(i)));
function setActiveFloor(value){state.activeFloor=value;document.querySelectorAll('.floor-btn').forEach(b=>b.classList.toggle('active',b.dataset.value===value));if(value==='all'){floorGroups.forEach(g=>g.visible=true);controls.target.set(0,9,0);}else{const idx=parseInt(value,10);floorGroups.forEach((g,i)=>g.visible=i===idx);controls.target.set(0,FLOOR_Y[idx]+2,0);const dist=42,ang=Math.PI*0.28;camera.position.set(Math.sin(ang)*dist,FLOOR_Y[idx]+26,Math.cos(ang)*dist);}if(selectedRoom&&!selectedRoom.visible)deselectRoom();}

document.querySelectorAll('.toggle').forEach(t=>{t.onclick=()=>{t.classList.toggle('on');state.layers[t.dataset.layer]=t.classList.contains('on');applyLayers();};});
function applyLayers(){allRooms.forEach(r=>{if(r._group&&r._group.userData.label)r._group.userData.label.visible=false;});floorGroups.forEach(fg=>fg.children.forEach(c=>{if(c.name==='SAFETY_EQUIPMENT')c.visible=state.layers.safety;}));siteGroup.visible=state.layers.exterior;buildingGroup.traverse(o=>{if(o.isMesh&&o.material===MAT.wall)o.material=state.layers.structure?MAT.wallXray:MAT.wall;});}

export { getSelectedRoom, deselectRoom, setActiveFloor, applyLayers };

import * as THREE from 'three';
import { B } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh, safeMerge, makeTextSprite } from './utils.js';
import { siteGroup } from './scene.js';

function buildSite() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), MAT.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.32;
  ground.receiveShadow = true;
  siteGroup.add(ground);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(52, 0.3, 34), MAT.concrete);
  apron.position.set(0, -0.16, 0);
  apron.receiveShadow = true;
  siteGroup.add(apron);

  const road = new THREE.Mesh(new THREE.BoxGeometry(120, 0.06, 9), MAT.asphalt);
  road.position.set(0, -0.28, 30);
  road.receiveShadow = true;
  siteGroup.add(road);

  const parkGeos = [];
  for (let i = 0; i < 8; i++) parkGeos.push(boxGeo(2.6, 0.06, 5.2, -22 + i * 5.6, -0.26, 22));
  const park = mergedMesh(parkGeos, MAT.asphalt);
  if (park) siteGroup.add(park);

  const lineGeos = [];
  for (let i = 0; i <= 8; i++) lineGeos.push(boxGeo(0.12, 0.02, 5.2, -24.8 + i * 5.6, -0.22, 22));
  const lineGeom = safeMerge(lineGeos);
  if (lineGeom) {
    const lines = new THREE.Mesh(lineGeom, new THREE.MeshBasicMaterial({ color: 0xb9c6d1 }));
    siteGroup.add(lines);
  }

  const pathGeos = [boxGeo(6, 0.06, 22, 0, -0.24, 19), boxGeo(14, 0.06, 4, 0, -0.24, 9.5)];
  const pth = mergedMesh(pathGeos, MAT.path);
  if (pth) siteGroup.add(pth);

  const asmGeo = new THREE.CircleGeometry(7, 40);
  const asmMat = new THREE.MeshStandardMaterial({ color: 0x1e6b47, roughness: 0.9, transparent: true, opacity: 0.85 });
  const asm = new THREE.Mesh(asmGeo, asmMat);
  asm.rotation.x = -Math.PI / 2;
  asm.position.set(-32, -0.26, 26);
  siteGroup.add(asm);

  const asmRing = new THREE.Mesh(
    new THREE.RingGeometry(6.6, 7, 48),
    new THREE.MeshBasicMaterial({ color: 0x4dffb8, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  );
  asmRing.rotation.x = -Math.PI / 2;
  asmRing.position.set(-32, -0.22, 26);
  siteGroup.add(asmRing);

  const asmLabel = makeTextSprite('ASSEMBLY POINT', { fontSize: 38, scale: 0.014, border: 'rgba(77,255,184,0.85)' });
  asmLabel.position.set(-32, 3.2, 26);
  siteGroup.add(asmLabel);

  const gateGeos = [
    boxGeo(0.7, 3.4, 0.7, -6, 1.7, 34),
    boxGeo(0.7, 3.4, 0.7,  6, 1.7, 34),
    boxGeo(12, 0.35, 0.7, 0, 3.5, 34)
  ];
  const gate = mergedMesh(gateGeos, MAT.metal);
  if (gate) siteGroup.add(gate);

  const gateBar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 0.25), MAT.alarm);
  gateBar.position.set(0, 1.1, 34);
  siteGroup.add(gateBar);

  const gateLabel = makeTextSprite('SECURITY GATE', { fontSize: 36, scale: 0.013, border: 'rgba(0,212,255,0.7)' });
  gateLabel.position.set(0, 5.2, 34);
  siteGroup.add(gateLabel);

  // Trees
  const trunkGeos = [], leafGeos = [];
  const treeSpots = [
    [-40, -14], [-40, 6], [-40, 22], [40, -14], [40, 6], [40, 22],
    [-24, 34], [24, 34], [-46, 34], [46, 34], [-15, -24], [15, -24],
    [-34, -24], [34, -24]
  ];
  treeSpots.forEach(([x, z], i) => {
    const s = 0.85 + (i % 3) * 0.18;
    trunkGeos.push(boxGeo(0.55 * s, 3.4 * s, 0.55 * s, x, 1.4 * s, z));
    const c1 = new THREE.IcosahedronGeometry(2.3 * s, 0); c1.translate(x, 4.6 * s, z);
    const c2 = new THREE.IcosahedronGeometry(1.7 * s, 0); c2.translate(x + 0.9 * s, 6.0 * s, z - 0.6 * s);
    const c3 = new THREE.IcosahedronGeometry(1.5 * s, 0); c3.translate(x - 0.9 * s, 5.7 * s, z + 0.7 * s);
    leafGeos.push(c1, c2, c3);
  });
  const trunks = mergedMesh(trunkGeos, new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 }));
  const leaves = mergedMesh(leafGeos, MAT.green);
  if (trunks) siteGroup.add(trunks);
  if (leaves) siteGroup.add(leaves);

  const bedGeos = [boxGeo(16, 0.5, 3.2, -14, -0.05, 15), boxGeo(16, 0.5, 3.2, 14, -0.05, 15)];
  const beds = mergedMesh(bedGeos, new THREE.MeshStandardMaterial({ color: 0x2b5c3c, roughness: 0.95 }));
  if (beds) siteGroup.add(beds);

  const lampGeos = [], lampHeads = [];
  [[-30, 30], [30, 30], [-30, 12], [30, 12], [-30, -12], [30, -12]].forEach(([x, z]) => {
    lampGeos.push(boxGeo(0.25, 6, 0.25, x, 3, z));
    lampHeads.push(boxGeo(1.4, 0.25, 0.5, x, 6.1, z));
  });
  const lamps = mergedMesh(lampGeos, MAT.metal);
  const heads = mergedMesh(lampHeads, new THREE.MeshStandardMaterial({
    color: 0xffe6a8, emissive: 0xffcc55, emissiveIntensity: 0.9, roughness: 0.4
  }));
  if (lamps) siteGroup.add(lamps);
  if (heads) siteGroup.add(heads);
}


export { buildSite };

import * as THREE from 'three';
import { B } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh } from './utils.js';
import { addWall, addGlass, addDoor } from './geometry.js';
import { makeTextSprite } from './utils.js';

function buildStairwell(parent, posX, posZ, rotY, yBase, floorH, label, isFireEscape) {
  const grp = new THREE.Group();
  grp.position.set(posX, yBase, posZ);
  grp.rotation.y = rotY;
  grp.name = label || 'STAIRWELL';

  const W = 5, D = 7.5;
  const halfH = floorH / 2;
  const runLen = 3.4;
  const zFlightStart = 2.5;
  const steps = 11;

  const treadMat = MAT.stair;

  const landingS = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.16, 2.5), treadMat);
  landingS.position.set(W / 2, 0.02, 1.25);
  landingS.receiveShadow = true;
  grp.add(landingS);

  const stepGeos = [];
  const stepRise = halfH / steps;
  const stepRun = runLen / steps;
  const flightX1 = 0.35, flightW = 2.1;

  for (let i = 0; i < steps; i++) {
    const y = (i + 1) * stepRise;
    const z = zFlightStart + (i + 0.5) * stepRun;
    stepGeos.push(boxGeo(flightW, 0.16, stepRun, flightX1 + flightW / 2, y - 0.08, z));
    stepGeos.push(boxGeo(flightW, stepRise, 0.06, flightX1 + flightW / 2, y - stepRise / 2, z + stepRun / 2));
  }
  const strGeo1 = new THREE.BoxGeometry(flightW, 0.25, runLen);
  strGeo1.translate(flightX1 + flightW / 2, halfH / 2 - 0.15, zFlightStart + runLen / 2);
  stepGeos.push(strGeo1);

  const landingN = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.16, 1.7), treadMat);
  landingN.position.set(W / 2, halfH + 0.02, zFlightStart + runLen + 0.85);
  landingN.receiveShadow = true;
  grp.add(landingN);

  const flightX2 = 2.6;
  for (let i = 0; i < steps; i++) {
    const y = halfH + (i + 1) * stepRise;
    const z = zFlightStart + runLen - (i + 0.5) * stepRun;
    stepGeos.push(boxGeo(flightW, 0.16, stepRun, flightX2 + flightW / 2, y - 0.08, z));
    stepGeos.push(boxGeo(flightW, stepRise, 0.06, flightX2 + flightW / 2, y - stepRise / 2, z - stepRun / 2));
  }
  const strGeo2 = new THREE.BoxGeometry(flightW, 0.25, runLen);
  strGeo2.translate(flightX2 + flightW / 2, halfH + halfH / 2 - 0.15, zFlightStart + runLen / 2);
  stepGeos.push(strGeo2);

  const stepMesh = mergedMesh(stepGeos, treadMat);
  if (stepMesh) grp.add(stepMesh);

  const railGeos = [];
  const railH = 1.0;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    railGeos.push(boxGeo(0.08, railH, 0.08, flightX1 + 0.05, t * halfH + railH / 2, zFlightStart + t * runLen));
  }
  railGeos.push(boxGeo(0.09, 0.09, runLen, flightX1 + 0.05, halfH + railH, zFlightStart + runLen / 2));
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    railGeos.push(boxGeo(0.08, railH, 0.08, W / 2, t * halfH + railH / 2, zFlightStart + t * runLen));
    railGeos.push(boxGeo(0.08, railH, 0.08, W / 2, halfH + t * halfH + railH / 2, zFlightStart + runLen - t * runLen));
  }
  railGeos.push(boxGeo(0.09, 0.09, runLen, W / 2, halfH + railH, zFlightStart + runLen / 2));
  railGeos.push(boxGeo(0.09, 0.09, runLen, W / 2, floorH + railH, zFlightStart + runLen / 2));
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    railGeos.push(boxGeo(0.08, railH, 0.08, flightX2 + flightW - 0.05, halfH + t * halfH + railH / 2, zFlightStart + runLen - t * runLen));
  }
  railGeos.push(boxGeo(0.09, 0.09, runLen, flightX2 + flightW - 0.05, floorH + railH, zFlightStart + runLen / 2));

  const rails = mergedMesh(railGeos, MAT.stairRail);
  if (rails) grp.add(rails);

  const shellMat = isFireEscape
    ? new THREE.MeshStandardMaterial({ color: 0x6b7684, roughness: 0.85 })
    : MAT.wall;

  addWall(grp, 0, D, W, D, 0, floorH, B.WALL_T, shellMat,
    [{ a: W * 0.25, b: W * 0.75, yA: 1.0, yB: floorH - 1.0 }]);
  addGlass(grp, W * 0.25, D, W * 0.75, D, 0, 1.0, floorH - 1.0);
  addWall(grp, 0, 0.6, 0, D, 0, floorH, B.WALL_T, shellMat,
    [{ a: 2.0, b: 5.0, yA: 1.0, yB: floorH - 1.0 }]);
  addGlass(grp, 0, 0.6, 0, D, 0, 1.0, floorH - 1.0);
  addWall(grp, W, 0.6, W, D, 0, floorH, B.WALL_T, shellMat,
    [{ a: 2.0, b: 5.0, yA: 1.0, yB: floorH - 1.0 }]);
  addGlass(grp, W, 0.6, W, D, 0, 1.0, floorH - 1.0);
  addWall(grp, 0, 0, W, 0, 0, floorH, B.WALL_T, shellMat,
    [{ a: 1.0, b: 3.0, yA: 0, yB: 2.4 }]);
  addDoor(grp, 2.0, 0, 0, 0, 2.0, 2.4, MAT.door);

  const swSlab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), MAT.slab);
  swSlab.position.set(W / 2, -0.1, D / 2);
  swSlab.receiveShadow = true;
  grp.add(swSlab);

  if (label) {
    const lbl = makeTextSprite(label, { fontSize: 40, scale: 0.012, border: 'rgba(255,255,255,0.5)' });
    lbl.position.set(W / 2, floorH + 0.9, D / 2);
    grp.add(lbl);
  }

  parent.add(grp);
  return grp;
}

export { buildStairwell };

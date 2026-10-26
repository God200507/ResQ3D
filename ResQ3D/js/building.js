import * as THREE from 'three';
import { B, FLOOR_Y, FLOOR_H, ROOF_Y, FLOOR_PROGRAMME, NORTH_SLOTS, SOUTH_SLOTS } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh } from './utils.js';
import { addWall, addGlass, addDoor } from './geometry.js';
import { buildStairwell } from './stair.js';
import { buildElevator } from './elevator.js';
import { buildRoom } from './room.js';
import { buildSafetyEquipment } from './safety.js';
import { buildingGroup, floorGroups } from './scene.js';

const allRooms = [];
function buildBuilding() {
  const facadeGeos = [];
  facadeGeos.push(boxGeo(37.4, 0.9, 0.5, 0, ROOF_Y + 0.45, B.Z0 - 0.1));
  facadeGeos.push(boxGeo(37.4, 0.9, 0.5, 0, ROOF_Y + 0.45, B.Z1 + 0.1));
  facadeGeos.push(boxGeo(0.5, 0.9, 20.9, B.X0 - 0.1, ROOF_Y + 0.45, 0));
  facadeGeos.push(boxGeo(0.5, 0.9, 20.9, B.X1 + 0.1, ROOF_Y + 0.45, 0));
  const parapet = mergedMesh(facadeGeos, MAT.facade);
  if (parapet) buildingGroup.add(parapet);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.35, 21.4), MAT.slab);
  roof.position.set(0, ROOF_Y - 0.175, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  buildingGroup.add(roof);

  const roofGeos = [
    boxGeo(4, 1.8, 3, -8, ROOF_Y + 0.9, 4),
    boxGeo(3, 1.4, 2.5, 8, ROOF_Y + 0.7, -4),
    boxGeo(1.2, 3.5, 1.2, 0, ROOF_Y + 1.75, 6)
  ];
  const roofEq = mergedMesh(roofGeos, MAT.metal);
  if (roofEq) buildingGroup.add(roofEq);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), MAT.metal);
  antenna.position.set(0, ROOF_Y + 4.3, 6);
  buildingGroup.add(antenna);

  for (let f = 0; f < 5; f++) {
    const fg = new THREE.Group();
    fg.name = 'LEVEL_' + f;
    fg.userData = { floorIdx: f, isFloor: true };
    floorGroups.push(fg);
    buildingGroup.add(fg);

    const yBase = FLOOR_Y[f];
    const fh = FLOOR_H[f];

    const slab = new THREE.Mesh(new THREE.BoxGeometry(37.4, B.SLAB_T, 21.4), MAT.slab);
    slab.position.set(0, yBase - B.SLAB_T / 2, 0);
    slab.receiveShadow = true;
    slab.castShadow = true;
    fg.add(slab);

    const corr = new THREE.Mesh(new THREE.BoxGeometry(36, 0.08, 5), MAT.corridor);
    corr.position.set(0, yBase + 0.05, 0);
    corr.receiveShadow = true;
    fg.add(corr);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(36, 0.02, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00a0cc, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.7 }));
    strip.position.set(0, yBase + 0.1, 0);
    fg.add(strip);

    FLOOR_PROGRAMME[f].forEach(def => {
      let geom;
      if (def.span) geom = def.span;
      else {
        const s = NORTH_SLOTS[def.slot] || SOUTH_SLOTS[def.slot];
        geom = { x1: s.x1, x2: s.x2, z1: s.z1, z2: s.z2 };
      }
      const room = {
        id: def.id, name: def.name, type: def.type, floorIdx: f,
        x1: geom.x1, x2: geom.x2, z1: geom.z1, z2: geom.z2,
        mainEntrance: !!def.mainEntrance
      };
      room.area = (room.x2 - room.x1) * (room.z2 - room.z1);
      const rg = buildRoom(fg, room, yBase, fh, f);
      allRooms.push(room);
      room._group = rg;
    });

    buildStairwell(fg, -13, -2.5, Math.PI, yBase, fh,
      f === 0 ? 'MAIN STAIRCASE' : '', false);
    buildStairwell(fg, 13, 2.5, 0, yBase, fh,
      f === 0 ? 'EMERGENCY STAIRCASE' : '', true);
    buildElevator(fg, f, yBase, fh);

    const lob = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.06, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x2f4a5e, roughness: 0.5, metalness: 0.4 }));
    lob.position.set(0, yBase + 0.06, -4.25);
    fg.add(lob);

    const safety = buildSafetyEquipment(fg, yBase, fh);
    safety.userData.layer = 'safety';

    if (f === 0) {
      addDoor(fg, B.X0 - 0.05, 0, Math.PI / 2, 0.08, 1.6, 2.5, MAT.doorExit, true);
      addDoor(fg, B.X1 + 0.05, 0, Math.PI / 2, 0.08, 1.6, 2.5, MAT.doorExit, true);
    } else {
      addDoor(fg, B.X1 + 0.05, 0, Math.PI / 2, 0.08, 1.6, 2.5, MAT.doorExit, true);
    }

    if (f > 0) {
      addWall(fg, B.X0, B.CZ0, B.X0, B.CZ1, 0.08, fh - 0.32, B.WALL_T, MAT.wall,
        [{ a: 1.6, b: 3.4, yA: 1.0, yB: fh - 1.1 }]);
      addGlass(fg, B.X0, B.CZ0, B.X0, B.CZ1, 0.08, 1.0, fh - 1.1);
      addWall(fg, B.X1, B.CZ0, B.X1, B.CZ1, 0.08, fh - 0.32, B.WALL_T, MAT.wall,
        [{ a: 1.6, b: 3.2, yA: 0, yB: 2.5 }]);
    } else {
      addWall(fg, B.X0, B.CZ0, B.X0, B.CZ1, 0.08, fh - 0.32, B.WALL_T, MAT.wall,
        [{ a: 1.7, b: 3.3, yA: 0, yB: 2.5 }]);
      addWall(fg, B.X1, B.CZ0, B.X1, B.CZ1, 0.08, fh - 0.32, B.WALL_T, MAT.wall,
        [{ a: 1.7, b: 3.3, yA: 0, yB: 2.5 }]);
    }
  }

  const canopyY = FLOOR_Y[0] + FLOOR_H[0] - 0.3;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(13, 0.35, 5.5), MAT.facade);
  canopy.position.set(0, canopyY, B.Z1 + 2.6);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  buildingGroup.add(canopy);

  const canopySupports = mergedMesh([
    boxGeo(0.35, canopyY, 0.35, -6, canopyY / 2, B.Z1 + 5.1),
    boxGeo(0.35, canopyY, 0.35, 6, canopyY / 2, B.Z1 + 5.1)
  ], MAT.metal);
  if (canopySupports) buildingGroup.add(canopySupports);

  const canopyGlow = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.06, 5.1),
    new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00a0cc, emissiveIntensity: 0.8 }));
  canopyGlow.position.set(0, canopyY - 0.2, B.Z1 + 2.6);
  buildingGroup.add(canopyGlow);

  // Fire escape
  const feGroup = new THREE.Group();
  feGroup.name = 'FIRE_ESCAPE';
  const feX = B.X1 + 1.8;
  const feMat = MAT.ext;

  for (let f = 0; f < 5; f++) {
    const y = FLOOR_Y[f];
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 7), feMat);
    plat.position.set(feX, y + 0.06, 0);
    plat.castShadow = true;
    feGroup.add(plat);

    const railGeos = [];
    for (let i = 0; i <= 6; i++)
      railGeos.push(boxGeo(0.07, 1.05, 0.07, feX + 1.65, y + 0.6, -3.2 + i * 1.07));
    railGeos.push(boxGeo(0.08, 0.08, 7, feX + 1.65, y + 1.1, 0));
    railGeos.push(boxGeo(3.4, 0.08, 0.08, feX, y + 1.1, -3.4));
    railGeos.push(boxGeo(3.4, 0.08, 0.08, feX, y + 1.1, 3.4));
    const rails = mergedMesh(railGeos, MAT.stairRail);
    if (rails) feGroup.add(rails);

    if (f < 4) {
      const nextY = FLOOR_Y[f + 1];
      const rise = nextY - y;
      const steps = 12;
      const stepGeos = [];
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        stepGeos.push(boxGeo(1.4, 0.12, 0.36, feX + 0.85, y + t * rise, 3.2 - t * 6.2));
      }
      const st = mergedMesh(stepGeos, feMat);
      if (st) feGroup.add(st);
    }
  }
  const colGeos = [
    boxGeo(0.22, ROOF_Y, 0.22, feX + 1.6, ROOF_Y / 2, -3.3),
    boxGeo(0.22, ROOF_Y, 0.22, feX + 1.6, ROOF_Y / 2, 3.3)
  ];
  const cols = mergedMesh(colGeos, feMat);
  if (cols) feGroup.add(cols);
  buildingGroup.add(feGroup);

  // Mullions
  const mullGeos = [];
  for (let x = -18; x <= 18; x += 3) {
    mullGeos.push(boxGeo(0.16, ROOF_Y, 0.16, x, ROOF_Y / 2, B.Z1 + 0.06));
    mullGeos.push(boxGeo(0.16, ROOF_Y, 0.16, x, ROOF_Y / 2, B.Z0 - 0.06));
  }
  for (let z = -10; z <= 10; z += 3.4) {
    mullGeos.push(boxGeo(0.16, ROOF_Y, 0.16, B.X0 - 0.06, ROOF_Y / 2, z));
    mullGeos.push(boxGeo(0.16, ROOF_Y, 0.16, B.X1 + 0.06, ROOF_Y / 2, z));
  }
  const mullions = mergedMesh(mullGeos, MAT.facade);
  if (mullions) buildingGroup.add(mullions);

  // Spandrel bands
  const bandGeos = [];
  for (let f = 0; f < 5; f++) {
    const y = FLOOR_Y[f] + FLOOR_H[f] - 0.45;
    bandGeos.push(boxGeo(37.6, 0.55, 0.3, 0, y, B.Z1 + 0.12));
    bandGeos.push(boxGeo(37.6, 0.55, 0.3, 0, y, B.Z0 - 0.12));
    bandGeos.push(boxGeo(0.3, 0.55, 21.4, B.X0 - 0.12, y, 0));
    bandGeos.push(boxGeo(0.3, 0.55, 21.4, B.X1 + 0.12, y, 0));
  }
  const bands = mergedMesh(bandGeos, MAT.facade);
  if (bands) buildingGroup.add(bands);
}

window.__RESQ_ALL_ROOMS = allRooms;
export { buildBuilding, allRooms };

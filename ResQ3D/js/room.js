import * as THREE from 'three';
import { B, ROOM_TYPES } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh } from './utils.js';
import { addWall, addGlass, addDoor } from './geometry.js';
import { buildFurniture } from './furniture.js';

function buildRoom(parent, room, yBase, floorH, floorIdx) {
  const g = new THREE.Group();
  g.name = room.id;
  g.userData = { room, floorIdx, isRoom: true };

  const { x1, x2, z1, z2 } = room;
  const w = x2 - x1, d = z2 - z1;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const I = B.INSET;
  const T = B.WALL_T;
  const wallH = floorH - 0.32;

  const typeInfo = ROOM_TYPES[room.type] || ROOM_TYPES.common;

  const floorMat = new THREE.MeshStandardMaterial({
    color: typeInfo.color, roughness: 0.85, metalness: 0.03,
    transparent: true, opacity: 0.92
  });
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.07, d - 0.12), floorMat);
  floorMesh.position.set(cx, 0.045, cz);
  floorMesh.receiveShadow = true;
  g.add(floorMesh);
  g.userData.floorMesh = floorMesh;

  const isNorth = Math.abs(z2 - B.CZ0) < 0.01;
  const isSouth = Math.abs(z1 - B.CZ1) < 0.01;

  const walls = [
    { side: 'N', ax: x1 + I, az: z1 + I, bx: x2 - I, bz: z1 + I, ext: Math.abs(z1 - B.Z0) < 0.01 },
    { side: 'S', ax: x1 + I, az: z2 - I, bx: x2 - I, bz: z2 - I, ext: Math.abs(z2 - B.Z1) < 0.01 },
    { side: 'W', ax: x1 + I, az: z1 + I, bx: x1 + I, bz: z2 - I, ext: Math.abs(x1 - B.X0) < 0.01 },
    { side: 'E', ax: x2 - I, az: z1 + I, bx: x2 - I, bz: z2 - I, ext: Math.abs(x2 - B.X1) < 0.01 }
  ];

  let corridorSide = null;
  if (isNorth) corridorSide = 'S';
  else if (isSouth) corridorSide = 'N';
  else if (Math.abs(z1 - B.CZ1) < 0.01) corridorSide = 'N';
  else if (Math.abs(z2 - B.CZ0) < 0.01) corridorSide = 'S';

  let doorWorld = null;

  for (const wl of walls) {
    const len = Math.hypot(wl.bx - wl.ax, wl.bz - wl.az);
    if (len < 0.2) continue;
    const openings = [];
    const isCorridorWall = (wl.side === corridorSide);

    if (isCorridorWall) {
      const dw = 1.2, dh = 2.35;
      const dPos = Math.min(len - dw - 0.4, Math.max(0.4, len * 0.34));
      openings.push({ a: dPos, b: dPos + dw, yA: 0, yB: dh });
    }
    if (wl.ext) {
      const winW = Math.min(len * 0.62, 4.2);
      const start = (len - winW) / 2;
      const sill = 1.0, head = floorH - 1.1;
      openings.push({ a: start, b: start + winW, yA: sill, yB: head });
    }
    addWall(g, wl.ax, wl.az, wl.bx, wl.bz, 0.08, wallH, T, MAT.wall, openings);

    if (wl.ext) {
      const winW = Math.min(len * 0.62, 4.2);
      const start = (len - winW) / 2;
      const sill = 1.0, head = floorH - 1.1;
      const t0 = start / len, t1 = (start + winW) / len;
      addGlass(g,
        wl.ax + (wl.bx - wl.ax) * t0, wl.az + (wl.bz - wl.az) * t0,
        wl.ax + (wl.bx - wl.ax) * t1, wl.az + (wl.bz - wl.az) * t1,
        0.08, sill, head);
    }
    if (isCorridorWall) {
      const dw = 1.2, dh = 2.35;
      const dPos = Math.min(len - dw - 0.4, Math.max(0.4, len * 0.34));
      const mid = (dPos + dw / 2) / len;
      const dx = wl.ax + (wl.bx - wl.ax) * mid;
      const dz = wl.az + (wl.bz - wl.az) * mid;
      const ang = Math.atan2(wl.bz - wl.az, wl.bx - wl.ax);
      addDoor(g, dx, dz, -ang, 0.08, dw, dh, MAT.door);
      doorWorld = new THREE.Vector3(dx, yBase, dz);
    }
  }

  if (room.mainEntrance) {
    const exX = cx;
    const ez = z2 - I;
    const entranceW = 5.0, entranceH = 3.0;
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(entranceW / 2 - 0.06, entranceH, 0.08), MAT.glass);
    doorL.position.set(exX - entranceW / 4 - 0.03, 0.08 + entranceH / 2, ez);
    g.add(doorL);
    const doorR = doorL.clone();
    doorR.position.x = exX + entranceW / 4 + 0.03;
    g.add(doorR);
    const ef = mergedMesh([
      boxGeo(0.16, entranceH + 0.2, 0.2, exX - entranceW / 2, (entranceH + 0.2) / 2, ez),
      boxGeo(0.16, entranceH + 0.2, 0.2, exX + entranceW / 2, (entranceH + 0.2) / 2, ez),
      boxGeo(entranceW + 0.16, 0.18, 0.2, exX, entranceH + 0.1, ez),
      boxGeo(0.14, entranceH, 0.18, exX, entranceH / 2, ez)
    ], MAT.frame);
    if (ef) g.add(ef);
  }

  buildFurniture(room, yBase).forEach(m => g.add(m));

  // Final demo view: room text labels are intentionally disabled.
  g.userData.doorWorld = doorWorld;

  parent.add(g);
  return g;
}

export { buildRoom };

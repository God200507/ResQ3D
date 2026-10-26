import * as THREE from 'three';
import { B } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh } from './utils.js';

function addWall(parent, x1, z1, x2, z2, yBase, height, thick, material, openings = []) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return null;
  const angle = Math.atan2(dz, dx);
  const grp = new THREE.Group();
  grp.position.set((x1 + x2) / 2, yBase, (z1 + z2) / 2);
  grp.rotation.y = -angle;
  const half = len / 2;
  const ops = openings.map(o => ({
    a: Math.max(-half, o.a - half),
    b: Math.min(half, o.b - half),
    yA: o.yA ?? 0,
    yB: o.yB ?? height
  })).sort((p, q) => p.a - q.a);

  const geos = [];
  let cursor = -half;
  for (const o of ops) {
    if (o.a > cursor + 0.005) geos.push(boxGeo(o.a - cursor, height, thick, (cursor + o.a) / 2, height / 2, 0));
    if (o.yA > 0.005)         geos.push(boxGeo(o.b - o.a, o.yA, thick, (o.a + o.b) / 2, o.yA / 2, 0));
    if (o.yB < height - 0.005) geos.push(boxGeo(o.b - o.a, height - o.yB, thick, (o.a + o.b) / 2, (o.yB + height) / 2, 0));
    cursor = Math.max(cursor, o.b);
  }
  if (cursor < half - 0.005) geos.push(boxGeo(half - cursor, height, thick, (cursor + half) / 2, height / 2, 0));

  if (geos.length) {
    const m = mergedMesh(geos, material);
    if (m) {
      m.castShadow = false;
      m.receiveShadow = true;
      grp.add(m);
    }
  }
  parent.add(grp);
  return grp;
}

function addGlass(parent, x1, z1, x2, z2, yBase, yBottom, yTop) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const h = Math.max(0.05, yTop - yBottom);
  const angle = Math.atan2(dz, dx);
  const g = new THREE.BoxGeometry(len, h, 0.05);
  const m = new THREE.Mesh(g, MAT.glass);
  m.position.set((x1 + x2) / 2, yBase + (yBottom + yTop) / 2, (z1 + z2) / 2);
  m.rotation.y = -angle;
  parent.add(m);
  return m;
}

function addDoor(parent, cx, cz, angleY, yBase, w, h, material, isExit = false) {
  const g = new THREE.Group();
  g.position.set(cx, yBase, cz);
  g.rotation.y = angleY;
  const frameGeos = [
    boxGeo(0.1, h, 0.16, -w / 2, h / 2, 0),
    boxGeo(0.1, h, 0.16,  w / 2, h / 2, 0),
    boxGeo(w + 0.1, 0.1, 0.16, 0, h, 0)
  ];
  const frame = mergedMesh(frameGeos, MAT.frame);
  if (frame) g.add(frame);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, h - 0.12, 0.06), material);
  leaf.position.set(0, (h - 0.12) / 2, 0);
  leaf.rotation.y = isExit ? 0 : 0.32;
  g.add(leaf);
  parent.add(g);
  return g;
}


export { addWall, addGlass, addDoor };

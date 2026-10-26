import * as THREE from 'three';
import { B, ELEV } from './config.js';
import { MAT } from './materials.js';
import { boxGeo, mergedMesh } from './utils.js';
import { addWall } from './geometry.js';

function buildElevator(parent, floorIdx, yBase, floorH) {
  const g = new THREE.Group();
  g.name = 'ELEVATOR';
  const { x1, x2, z1, z2 } = ELEV;
  const w = x2 - x1, d = z2 - z1;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;

  const shaftGeos = [
    boxGeo(w, floorH, 0.18, cx, floorH / 2, z1 + 0.09),
    boxGeo(0.18, floorH, d, x1 + 0.09, floorH / 2, cz),
    boxGeo(0.18, floorH, d, x2 - 0.09, floorH / 2, cz)
  ];
  const shaft = mergedMesh(shaftGeos, MAT.elevator);
  if (shaft) g.add(shaft);

  addWall(g, x1, z2, x2, z2, 0, floorH, B.WALL_T, MAT.elevator,
    [{ a: 0.7, b: 3.3, yA: 0, yB: 2.5 }]);

  const dl = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.5, 0.1), MAT.elevDoor);
  dl.position.set(cx - 0.645, 1.25, z2);
  g.add(dl);
  const dr = dl.clone();
  dr.position.x = cx + 0.645;
  g.add(dr);

  const frameGeos = [
    boxGeo(0.12, 2.6, 0.22, x1 + 0.6, 1.3, z2),
    boxGeo(0.12, 2.6, 0.22, x2 - 0.6, 1.3, z2),
    boxGeo(w - 1.2 + 0.12, 0.12, 0.22, cx, 2.6, z2)
  ];
  const frame = mergedMesh(frameGeos, MAT.frame);
  if (frame) g.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111820, emissive: 0x00d4ff, emissiveIntensity: 0.8 }));
  panel.position.set(cx, 3.2, z2 + 0.14);
  g.add(panel);

  parent.add(g);
  return g;
}

export { buildElevator };

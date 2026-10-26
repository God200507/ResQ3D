import * as THREE from 'three';
import { B } from './config.js';
import { MAT } from './materials.js';

function buildSafetyEquipment(parent, yBase, floorH) {
  const g = new THREE.Group();
  g.name = 'SAFETY_EQUIPMENT';

  for (let x = -14; x <= 14; x += 7) {
    [[x, B.CZ0 + 0.35], [x + 3.5, B.CZ1 - 0.35]].forEach(([px, pz]) => {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 10), MAT.exting);
      e.position.set(px, 0.5, pz);
      g.add(e);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), MAT.metal);
      cap.position.set(px, 0.88, pz);
      g.add(cap);
    });
  }

  [[-15.5, B.CZ0 + 0.12, 0], [15.5, B.CZ1 - 0.12, 1], [-17.7, 0, 2], [17.7, 0, 2]]
    .forEach(([x, z, rot]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.1), MAT.exitSign);
      s.position.set(x, 2.7, z);
      s.rotation.y = rot * Math.PI / 2;
      g.add(s);
    });

  for (let x = -16; x <= 16; x += 5.5) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 12), MAT.detector);
    d.position.set(x, floorH - 0.36, 0);
    g.add(d);
  }

  [-16, -5, 6, 16].forEach(x => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.12), MAT.alarm);
    a.position.set(x, 1.35, B.CZ0 + 0.16);
    g.add(a);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    led.position.set(x, 1.52, B.CZ0 + 0.24);
    g.add(led);
  });

  for (let x = -16; x <= 16; x += 5.5) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 8), MAT.metal);
    sp.position.set(x, floorH - 0.42, 1.2);
    g.add(sp);
  }

  parent.add(g);
  return g;
}

export { buildSafetyEquipment };

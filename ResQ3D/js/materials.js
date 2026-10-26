import * as THREE from 'three';
const MAT = {
  slab:      new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.92, metalness: 0.04 }),
  corridor:  new THREE.MeshStandardMaterial({ color: 0x53616f, roughness: 0.72, metalness: 0.05 }),
  wall:      new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.62, metalness: 0.04,
                                              transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
  wallXray:  new THREE.MeshStandardMaterial({ color: 0x63d6ff, roughness: 0.5, metalness: 0.1,
                                              transparent: true, opacity: 0.16, side: THREE.DoubleSide, wireframe: true }),
  glass:     new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.06, metalness: 0.25,
                                              transparent: true, opacity: 0.30, side: THREE.DoubleSide }),
  frame:     new THREE.MeshStandardMaterial({ color: 0x39434f, roughness: 0.5, metalness: 0.55 }),
  door:      new THREE.MeshStandardMaterial({ color: 0xa9713f, roughness: 0.6, metalness: 0.05 }),
  doorExit:  new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.5, emissive: 0x0a3a20 }),
  stair:     new THREE.MeshStandardMaterial({ color: 0xa8b3bd, roughness: 0.85, metalness: 0.06 }),
  stairRail: new THREE.MeshStandardMaterial({ color: 0x2f3b47, roughness: 0.4, metalness: 0.7 }),
  elevator:  new THREE.MeshStandardMaterial({ color: 0x536878, roughness: 0.35, metalness: 0.72 }),
  elevDoor:  new THREE.MeshStandardMaterial({ color: 0xb8c6d1, roughness: 0.18, metalness: 0.9 }),
  furniture: new THREE.MeshStandardMaterial({ color: 0xb9a58a, roughness: 0.78 }),
  furniture2:new THREE.MeshStandardMaterial({ color: 0x4e5c6b, roughness: 0.6, metalness: 0.3 }),
  metal:     new THREE.MeshStandardMaterial({ color: 0x8494a4, roughness: 0.35, metalness: 0.85 }),
  concrete:  new THREE.MeshStandardMaterial({ color: 0xbcc5cc, roughness: 0.95 }),
  facade:    new THREE.MeshStandardMaterial({ color: 0x2a3746, roughness: 0.7, metalness: 0.25 }),
  green:     new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.9 }),
  grass:     new THREE.MeshStandardMaterial({ color: 0x1f3b2a, roughness: 1.0 }),
  asphalt:   new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.98 }),
  path:      new THREE.MeshStandardMaterial({ color: 0x5c646d, roughness: 0.95 }),
  ext:       new THREE.MeshStandardMaterial({ color: 0x7d8b99, roughness: 0.5, metalness: 0.75 }),
  exting:    new THREE.MeshStandardMaterial({ color: 0xd42a2a, roughness: 0.45, emissive: 0x3a0505 }),
  alarm:     new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.4, emissive: 0x5a0a05 }),
  detector:  new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 0.5, emissive: 0x223344 }),
  exitSign:  new THREE.MeshStandardMaterial({ color: 0x14d97a, roughness: 0.3, emissive: 0x0a8a4a })
};

export { MAT };

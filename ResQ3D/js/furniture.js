import * as THREE from 'three';
import { MAT } from './materials.js';
import { mergedMesh, boxGeo } from './utils.js';

function buildFurniture(room, yBase) {
  const geos = [], geos2 = [];
  const { x1, x2, z1, z2 } = room;
  const w = x2 - x1, d = z2 - z1;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const H = 0.75;

  const addDesk = (px, pz, pw = 1.4, pd = 0.7) => {
    geos.push(boxGeo(pw, 0.08, pd, px, H, pz));
    geos2.push(boxGeo(0.08, H, 0.08, px - pw / 2 + 0.1, H / 2, pz - pd / 2 + 0.1));
    geos2.push(boxGeo(0.08, H, 0.08, px + pw / 2 - 0.1, H / 2, pz - pd / 2 + 0.1));
    geos2.push(boxGeo(0.08, H, 0.08, px - pw / 2 + 0.1, H / 2, pz + pd / 2 - 0.1));
    geos2.push(boxGeo(0.08, H, 0.08, px + pw / 2 - 0.1, H / 2, pz + pd / 2 - 0.1));
  };
  const addChair = (px, pz) => {
    geos2.push(boxGeo(0.45, 0.06, 0.45, px, 0.46, pz));
    geos2.push(boxGeo(0.45, 0.5, 0.06, px, 0.72, pz + 0.2));
    geos2.push(boxGeo(0.06, 0.46, 0.06, px, 0.23, pz));
  };

  switch (room.type) {
    case 'class': {
      const cols = Math.max(2, Math.floor((w - 2) / 1.8));
      const rows = Math.max(2, Math.floor((d - 2.5) / 1.7));
      const sx = (w - 1.5) / cols, sz = (d - 3) / rows;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const px = x1 + 1.0 + c * sx + sx / 2;
          const pz = z1 + 1.2 + r * sz + sz / 2;
          addDesk(px, pz, 1.3, 0.6);
          addChair(px, pz + 0.62);
        }
      geos2.push(boxGeo(Math.min(w - 2, 4.5), 1.5, 0.1, cx, yBase + 2.0, z1 + 0.2));
      addDesk(cx, z2 - 1.0, 1.8, 0.8);
      break;
    }
    case 'lab': {
      const rows = Math.max(2, Math.floor((d - 2.5) / 2.0));
      const sz = (d - 3) / rows;
      for (let r = 0; r < rows; r++) {
        const pz = z1 + 1.3 + r * sz + sz / 2;
        geos.push(boxGeo(w - 2.2, 0.08, 1.1, cx, H, pz));
        geos2.push(boxGeo(w - 2.2, 0.06, 0.06, cx, H - 0.1, pz + 0.55));
        const n = Math.max(2, Math.floor((w - 3) / 1.4));
        for (let i = 0; i < n; i++) {
          const px = x1 + 1.3 + i * ((w - 2.6) / Math.max(1, n - 1));
          geos2.push(boxGeo(0.55, 0.36, 0.06, px, 1.15, pz - 0.2));
          geos2.push(boxGeo(0.18, 0.14, 0.14, px, 0.86, pz - 0.2));
          addChair(px, pz + 0.85);
        }
      }
      break;
    }
    case 'seminar': {
      const rows = Math.max(3, Math.floor((d - 2.5) / 1.3));
      const sz = (d - 3) / rows;
      for (let r = 0; r < rows; r++) {
        const pz = z1 + 1.2 + r * sz;
        const n = Math.max(3, Math.floor((w - 2) / 0.9));
        for (let i = 0; i < n; i++) {
          const px = x1 + 0.9 + i * ((w - 1.8) / Math.max(1, n - 1));
          geos2.push(boxGeo(0.5, 0.06, 0.5, px, 0.46, pz));
          geos2.push(boxGeo(0.5, 0.5, 0.06, px, 0.72, pz - 0.22));
        }
      }
      geos.push(boxGeo(Math.min(w - 2, 6), 0.5, 1.2, cx, 0.9, z1 + 1.0));
      geos2.push(boxGeo(Math.min(w - 2, 5), 2.0, 0.12, cx, yBase + 2.2, z1 + 0.2));
      break;
    }
    case 'faculty':
    case 'office': {
      const n = Math.max(2, Math.floor(w / 3));
      for (let i = 0; i < n; i++) {
        const px = x1 + (i + 0.5) * (w / n);
        const pz = cz - 0.8;
        addDesk(px, pz, 1.7, 0.9);
        addChair(px, pz + 0.85);
        geos2.push(boxGeo(0.6, 1.6, 0.5, px + 1.0, 0.8, pz - 0.4));
      }
      geos.push(boxGeo(w - 1.5, 0.06, 1.0, cx, 0.78, z2 - 0.9));
      break;
    }
    case 'wash': {
      const stalls = Math.max(2, Math.floor(w / 1.4));
      for (let i = 0; i < stalls; i++) {
        const px = x1 + 0.4 + i * ((w - 0.8) / stalls);
        geos2.push(boxGeo(0.1, 2.0, d - 1.6, px, 1.0, cz));
      }
      geos.push(boxGeo(w - 1.2, 0.9, 0.5, cx, 0.45, z1 + 0.7));
      break;
    }
    case 'storage': {
      for (let i = 0; i < 4; i++) {
        const px = x1 + 1.0 + (i % 2) * (w - 2.0);
        const pz = z1 + 1.2 + Math.floor(i / 2) * (d - 2.4);
        geos2.push(boxGeo(1.4, 2.2, 0.6, px, 1.1, pz));
      }
      break;
    }
    case 'common': {
      geos2.push(boxGeo(1.8, 0.5, 0.8, cx - 1.5, 0.25, cz));
      geos2.push(boxGeo(1.8, 0.5, 0.8, cx + 1.5, 0.25, cz));
      geos2.push(boxGeo(1.2, 0.45, 1.2, cx, 0.22, cz + 2.0));
      break;
    }
    case 'lobby': {
      geos2.push(boxGeo(3.2, 1.1, 0.8, cx, 0.55, z2 - 1.2));
      geos2.push(boxGeo(1.6, 0.45, 0.7, cx - 3.2, 0.22, cz + 1.0));
      geos2.push(boxGeo(1.6, 0.45, 0.7, cx + 3.2, 0.22, cz + 1.0));
      break;
    }
  }

  const out = [];
  if (geos.length) { const m = mergedMesh(geos, MAT.furniture); if (m) out.push(m); }
  if (geos2.length) { const m = mergedMesh(geos2, MAT.furniture2); if (m) out.push(m); }
  return out;
}

export { buildFurniture };

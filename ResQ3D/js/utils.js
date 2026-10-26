import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================================
   SAFE GEOMETRY MERGING  (bulletproof)
   ========================================================================= */
function safeMerge(geos) {
  if (!Array.isArray(geos)) return null;
  // Filter: only accept valid BufferGeometry instances
  const valid = [];
  for (let i = 0; i < geos.length; i++) {
    const g = geos[i];
    if (g && g.isBufferGeometry === true && g.attributes && g.attributes.position) {
      valid.push(g);
    }
  }
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0].clone();
  try {
    const merged = BufferGeometryUtils.mergeBufferGeometries
      ? BufferGeometryUtils.mergeBufferGeometries(valid, false)
      : (BufferGeometryUtils.mergeGeometries
          ? BufferGeometryUtils.mergeGeometries(valid, false)
          : null);
    if (merged && merged.isBufferGeometry === true) return merged;
    return null;
  } catch (err) {
    console.warn('safeMerge failed, using individual meshes:', err);
    return null;
  }
}

/**
 * Returns EITHER a single Mesh (merged geometry) OR a Group of meshes.
 * Never returns null. Never creates a Mesh with null geometry.
 */
function mergedMesh(geos, material) {
  const arr = Array.isArray(geos) ? geos.filter(g =>
    g && g.isBufferGeometry === true && g.attributes && g.attributes.position
  ) : [];

  if (arr.length === 0) {
    // Return an empty Group so callers can safely add it
    const empty = new THREE.Group();
    return empty;
  }

  const merged = safeMerge(arr);
  if (merged) {
    const m = new THREE.Mesh(merged, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Fallback: group of individual meshes
  const group = new THREE.Group();
  arr.forEach(g => {
    const m = new THREE.Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });
  return group;
}

const boxGeo = (w, h, d, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeTextSprite(text, opts = {}) {
  const fs = opts.fontSize || 44;
  const pad = 20;
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  ctx.font = `700 ${fs}px Inter, Arial, sans-serif`;
  const tw = ctx.measureText(text).width;
  c.width = Math.ceil(tw + pad * 2);
  c.height = fs + pad * 2;
  ctx = c.getContext('2d');
  ctx.font = `700 ${fs}px Inter, Arial, sans-serif`;
  ctx.fillStyle = opts.bg || 'rgba(6,16,28,0.88)';
  roundRect(ctx, 2, 2, c.width - 4, c.height - 4, 16);
  ctx.fill();
  ctx.strokeStyle = opts.border || 'rgba(0,212,255,0.75)';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.fillStyle = opts.color || '#e8f7ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0.96
  });
  const s = new THREE.Sprite(mat);
  const k = opts.scale || 0.0115;
  s.scale.set(c.width * k, c.height * k, 1);
  s.renderOrder = 999;
  return s;
}

export { safeMerge, mergedMesh, boxGeo, roundRect, makeTextSprite };

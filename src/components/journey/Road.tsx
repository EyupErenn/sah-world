'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// Smooth Ribbon Road Geometry Generator
// Ensures the road is perfectly horizontal, flat, and non-twisting
// ============================================================

function createSmoothRoadGeometry(width: number, segments = 600) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfW = width / 2;
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = JOURNEY_CURVE.getPointAt(t);
    const tangent = JOURNEY_CURVE.getTangentAt(t).normalize();
    
    // Horizontal normal vector perpendicular to direction of travel
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (normal.lengthSq() < 0.001) {
      normal.set(1, 0, 0);
    }

    const left = pt.clone().addScaledVector(normal, -halfW);
    const right = pt.clone().addScaledVector(normal, halfW);

    left.y += 0.04;
    right.y += 0.04;

    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);

    // UV mapping (v repeats along road length)
    uvs.push(0, t * 60);
    uvs.push(1, t * 60);

    if (i < segments) {
      const idx = i * 2;
      indices.push(idx, idx + 1, idx + 2);
      indices.push(idx + 1, idx + 3, idx + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Procedural Road Texture with High-Visibility Neon & Lane Markings
function createCleanRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark slate asphalt
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Road borders (Bright Indigo Glowing Curbs)
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(0, 0, 24, 512);
  ctx.fillRect(488, 0, 24, 512);

  // Shoulder lines (Crisp white solid lines)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(40, 0, 8, 512);
  ctx.fillRect(464, 0, 8, 512);

  // Center dashed lines (Bright glowing yellow-white dashes)
  ctx.fillStyle = '#f8fafc';
  for (let y = 0; y < 512; y += 128) {
    ctx.fillRect(246, y + 20, 20, 88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1); // 1x1 since UVs already repeat via t * 60
  return tex;
}

export default function Road() {
  const roadGeo = useMemo(() => createSmoothRoadGeometry(5.8, 600), []);
  const roadTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createCleanRoadTexture();
  }, []);

  return (
    <group>
      {/* Main Asphalt Road */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          map={roadTex ?? undefined}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// High-Performance Smooth Ribbon Road with 3D Cyber-Spiritual Curbs
// ============================================================

function createSmoothRoadGeometry(width: number, segments = 180) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfW = width / 2;
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = JOURNEY_CURVE.getPointAt(t);
    const tangent = JOURNEY_CURVE.getTangentAt(t).normalize();

    // Horizontal normal perpendicular to road forward direction
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (normal.lengthSq() < 0.001) {
      normal.set(1, 0, 0);
    }

    const left = pt.clone().addScaledVector(normal, -halfW);
    const right = pt.clone().addScaledVector(normal, halfW);

    // Slightly elevate road above terrain
    left.y += 0.06;
    right.y += 0.06;

    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);

    // UV mapping (v repeats along road length)
    uvs.push(0, t * 75);
    uvs.push(1, t * 75);

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

// Procedural High-Definition Asphalt & Glowing Lane Markings
function createCleanRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep dark modern asphalt
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt texture grain
  ctx.fillStyle = '#1e293b';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 0, 8, 512);
  }

  // Glowing Outer Neon Curb Bevels (Cyan & Violet)
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(0, 0, 20, 512);
  ctx.fillRect(492, 0, 20, 512);

  // Crisp White Outer Shoulder Lines
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(36, 0, 8, 512);
  ctx.fillRect(468, 0, 8, 512);

  // Glowing Center Dashes (Luminous Cyber Gold / Cyan)
  ctx.fillStyle = '#38bdf8';
  for (let y = 0; y < 512; y += 128) {
    ctx.fillRect(248, y + 16, 16, 96);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

export default function Road() {
  const roadGeo = useMemo(() => createSmoothRoadGeometry(5.6, 180), []);
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
          roughness={0.55}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

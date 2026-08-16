'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// Road System: TubeGeometry following CatmullRomCurve3
// with PBR asphalt material, lane markings, and indigo curbs
// ============================================================

// Procedurally generate an asphalt-like canvas texture
function createAsphaltTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark base
  ctx.fillStyle = '#27303f';
  ctx.fillRect(0, 0, size, size);

  // Noise grain
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2;
    const gray = Math.floor(35 + Math.random() * 30);
    ctx.fillStyle = `rgba(${gray},${gray},${gray},0.6)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 60);
  return tex;
}

// Dashed center lane texture
function createLaneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'transparent';
  ctx.clearRect(0, 0, 64, 512);

  // Dashed white line
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let y = 0; y < 512; y += 80) {
    ctx.fillRect(26, y, 12, 48);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 60);
  return tex;
}

export default function Road() {
  const asphaltTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createAsphaltTexture();
  }, []);

  const laneTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createLaneTexture();
  }, []);

  const roadRef = useRef<THREE.Mesh>(null);

  // Asphalt road tube
  const roadGeo = useMemo(() => {
    return new THREE.TubeGeometry(JOURNEY_CURVE, 512, 2.9, 10, false);
  }, []);

  // Invisible flat road surface for shadow receiving
  const flatSurfaceGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-3.1, 0);
    shape.lineTo(3.1, 0);
    shape.lineTo(3.1, -0.15);
    shape.lineTo(-3.1, -0.15);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      steps: 512,
      bevelEnabled: false,
      extrudePath: JOURNEY_CURVE,
    });
  }, []);

  // Center lane markings (thinner, on top)
  const laneGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.18, 0.01);
    shape.lineTo(0.18, 0.01);
    shape.lineTo(0.18, -0.12);
    shape.lineTo(-0.18, -0.12);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      steps: 512,
      bevelEnabled: false,
      extrudePath: JOURNEY_CURVE,
    });
  }, []);

  // Left indigo curb
  const leftCurbGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-3.3, 0.06);
    shape.lineTo(-2.8, 0.06);
    shape.lineTo(-2.8, -0.28);
    shape.lineTo(-3.3, -0.28);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      steps: 512,
      bevelEnabled: false,
      extrudePath: JOURNEY_CURVE,
    });
  }, []);

  // Right indigo curb
  const rightCurbGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(2.8, 0.06);
    shape.lineTo(3.3, 0.06);
    shape.lineTo(3.3, -0.28);
    shape.lineTo(2.8, -0.28);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      steps: 512,
      bevelEnabled: false,
      extrudePath: JOURNEY_CURVE,
    });
  }, []);

  // Animate lane markings dashing (slight scroll offset)
  useFrame(({ clock }) => {
    if (laneTex) {
      laneTex.offset.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group>
      {/* Asphalt road surface */}
      <mesh geometry={flatSurfaceGeo} receiveShadow>
        <meshStandardMaterial
          map={asphaltTex ?? undefined}
          roughness={0.88}
          metalness={0.02}
          color="#2d3748"
        />
      </mesh>

      {/* Dashed center lane markings */}
      <mesh geometry={laneGeo}>
        <meshStandardMaterial
          map={laneTex ?? undefined}
          transparent
          roughness={0.5}
          emissive="#ffffff"
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Left brand-color curb */}
      <mesh geometry={leftCurbGeo} castShadow>
        <meshStandardMaterial
          color="#4f46e5"
          emissive="#4f46e5"
          emissiveIntensity={0.22}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Right brand-color curb */}
      <mesh geometry={rightCurbGeo} castShadow>
        <meshStandardMaterial
          color="#4f46e5"
          emissive="#4f46e5"
          emissiveIntensity={0.22}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

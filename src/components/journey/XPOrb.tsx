'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// XP Orb: spawns at vehicle position, arcs to Ahiret Deposu
// ============================================================

interface XPOrbProps {
  startProgress: number;   // 0.0 - 1.0 current vehicle position on curve
  onComplete?: () => void;
}

export default function XPOrb({ startProgress, onComplete }: XPOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const aliveRef = useRef(true);
  const posRef = useRef({ t: 0 });

  // Pre-calculate start and end points
  const startPos = JOURNEY_CURVE.getPointAt(Math.min(startProgress, 0.92));
  const endPos   = JOURNEY_CURVE.getPointAt(1.0);

  // Bezier control point (elevated arc)
  const midX = (startPos.x + endPos.x) / 2 + (Math.random() - 0.5) * 18;
  const midY = Math.max(startPos.y, endPos.y) + 16;
  const midZ = (startPos.z + endPos.z) / 2;

  // GSAP flight animation on mount
  useEffect(() => {
    if (!aliveRef.current) return;
    gsap.to(posRef.current, {
      t: 1,
      duration: 1.35,
      ease: 'power2.inOut',
      onComplete: () => {
        aliveRef.current = false;
        onComplete?.();
      },
    });
    return () => {
      gsap.killTweensOf(posRef.current);
    };
  }, []);

  useFrame(() => {
    if (!aliveRef.current || !meshRef.current) return;
    const t = posRef.current.t;
    const inv = 1 - t;

    // Quadratic Bezier position
    const x = inv * inv * startPos.x + 2 * inv * t * midX + t * t * endPos.x;
    const y = inv * inv * (startPos.y + 2) + 2 * inv * t * midY + t * t * (endPos.y + 5);
    const z = inv * inv * startPos.z + 2 * inv * t * midZ + t * t * endPos.z;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.y += 0.08;
    meshRef.current.rotation.x += 0.04;

    // Fade out near end
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = t > 0.88 ? (1 - t) * 8 : 1.2;

    if (lightRef.current) {
      lightRef.current.intensity = t > 0.88 ? (1 - t) * 10 : 1.8;
    }
  });

  if (!aliveRef.current) return null;

  return (
    <mesh ref={meshRef} position={[startPos.x, startPos.y + 2, startPos.z]}>
      <octahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ffaa00"
        emissiveIntensity={1.2}
        metalness={0.5}
        roughness={0.1}
      />
      <pointLight ref={lightRef} color="#ffd700" intensity={1.8} distance={12} />
    </mesh>
  );
}

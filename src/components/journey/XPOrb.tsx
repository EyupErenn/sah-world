'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
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
  const [alive, setAlive] = useState(true);
  const posRef = useRef({ t: 0 });

  // Pre-calculate start and end points
  const { startPos, endPos, midX, midY, midZ } = useMemo(() => {
    const s = JOURNEY_CURVE.getPointAt(Math.min(startProgress, 0.92));
    const e = JOURNEY_CURVE.getPointAt(1.0);
    const mx = (s.x + e.x) / 2 + 5;
    const my = Math.max(s.y, e.y) + 16;
    const mz = (s.z + e.z) / 2;
    return { startPos: s, endPos: e, midX: mx, midY: my, midZ: mz };
  }, [startProgress]);

  // GSAP flight animation on mount
  useEffect(() => {
    const anim = posRef.current;
    const tween = gsap.to(anim, {
      t: 1,
      duration: 1.35,
      ease: 'power2.inOut',
      onComplete: () => {
        setAlive(false);
        onComplete?.();
      },
    });
    return () => {
      tween.kill();
    };
  }, [onComplete]);

  useFrame(() => {
    if (!alive || !meshRef.current) return;
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
    if (mat) {
      mat.emissiveIntensity = t > 0.88 ? (1 - t) * 8 : 1.2;
    }

    if (lightRef.current) {
      lightRef.current.intensity = t > 0.88 ? (1 - t) * 10 : 1.8;
    }
  });

  if (!alive) return null;

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

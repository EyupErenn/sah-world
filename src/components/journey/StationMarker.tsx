'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { StationDef } from '@/types';

// ============================================================
// Station Gateway: Majestic Arch / Landmark beside each checkpoint
// ============================================================

interface StationMarkerProps {
  station: StationDef;
  position: THREE.Vector3;
  isActive: boolean;
}

export default function StationMarker({ station, position, isActive }: StationMarkerProps) {
  const crystalRef = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);
  const lightRef   = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (crystalRef.current) {
      crystalRef.current.position.y = 5.2 + Math.sin(t * 2.0 + station.id) * 0.35;
      crystalRef.current.rotation.y += 0.02;
      crystalRef.current.rotation.x = Math.sin(t) * 0.1;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.015;
    }

    if (lightRef.current) {
      lightRef.current.intensity = isActive ? 2.5 + Math.sin(t * 4) * 0.8 : 1.2;
    }
  });

  const threeColor = new THREE.Color(station.color);

  return (
    <group position={position}>
      {/* ── Base Pedestal ── */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[2.8, 3.4, 0.8, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* ── Outer Golden Trim ── */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[2.5, 2.7, 0.15, 12]} />
        <meshStandardMaterial color={station.color} emissive={station.color} emissiveIntensity={0.4} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* ── Tower Pillars (3 Spires) ── */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <group key={i} position={[x * 0.9, 0, (i === 1 ? -0.4 : 0.4)]}>
          <mesh castShadow position={[0, 2.4 + (i === 1 ? 0.8 : 0), 0]}>
            <cylinderGeometry args={[0.22, 0.35, 4.0 + (i === 1 ? 1.6 : 0), 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, 4.5 + (i === 1 ? 1.6 : 0), 0]}>
            <octahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color={station.color} emissive={station.color} emissiveIntensity={0.5} metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ── Floating Main Beacon Crystal ── */}
      <mesh ref={crystalRef} position={[0, 5.2, 0]} castShadow>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={isActive ? 0.8 : 0.4}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* ── Orbital Energy Ring ── */}
      <mesh ref={ringRef} position={[0, 5.2, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.0, 0.08, 8, 32]} />
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={0.7}
          metalness={0.5}
        />
      </mesh>

      {/* ── Sparkles Motes ── */}
      <Sparkles
        count={24}
        size={2.2}
        speed={0.4}
        color={threeColor}
        scale={[6, 8, 6]}
        opacity={0.85}
      />

      {/* ── Station Light ── */}
      <pointLight
        ref={lightRef}
        color={station.color}
        intensity={1.2}
        distance={24}
        position={[0, 5.2, 0]}
      />
    </group>
  );
}

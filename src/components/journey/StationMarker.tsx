'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StationDef } from '@/types';

// ============================================================
// Station Marker: Obelisk + Crystal + Sparkles + Halo Ring + Label
// ============================================================

interface StationMarkerProps {
  station: StationDef;
  position: THREE.Vector3;
  isActive: boolean;
}

export default function StationMarker({ station, position, isActive }: StationMarkerProps) {
  const crystalRef = useRef<THREE.Mesh>(null);
  const haloRef    = useRef<THREE.Mesh>(null);
  const groupRef   = useRef<THREE.Group>(null);
  const auraRef    = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Floating crystal bob + rotate
    if (crystalRef.current) {
      crystalRef.current.position.y = 4.2 + Math.sin(t * 1.6 + station.id) * 0.28;
      crystalRef.current.rotation.y += 0.014;

      // Pulse emissive when active station
      const mat = crystalRef.current.material as THREE.MeshStandardMaterial;
      if (isActive) {
        mat.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
      } else {
        mat.emissiveIntensity = 0.28;
      }
    }

    // Halo ring slow spin
    if (haloRef.current) {
      haloRef.current.rotation.z += 0.006;
      const haloMat = haloRef.current.material as THREE.MeshStandardMaterial;
      haloMat.emissiveIntensity = isActive ? (0.4 + Math.sin(t * 2) * 0.15) : 0.18;
    }

    // Aura light pulse when active
    if (auraRef.current) {
      auraRef.current.intensity = isActive ? (1.5 + Math.sin(t * 3) * 0.6) : 0.7;
    }
  });

  const threeColor = new THREE.Color(station.color);

  return (
    <group ref={groupRef} position={position}>

      {/* ── Base Platform ── */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.4, 0.36, 10]} />
        <meshStandardMaterial color={station.color} roughness={0.45} metalness={0.2} />
      </mesh>

      {/* ── Obelisk Pillar ── */}
      <mesh castShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.28, 0.55, 5.0, 8]} />
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0.3}
        />
      </mesh>

      {/* ── Floating Crystal ── */}
      <mesh ref={crystalRef} position={[0, 4.2, 0]} castShadow>
        <octahedronGeometry args={[1.15, 0]} />
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={0.28}
          roughness={0.18}
          metalness={0.45}
        />
      </mesh>

      {/* ── Halo Ring (ground) ── */}
      <mesh ref={haloRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.12, 8, 36]} />
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={0.18}
          roughness={0.4}
        />
      </mesh>

      {/* ── Particle Sparkles ── */}
      <Sparkles
        count={18}
        size={1.8}
        speed={0.25}
        color={threeColor}
        scale={[4, 6, 4]}
        opacity={0.8}
      />

      {/* ── Aura Point Light ── */}
      <pointLight
        ref={auraRef}
        color={station.color}
        intensity={0.7}
        distance={16}
        position={[0, 3.5, 0]}
      />

      {/* ── Floating Station Label (Billboard, always faces camera) ── */}
      <Billboard position={[0, 7.0, 0]} follow lockX={false} lockY lockZ={false}>
        <mesh>
          <planeGeometry args={[2.8, 0.65]} />
          <meshStandardMaterial color={station.color} transparent opacity={0.88} roughness={0.3} />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2"
        >
          {`${station.id}. Durak — ${station.name}`}
        </Text>
      </Billboard>

    </group>
  );
}

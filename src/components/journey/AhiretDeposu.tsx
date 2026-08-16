'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { getDepotTier } from '@/lib/constants';

// ============================================================
// Ahiret Deposu — Final Destination Citadel
// Tier 1-4 visual complexity scales with XP level
// ============================================================

interface AhiretDeposuProps {
  position: THREE.Vector3;
  xp: number;
}

export default function AhiretDeposu({ position, xp }: AhiretDeposuProps) {
  const tier = getDepotTier(xp);
  const ringRef  = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const topRef   = useRef<THREE.Mesh>(null);
  const glowRef  = useRef<THREE.PointLight>(null);
  const beaconRef = useRef<THREE.PointLight>(null);

  // Scale grows with tier (visible as a beacon from afar)
  const baseScale = useMemo(() => {
    if (tier === 4) return 1.5;
    if (tier === 3) return 1.2;
    if (tier === 2) return 1.0;
    return 0.72;
  }, [tier]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Rings orbit
    if (ringRef.current)  ringRef.current.rotation.y  = t * 0.45;
    if (ring2Ref.current) ring2Ref.current.rotation.x = t * 0.28;
    if (ring3Ref.current) ring3Ref.current.rotation.z = t * 0.18;
    // Top crystal bob
    if (topRef.current) topRef.current.position.y = 10 * baseScale + Math.sin(t * 1.1) * 0.5;
    // Beacon pulse
    if (beaconRef.current) {
      beaconRef.current.intensity = 3 + Math.sin(t * 1.5) * 1.2;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(t * 2.2) * 0.5;
    }
  });

  const goldColor = '#d4af37';
  const goldEmissive = '#b8860b';

  return (
    <group position={position} scale={baseScale}>

      {/* ── Foundation Platform ── */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[9, 11, 1.4, 18]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.15} />
      </mesh>

      {/* ── Inner Ring Platform ── */}
      <mesh castShadow position={[0, 1.6, 0]}>
        <cylinderGeometry args={[6.5, 8, 1.0, 16]} />
        <meshStandardMaterial color={goldColor} metalness={0.55} roughness={0.22} />
      </mesh>

      {/* ── Grand Dome ── */}
      <mesh castShadow position={[0, 5.5, 0]}>
        <sphereGeometry args={[4.0, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial
          color={goldColor}
          emissive={goldEmissive}
          emissiveIntensity={0.35}
          metalness={0.65}
          roughness={0.18}
        />
      </mesh>

      {/* ── Central Tower ── */}
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.2, 1.6, 5.5, 12]} />
        <meshStandardMaterial color={goldColor} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* ── Corner Spires (4) ── */}
      {[[-5, 0, -5], [5, 0, -5], [-5, 0, 5], [5, 0, 5]].map((pos, i) => (
        <group key={i}>
          <mesh castShadow position={[pos[0], 3.0, pos[2]]}>
            <cylinderGeometry args={[0.5, 0.8, 5.5, 10]} />
            <meshStandardMaterial color={goldColor} metalness={0.55} roughness={0.22} />
          </mesh>
          <mesh position={[pos[0], 6.2, pos[2]]}>
            <coneGeometry args={[0.5, 2.0, 10]} />
            <meshStandardMaterial color={goldColor} emissive={goldEmissive} emissiveIntensity={0.3} metalness={0.6} roughness={0.18} />
          </mesh>
        </group>
      ))}

      {/* ── Tier 2+: Outer Ring Gate Pillars ── */}
      {tier >= 2 && [0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <mesh key={i} castShadow position={[Math.cos(rad) * 8, 2.0, Math.sin(rad) * 8]}>
            <cylinderGeometry args={[0.35, 0.45, 3.5, 8]} />
            <meshStandardMaterial color={goldColor} metalness={0.5} roughness={0.25} emissive={goldEmissive} emissiveIntensity={0.2} />
          </mesh>
        );
      })}

      {/* ── Tier 3+: Orbital Rings ── */}
      {tier >= 3 && (
        <>
          <mesh ref={ringRef} position={[0, 6, 0]}>
            <torusGeometry args={[7, 0.22, 10, 48]} />
            <meshStandardMaterial color={goldColor} emissive={goldEmissive} emissiveIntensity={0.45} metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh ref={ring2Ref} position={[0, 6, 0]}>
            <torusGeometry args={[5.5, 0.14, 8, 40]} />
            <meshStandardMaterial color="#c7d2fe" emissive="#4f46e5" emissiveIntensity={0.4} metalness={0.5} roughness={0.25} />
          </mesh>
        </>
      )}

      {/* ── Tier 4: Extra Aurora Ring + Grand Scale ── */}
      {tier >= 4 && (
        <mesh ref={ring3Ref} position={[0, 8, 0]}>
          <torusGeometry args={[9, 0.3, 10, 64]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#06b6d4" emissiveIntensity={0.5} metalness={0.4} roughness={0.2} />
        </mesh>
      )}

      {/* ── Top Crystal ── */}
      <mesh ref={topRef} position={[0, 10, 0]} castShadow>
        <octahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial
          color={goldColor}
          emissive={goldEmissive}
          emissiveIntensity={0.6}
          metalness={0.7}
          roughness={0.12}
        />
      </mesh>

      {/* ── Particle Sparkles ── */}
      <Sparkles count={40} size={2.5} speed={0.3} color="#d4af37" scale={[22, 18, 22]} opacity={0.7} />

      {/* ── Beacon Light (visible from start of road) ── */}
      <pointLight ref={beaconRef} position={[0, 14, 0]} color="#ffd700" intensity={3} distance={200} />
      {/* ── Close Glow ── */}
      <pointLight ref={glowRef} position={[0, 7, 0]} color="#d97706" intensity={1.5} distance={40} />
    </group>
  );
}

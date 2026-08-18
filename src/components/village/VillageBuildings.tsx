'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { VILLAGE_LOCATIONS, getTerrainHeight } from '@/lib/villageData';
import type { StationTier, StationTierMap, VillageTier } from '@/lib/growth';

interface VillageBuildingsProps {
  activeBuildingId: number | null;
  xp: number;
  villageTier: VillageTier;
  stationTiers: StationTierMap;
}

// ── Contact Ground Shadow Helper ──
function BuildingGroundShadow({ radius = 5.5, opacity = 0.55 }: { radius?: number; opacity?: number }) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial color="#020617" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function useStationScale(tier: StationTier) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = tier === 1 ? 0.78 : tier === 2 ? 0.91 : 1.04;
    const factor = 1 - Math.exp(-3.4 * delta);
    const next = THREE.MathUtils.lerp(groupRef.current.scale.x, target, factor);
    groupRef.current.scale.setScalar(next);
  });
  return groupRef;
}

function GrowthLayer({ active, children }: { active: boolean; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = active ? 1 : 0.001;
    const factor = 1 - Math.exp(-4.4 * delta);
    const next = THREE.MathUtils.lerp(groupRef.current.scale.x, target, factor);
    groupRef.current.scale.setScalar(next);
    groupRef.current.visible = next > 0.008;
  });
  return <group ref={groupRef} scale={active ? 1 : 0.001}>{children}</group>;
}

function UpgradeBanner({ color, position = [3.2, 2.4, 0] }: { color: string; position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.8, 0]} castShadow><cylinderGeometry args={[0.05, 0.07, 2.8, 6]} /><meshStandardMaterial color="#334155" metalness={0.65} /></mesh>
      <mesh position={[0.48, 0.18, 0]} castShadow><boxGeometry args={[0.9, 0.58, 0.06]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} /></mesh>
    </group>
  );
}

function StationTierUpgrades({ stationId, tier }: { stationId: number; tier: StationTier }) {
  if (stationId === 1) {
    return <>
      <GrowthLayer active={tier >= 2}>
        <group position={[0, 2.85, 3.35]}><mesh rotation={[0.12, 0, 0]} castShadow><boxGeometry args={[6.8, 0.18, 2.2]} /><meshStandardMaterial color="#451a03" roughness={0.78} /></mesh>{[-2.8, 2.8].map(x => <mesh key={x} position={[x, -1.25, 0.7]} castShadow><cylinderGeometry args={[0.09, 0.12, 2.5, 6]} /><meshStandardMaterial color="#78350f" /></mesh>)}</group>
        <UpgradeBanner color="#f59e0b" position={[3.4, 2.5, 2.8]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <mesh position={[0, 4.75, -0.65]} castShadow receiveShadow><boxGeometry args={[4.6, 2.1, 3.6]} /><meshStandardMaterial color="#92400e" roughness={0.78} /></mesh>
        <mesh position={[0, 6.2, -0.65]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[3.7, 1.65, 4]} /><meshStandardMaterial color="#3f1d0b" /></mesh>
        <group position={[4.15, 1.25, -0.4]}><mesh castShadow><boxGeometry args={[2.4, 2.3, 3]} /><meshStandardMaterial color="#713f12" /></mesh><mesh position={[0, 0.2, 1.52]}><planeGeometry args={[1.5, 1.1]} /><meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2.4} /></mesh></group>
        {[-2.5, -1.25, 0, 1.25, 2.5].map(x => <mesh key={x} position={[x, 3.18, 3.82]}><sphereGeometry args={[0.12, 7, 6]} /><meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={3} /></mesh>)}
      </GrowthLayer>
    </>;
  }

  if (stationId === 2) {
    return <>
      <GrowthLayer active={tier >= 2}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 4.4, 1.7, 0]} castShadow><boxGeometry args={[1.8, 2.8, 4.8]} /><meshStandardMaterial color="#fff7ed" roughness={0.28} /></mesh>)}
        <mesh position={[0, 5.65, 0]} castShadow><sphereGeometry args={[4.15, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.65} metalness={0.85} /></mesh>
        <UpgradeBanner color="#fbbf24" position={[5.2, 2.8, 1]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <mesh position={[0, 0.34, 6.2]} castShadow><cylinderGeometry args={[2.1, 2.5, 0.55, 16]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        <mesh position={[0, 0.67, 6.2]}><cylinderGeometry args={[1.78, 1.78, 0.12, 20]} /><meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.72} /></mesh>
        {[-4.4, 0, 4.4].map(x => <group key={x} position={[x, 2.2, 4.7]}><mesh castShadow><torusGeometry args={[1.25, 0.16, 8, 18, Math.PI]} /><meshStandardMaterial color="#f59e0b" metalness={0.8} /></mesh><mesh position={[-1.25, -1.1, 0]} castShadow><cylinderGeometry args={[0.14, 0.17, 2.2, 8]} /><meshStandardMaterial color="#fff" /></mesh><mesh position={[1.25, -1.1, 0]} castShadow><cylinderGeometry args={[0.14, 0.17, 2.2, 8]} /><meshStandardMaterial color="#fff" /></mesh></group>)}
      </GrowthLayer>
    </>;
  }

  if (stationId === 3) {
    return <>
      <GrowthLayer active={tier >= 2}>
        <mesh position={[4.6, 1.65, -0.4]} castShadow><boxGeometry args={[2.6, 2.8, 4.4]} /><meshStandardMaterial color="#475569" roughness={0.76} /></mesh>
        {[-1.2, -0.4, 0.4, 1.2].map(y => <mesh key={y} position={[6.02, 1.7 + y, -0.4]}><boxGeometry args={[0.08, 0.12, 3.5]} /><meshStandardMaterial color="#d97706" /></mesh>)}
        <UpgradeBanner color="#10b981" position={[5.6, 3, 2.2]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <mesh position={[-4.6, 1.65, -0.4]} castShadow><boxGeometry args={[2.6, 2.8, 4.4]} /><meshStandardMaterial color="#475569" roughness={0.76} /></mesh>
        {[-4.5, -1.5, 1.5, 4.5].map(x => <mesh key={x} position={[x, 2.05, 5]} castShadow><cylinderGeometry args={[0.2, 0.28, 3.5, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
        <mesh position={[0, 0.16, 5]} receiveShadow><boxGeometry args={[11, 0.28, 4]} /><meshStandardMaterial color="#64748b" roughness={0.82} /></mesh>
      </GrowthLayer>
    </>;
  }

  if (stationId === 4) {
    return <>
      <GrowthLayer active={tier >= 2}>
        <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><octahedronGeometry args={[3.25, 0]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.8} wireframe /></mesh>
        {[-1.45, -0.48, 0.48, 1.45].flatMap(x => [-1.45, -0.48, 0.48, 1.45].map(z => <mesh key={`${x}-${z}`} position={[x, 0.62, z]}><boxGeometry args={[0.06, 0.05, 2.8]} /><meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={2} /></mesh>))}
        <UpgradeBanner color="#06b6d4" position={[3.8, 2.6, 2.8]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <mesh position={[0, 5.8, 0]} castShadow><boxGeometry args={[3.4, 2.2, 3.4]} /><meshPhysicalMaterial color="#818cf8" transmission={0.72} roughness={0.05} metalness={0.35} transparent opacity={0.72} /></mesh>
        {[0, 1, 2].map(index => <mesh key={index} position={[0, 6 + index * 0.55, 0]} rotation={[index * 0.6, index * 0.4, 0]}><torusGeometry args={[2.35 - index * 0.32, 0.07, 7, 24]} /><meshStandardMaterial color={index % 2 ? '#a78bfa' : '#22d3ee'} emissive={index % 2 ? '#7c3aed' : '#0891b2'} emissiveIntensity={2.7} /></mesh>)}
      </GrowthLayer>
    </>;
  }

  if (stationId === 5) {
    return <>
      <GrowthLayer active={tier >= 2}>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[6.1, 6.5, 0.28, 28]} /><meshStandardMaterial color="#0c4a6e" emissive="#075985" emissiveIntensity={0.48} metalness={0.45} roughness={0.2} /></mesh>
        <UpgradeBanner color="#e11d48" position={[5.4, 2.6, 0]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        {[0, 1, 2, 3, 4, 5].map(index => { const angle = index * Math.PI / 3; return <group key={index} position={[Math.cos(angle) * 5.3, 1.8, Math.sin(angle) * 5.3]}><mesh castShadow><boxGeometry args={[0.75, 3.4, 0.75]} /><meshStandardMaterial color="#1c1917" roughness={0.58} /></mesh><mesh position={[0, 0, 0.39]}><boxGeometry args={[0.18, 2.4, 0.03]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.5} /></mesh></group>; })}
        <pointLight position={[0, 3.6, 0]} color="#f59e0b" intensity={2.2} distance={14} />
      </GrowthLayer>
    </>;
  }

  if (stationId === 6) {
    const flowers = Array.from({ length: 30 }, (_, index) => index);
    return <>
      <GrowthLayer active={tier >= 2}>
        {flowers.slice(0, 14).map(index => { const angle = index / 14 * Math.PI * 2; return <group key={index} position={[Math.cos(angle) * 6, 0.25, Math.sin(angle) * 6]}><mesh castShadow><cylinderGeometry args={[0.04, 0.05, 0.5, 5]} /><meshStandardMaterial color="#166534" /></mesh><mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.18, 6, 5]} /><meshStandardMaterial color={index % 2 ? '#f9a8d4' : '#fde047'} emissive={index % 2 ? '#db2777' : '#eab308'} emissiveIntensity={0.35} /></mesh></group>; })}
        <UpgradeBanner color="#10b981" position={[5.2, 2.7, 1.8]} />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        {flowers.map(index => { const angle = index / flowers.length * Math.PI * 2; const radius = 7.3 + index % 3 * 0.6; return <group key={index} position={[Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius]}><mesh castShadow><cylinderGeometry args={[0.04, 0.05, 0.58, 5]} /><meshStandardMaterial color="#15803d" /></mesh><mesh position={[0, 0.4, 0]}><dodecahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color={index % 3 === 0 ? '#fb7185' : index % 3 === 1 ? '#facc15' : '#c084fc'} emissive="#d97706" emissiveIntensity={0.28} /></mesh></group>; })}
        <Sparkles count={44} scale={[16, 7, 16]} color="#fde68a" size={2.2} speed={0.25} />
      </GrowthLayer>
    </>;
  }

  if (stationId === 7) {
    return <>
      <GrowthLayer active={tier >= 2}><UpgradeBanner color="#14b8a6" position={[-5.6, 3.1, 3]} /></GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <mesh position={[0, 0.22, 7.2]} castShadow receiveShadow><boxGeometry args={[12.5, 0.4, 5.2]} /><meshStandardMaterial color="#e2e8f0" roughness={0.5} /></mesh>
        {[-5, -2.5, 0, 2.5, 5].map(x => <group key={x} position={[x, 2.1, 8.2]}><mesh castShadow><cylinderGeometry args={[0.15, 0.19, 3.5, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh><mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} /></mesh></group>)}
        <pointLight position={[0, 3.2, 7.2]} color="#fbbf24" intensity={2.4} distance={17} />
      </GrowthLayer>
    </>;
  }

  return null;
}

// ============================================================
// 1. GÜNLÜK: Cozy Cabin / Mountain Lodge with Charming Details
// ============================================================
function CabinStructure({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const smokePuffs = useRef<THREE.Group>(null);
  const lanternLightRef = useRef<THREE.PointLight>(null);
  const tierScaleRef = useStationScale(tier);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (smokePuffs.current) {
      smokePuffs.current.children.forEach((puff, i) => {
        const offset = i * 0.8;
        const progress = ((t + offset) % 3.0) / 3.0; // 0 to 1
        puff.position.y = 5.2 + progress * 2.8;
        puff.position.x = Math.sin(t * 1.2 + i) * 0.25;
        puff.scale.setScalar(0.35 + progress * 0.65);
        const mat = (puff as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) mat.opacity = (1 - progress) * 0.55;
      });
    }
    if (lanternLightRef.current) {
      lanternLightRef.current.intensity = (isActive ? 3.0 : 1.6) + Math.sin(t * 4) * 0.2;
    }
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={5.8} />

      {/* Stone Foundation Base */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.6, 0.7, 5.8]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Front Entrance Stone Steps */}
      <mesh position={[0, 0.15, 3.2]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.3, 0.8]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 2.8]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.3, 0.6]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Wooden Cabin Walls */}
      <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.8, 2.4, 5.2]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>

      {/* Corner Timber Posts */}
      {[-2.8, 2.8].map((x, i) =>
        [-2.5, 2.5].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 1.9, z]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 2.5, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
        ))
      )}

      {/* Pitched Wooden Roof */}
      <mesh position={[0, 3.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.8, 2.0, 4]} />
        <meshStandardMaterial color="#451a03" roughness={0.7} />
      </mesh>

      {/* Front Wooden Door with Frame */}
      <mesh position={[0, 1.25, 2.62]} castShadow>
        <boxGeometry args={[1.2, 1.9, 0.1]} />
        <meshStandardMaterial color="#271306" />
      </mesh>
      {/* Warm Golden Door Glow Spill */}
      <mesh position={[0, 1.25, 2.64]}>
        <planeGeometry args={[0.9, 1.6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={isActive ? 2.5 : 1.2} />
      </mesh>

      {/* Warm Glowing Windows with Planter Flower Boxes */}
      {[-1.8, 1.8].map((x, i) => (
        <group key={i} position={[x, 1.8, 2.62]}>
          <mesh>
            <boxGeometry args={[1.0, 1.0, 0.08]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={isActive ? 2.8 : 1.4}
            />
          </mesh>
          {/* Flower Box */}
          <mesh position={[0, -0.6, 0.12]} castShadow>
            <boxGeometry args={[1.2, 0.22, 0.3]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          {/* Flowers in Box */}
          {[-0.35, 0, 0.35].map((fx, fi) => (
            <mesh key={fi} position={[fx, -0.42, 0.16]}>
              <sphereGeometry args={[0.1, 6, 6]} />
              <meshStandardMaterial color={fi % 2 === 0 ? '#f43f5e' : '#f59e0b'} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Stone Chimney */}
      <mesh position={[1.8, 3.4, -1.2]} castShadow>
        <boxGeometry args={[0.95, 3.6, 0.95]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Animated Chimney Smoke Puffs */}
      <group ref={smokePuffs} position={[1.8, 0, -1.2]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, 5.2, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.5} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Porch Bench */}
      <group position={[-2.2, 0.65, 3.1]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.35, -0.22]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[1.5, 0.6, 0.08]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {[-0.6, 0.6].map((bx, bi) => (
          <mesh key={bi} position={[bx, -0.25, 0]} castShadow>
            <boxGeometry args={[0.1, 0.4, 0.45]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
        ))}
      </group>

      {/* Porch Hanging Lantern */}
      <group position={[0.9, 2.3, 2.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.22, 0.32, 0.22]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={3.5} />
        </mesh>
        <pointLight ref={lanternLightRef} position={[0, -0.2, 0.2]} color="#f59e0b" intensity={2.2} distance={8} />
      </group>

      {/* Decorative Wooden Trail Sign */}
      <group position={[3.6, 0, 2.5]} rotation={[0, -0.3, 0]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.4, 6]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0.2, 1.1, 0]} castShadow>
          <boxGeometry args={[0.7, 0.25, 0.06]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.6} />
        </mesh>
      </group>
      <StationTierUpgrades stationId={1} tier={tier} />
    </group>
  );
}

// ============================================================
// 2. KURAN: Gilded Dome Pavilion & Sacred Courtyard
// ============================================================
function QuranPavilion({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const crystalRef = useRef<THREE.Group>(null);
  const tierScaleRef = useStationScale(tier);

  useFrame(({ clock }) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += 0.018;
      crystalRef.current.position.y = 2.4 + Math.sin(clock.getElapsedTime() * 2) * 0.18;
    }
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={6.2} />

      {/* Tiered Octagonal Marble Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5.2, 5.6, 0.4, 8]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.4, 4.8, 0.35, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* 6 Elegant Fluted Marble Columns */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * 3.4;
        const z = Math.sin(angle) * 3.4;
        return (
          <group key={i} position={[x, 2.2, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.22, 0.28, 3.2, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.2} />
            </mesh>
            {/* Column Capital & Base Ring */}
            <mesh position={[0, 1.55, 0]} castShadow>
              <boxGeometry args={[0.55, 0.12, 0.55]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -1.55, 0]} castShadow>
              <boxGeometry args={[0.6, 0.12, 0.6]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Gilded Dome Canopy */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <sphereGeometry args={[3.6, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={isActive ? 0.9 : 0.4}
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* Dome Golden Finial */}
      <mesh position={[0, 8.1, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 0.6, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} emissive="#f59e0b" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 8.45, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} emissive="#f59e0b" emissiveIntensity={2.0} />
      </mesh>

      {/* Floating Sacred Script Crystal with Orbiting Ring */}
      <group ref={crystalRef} position={[0, 2.4, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={isActive ? 3.5 : 1.8}
            metalness={0.9}
          />
        </mesh>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.5, 0.06, 6, 24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Miniature Cypress Shrubs in Pots Around Base */}
      {[0.5, 2.5, 4.5].map((angleStep, idx) => {
        const a = angleStep * (Math.PI / 3);
        const px = Math.cos(a) * 4.8;
        const pz = Math.sin(a) * 4.8;
        return (
          <group key={idx} position={[px, 0.35, pz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.3, 0.22, 0.45, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.75, 0]} castShadow>
              <coneGeometry args={[0.4, 1.2, 8]} />
              <meshStandardMaterial color="#047857" roughness={0.5} />
            </mesh>
          </group>
        );
      })}

      <pointLight position={[0, 2.6, 0]} color="#fbbf24" intensity={isActive ? 3.8 : 2.0} distance={11} />
      <Sparkles count={20} scale={[5.5, 4.5, 5.5]} color="#fde68a" size={2.2} speed={0.4} />
      <StationTierUpgrades stationId={2} tier={tier} />
    </group>
  );
}

// ============================================================
// 3. HADIS: Classical Stone Library & Scholar Benches
// ============================================================
function HadisLibrary({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const tierScaleRef = useStationScale(tier);
  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={6.5} />

      {/* Multi-tier Stone Base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.8, 5.8]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.15, 3.2]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.3, 0.8]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Library Main Hall */}
      <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.6, 3.0, 5.0]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Front Classical Fluted Columns (4) */}
      {[-2.5, -0.85, 0.85, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 2.3, 2.6]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 3.0, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.25} />
        </mesh>
      ))}

      {/* Classical Triangular Pediment Roof */}
      <mesh position={[0, 4.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[5.0, 1.5, 4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Pediment Relief Medallion */}
      <mesh position={[0, 4.0, 2.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 12]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={1.5} />
      </mesh>

      {/* Glowing Emerald Arched Entrance */}
      <mesh position={[0, 1.7, 2.52]}>
        <boxGeometry args={[1.5, 2.4, 0.1]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={isActive ? 2.8 : 1.4}
        />
      </mesh>

      {/* Scholar Reading Benches on Sides */}
      {[-3.8, 3.8].map((x, i) => (
        <group key={i} position={[x, 0.45, 1.5]} rotation={[0, i === 0 ? 0.4 : -0.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.12, 0.6]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
          {[-0.6, 0.6].map((bx, bi) => (
            <mesh key={bi} position={[bx, -0.2, 0]} castShadow>
              <boxGeometry args={[0.15, 0.35, 0.5]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          ))}
        </group>
      ))}

      <pointLight position={[0, 2.1, 3.4]} color="#10b981" intensity={isActive ? 3.2 : 1.5} distance={9} />
      <StationTierUpgrades stationId={3} tier={tier} />
    </group>
  );
}

// ============================================================
// 4. MATRIS: Modern Geometric Matrix Pavilion
// ============================================================
function MatrixPavilion({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const gyroX = useRef<THREE.Mesh>(null);
  const gyroY = useRef<THREE.Mesh>(null);
  const tierScaleRef = useStationScale(tier);

  useFrame(() => {
    if (gyroX.current) gyroX.current.rotation.x += 0.015;
    if (gyroY.current) gyroY.current.rotation.y += 0.025;
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={5.8} />

      {/* 4-Quadrant Eisenhower Geometric Floor */}
      <group position={[0, 0.3, 0]}>
        {/* Q1: Red (Urgent & Important) */}
        <mesh position={[-1.7, 0, -1.7]} receiveShadow>
          <boxGeometry args={[3.2, 0.5, 3.2]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isActive ? 0.9 : 0.35} />
        </mesh>
        {/* Q2: Amber (Not Urgent & Important) */}
        <mesh position={[1.7, 0, -1.7]} receiveShadow>
          <boxGeometry args={[3.2, 0.5, 3.2]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={isActive ? 0.9 : 0.35} />
        </mesh>
        {/* Q3: Blue (Urgent & Not Important) */}
        <mesh position={[-1.7, 0, 1.7]} receiveShadow>
          <boxGeometry args={[3.2, 0.5, 3.2]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={isActive ? 0.9 : 0.35} />
        </mesh>
        {/* Q4: Slate (Not Urgent & Not Important) */}
        <mesh position={[1.7, 0, 1.7]} receiveShadow>
          <boxGeometry args={[3.2, 0.5, 3.2]} />
          <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={isActive ? 0.9 : 0.35} />
        </mesh>
      </group>

      {/* Cyber Glass Cube Pavilion */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[4.4, 3.8, 4.4]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          transmission={0.88}
          roughness={0.06}
          metalness={0.2}
          thickness={0.5}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Cyber Corner Neon Struts */}
      {[-2.2, 2.2].map((x, i) =>
        [-2.2, 2.2].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 2.5, z]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 3.8, 8]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.0} />
          </mesh>
        ))
      )}

      {/* Dual Gyroscope Energy Core */}
      <group position={[0, 2.5, 0]}>
        <mesh ref={gyroX}>
          <torusGeometry args={[1.5, 0.08, 8, 24]} />
          <meshStandardMaterial color="#38bdf8" emissive="#06b6d4" emissiveIntensity={isActive ? 3.5 : 1.8} />
        </mesh>
        <mesh ref={gyroY} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.2, 0.07, 8, 24]} />
          <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={isActive ? 3.5 : 1.8} />
        </mesh>
      </group>

      <pointLight position={[0, 2.5, 0]} color="#38bdf8" intensity={isActive ? 3.2 : 1.6} distance={10} />
      <StationTierUpgrades stationId={4} tier={tier} />
    </group>
  );
}

// ============================================================
// 5. HATALAR: Basalt Reflection Shrine & Monument
// ============================================================
function HatalarMonument({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const orbRef = useRef<THREE.Mesh>(null);
  const tierScaleRef = useStationScale(tier);

  useFrame(({ clock }) => {
    if (orbRef.current) {
      orbRef.current.position.y = 3.8 + Math.sin(clock.getElapsedTime() * 2) * 0.16;
      orbRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={5.8} />

      {/* Stepped Dark Basalt Circular Platform */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.4, 4.8, 0.5, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.6, 3.9, 0.3, 16]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Central Reflection Monolith */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.7, 1.2, 3.4, 4]} />
        <meshStandardMaterial color="#090d16" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Glowing Ruby Core */}
      <mesh ref={orbRef} position={[0, 3.8, 0]}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#e11d48"
          emissiveIntensity={isActive ? 3.8 : 1.8}
          metalness={0.8}
        />
      </mesh>

      {/* 4 Surrounding Basalt Runic Pillars */}
      {[0, 1, 2, 3].map(i => {
        const a = (i * Math.PI) / 2;
        return (
          <group key={i} position={[Math.cos(a) * 3.0, 1.1, Math.sin(a) * 3.0]}>
            <mesh castShadow>
              <boxGeometry args={[0.55, 1.8, 0.55]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Runic Glow Inlay */}
            <mesh position={[0, 0, 0.28]}>
              <boxGeometry args={[0.15, 1.2, 0.02]} />
              <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={2.0} />
            </mesh>
          </group>
        );
      })}

      <pointLight position={[0, 3.8, 0]} color="#f43f5e" intensity={isActive ? 3.5 : 1.5} distance={9} />
      <Sparkles count={16} scale={[5, 4, 5]} color="#fda4af" size={2.0} speed={0.4} />
      <StationTierUpgrades stationId={5} tier={tier} />
    </group>
  );
}

// ============================================================
// 6. ŞÜKÜR: Garden Gazebo & Blossom Sanctuary
// ============================================================
function SukurGazebo({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const tierScaleRef = useStationScale(tier);
  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={6.0} />

      {/* Stepped Garden Base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 5.0, 0.6, 12]} />
        <meshStandardMaterial color="#064e3b" roughness={0.7} />
      </mesh>

      {/* Slender Golden Gazebo Pillars (8) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const a = (i * Math.PI) / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.5, 1.9, Math.sin(a) * 3.5]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 2.8, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
        );
      })}

      {/* Ornate Emerald Conical Roof */}
      <mesh position={[0, 4.0, 0]} castShadow>
        <coneGeometry args={[4.2, 1.8, 12]} />
        <meshStandardMaterial color="#059669" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Central Luminous Floral Altar */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[1.3, 1.5, 1.4, 8]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={isActive ? 1.8 : 0.6}
        />
      </mesh>

      {/* Surrounding Garden Blossom Urns */}
      {[0.3, 1.8, 3.5, 5.2].map((angle, idx) => {
        const gx = Math.cos(angle) * 4.6;
        const gz = Math.sin(angle) * 4.6;
        return (
          <group key={idx} position={[gx, 0.6, gz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.35, 0.25, 0.5, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={1.0} />
            </mesh>
          </group>
        );
      })}

      <Sparkles count={26} scale={[6.5, 4.5, 6.5]} color="#6ee7b7" size={2.8} speed={0.35} />
      <pointLight position={[0, 2.3, 0]} color="#10b981" intensity={isActive ? 3.4 : 1.8} distance={10} />
      <StationTierUpgrades stationId={6} tier={tier} />
    </group>
  );
}

// ============================================================
// 7. MESCİDİM: Digital Mosque with Minaret, Dome & Fountain
// ============================================================
function MosqueStructure({ isActive, tier }: { isActive: boolean; tier: StationTier }) {
  const crescentRef = useRef<THREE.Mesh>(null);
  const tierScaleRef = useStationScale(tier);

  useFrame(({ clock }) => {
    if (crescentRef.current) {
      crescentRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.35;
    }
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={7.5} />

      {/* Mosque Marble Platform */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.8, 0.8, 8.8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Front Entrance Steps */}
      <mesh position={[0, 0.2, 4.7]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.4, 0.8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>

      {/* Main Prayer Hall */}
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.2, 3.8, 7.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Grand Turquoise Central Dome */}
      <mesh position={[0, 5.6, 0]} castShadow>
        <sphereGeometry args={[3.4, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#0d9488"
          emissive="#0f766e"
          emissiveIntensity={isActive ? 1.0 : 0.45}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* Golden Crescent Finial atop Dome */}
      <mesh ref={crescentRef} position={[0, 9.0, 0]}>
        <torusGeometry args={[0.42, 0.08, 8, 16, Math.PI * 1.5]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} emissive="#f59e0b" emissiveIntensity={1.5} />
      </mesh>

      {/* Tall Minaret Tower (Right Side) */}
      <GrowthLayer active={tier >= 2}><group position={[4.8, 0, 4.0]}>
        <mesh position={[0, 5.8, 0]} castShadow>
          <cylinderGeometry args={[0.68, 0.95, 10.8, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Minaret Balcony (Şerefe) */}
        <mesh position={[0, 9.2, 0]} castShadow>
          <cylinderGeometry args={[1.05, 0.75, 0.65, 12]} />
          <meshStandardMaterial color="#0d9488" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Minaret Conical Spire (Külah) */}
        <mesh position={[0, 12.0, 0]} castShadow>
          <coneGeometry args={[0.68, 3.0, 12]} />
          <meshStandardMaterial color="#0d9488" metalness={0.6} />
        </mesh>
      </group></GrowthLayer>

      {/* Arched Entrance Doors */}
      <mesh position={[0, 1.9, 3.62]}>
        <boxGeometry args={[1.9, 2.8, 0.1]} />
        <meshStandardMaterial
          color="#047857"
          emissive="#059669"
          emissiveIntensity={isActive ? 2.8 : 1.2}
        />
      </mesh>

      {/* Courtyard Ablution Fountain (Şadırvan) */}
      <GrowthLayer active={tier >= 3}><group position={[-3.2, 0.4, 4.8]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 1.0, 0.45, 8]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.05, 8]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
      </group></GrowthLayer>

      <pointLight position={[0, 2.6, 4.8]} color="#14b8a6" intensity={isActive ? 3.8 : 2.0} distance={13} />
      <Sparkles count={22} scale={[8.5, 6.5, 8.5]} color="#99f6e4" size={2.2} speed={0.35} />
      <StationTierUpgrades stationId={7} tier={tier} />
    </group>
  );
}

// ============================================================
// 8. AHIRET DEPOSU: Celestial Palace & Divine Vault
// ============================================================
function AhiretPalace({ isActive, xp, tier, villageTier }: { isActive: boolean; xp: number; tier: StationTier; villageTier: VillageTier }) {
  const crystalCrown = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.PointLight>(null);
  const xpGlow = 1 + Math.min(xp / 4000, 1.75);
  const globalPalaceTier: StationTier = villageTier >= 4 ? 3 : villageTier >= 2 ? 2 : 1;
  const effectiveTier = Math.max(tier, globalPalaceTier) as StationTier;
  const tierScaleRef = useStationScale(effectiveTier);

  useFrame(({ clock }) => {
    if (crystalCrown.current) {
      crystalCrown.current.rotation.y += 0.02;
      crystalCrown.current.position.y = 8.0 + Math.sin(clock.getElapsedTime() * 1.8) * 0.38;
    }
    if (beaconRef.current) {
      beaconRef.current.intensity = (isActive ? 5.2 : 2.6) * xpGlow + Math.sin(clock.getElapsedTime() * 1.4) * 0.5;
    }
  });

  return (
    <group ref={tierScaleRef}>
      <BuildingGroundShadow radius={8.5} />

      {/* Long-range guiding beacon: visible through the horizon haze. */}
      <mesh position={[0, 20, 0]} renderOrder={3}>
        <cylinderGeometry args={[0.55, 2.8, 34, 16, 1, true]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={0.1 + Math.min(xp / 12000, 0.12)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grand Tiered Celestial Foundation */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[8.8, 9.8, 1.0, 16]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[7.5, 8.0, 0.8, 16]} />
        <meshStandardMaterial color="#312e81" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main Palace Citadel */}
      <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[6.0, 6.6, 4.4, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.3} />
      </mesh>

      {/* Gilded Celestial Grand Dome */}
      <mesh position={[0, 7.0, 0]} castShadow>
        <sphereGeometry args={[5.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={isActive ? 2.0 : 0.9}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Floating Crown Gem of Deeds with Dual Gyro Rings */}
      <group ref={crystalCrown} position={[0, 8.0, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[1.9, 0]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={4.5}
            metalness={0.9}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[3.0, 0.12, 8, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={3.2} />
        </mesh>
        <mesh rotation={[-Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.5, 0.09, 8, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3.0} />
        </mesh>
      </group>

      <Sparkles count={45} scale={[13, 11, 13]} color="#fde047" size={3.8} speed={0.5} />
      <pointLight ref={beaconRef} position={[0, 11.5, 0]} color="#f59e0b" intensity={3.4 * xpGlow} distance={74 + Math.min(xp / 70, 72)} />

      <GrowthLayer active={villageTier >= 2}>
        {[-1, 1].map(side => <group key={side} position={[side * 8.3, 0, 0]}><mesh position={[0, 3.4, 0]} castShadow><cylinderGeometry args={[1.15, 1.6, 5.8, 10]} /><meshStandardMaterial color="#f8fafc" metalness={0.32} roughness={0.2} /></mesh><mesh position={[0, 6.2, 0]} castShadow><coneGeometry args={[1.55, 2.5, 10]} /><meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} metalness={0.82} /></mesh></group>)}
      </GrowthLayer>
      <GrowthLayer active={villageTier >= 3}>
        <mesh position={[0, 1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[10.8, 11.4, 48]} /><meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2.2} /></mesh>
        {[0, 1, 2, 3].map(index => { const angle = index * Math.PI / 2 + Math.PI / 4; return <mesh key={index} position={[Math.cos(angle) * 10.8, 2.4, Math.sin(angle) * 10.8]} castShadow><octahedronGeometry args={[1.25, 0]} /><meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={2.4} metalness={0.75} /></mesh>; })}
      </GrowthLayer>
      <GrowthLayer active={villageTier >= 4}>
        {[0, 1, 2].map(index => <mesh key={index} position={[0, 10.5 + index * 1.35, 0]} rotation={[Math.PI / 2 + index * 0.3, index * 0.5, 0]}><torusGeometry args={[6.2 - index * 0.8, 0.1, 8, 40]} /><meshStandardMaterial color={index % 2 ? '#67e8f9' : '#fde047'} emissive={index % 2 ? '#0891b2' : '#d97706'} emissiveIntensity={3.2} /></mesh>)}
      </GrowthLayer>
      <GrowthLayer active={villageTier >= 5}>
        <Sparkles count={95} scale={[24, 24, 24]} color="#ffffff" size={3.2} speed={0.38} />
        <pointLight position={[0, 18, 0]} color="#fff7d6" intensity={8} distance={190} />
      </GrowthLayer>
    </group>
  );
}

// ============================================================
// Main Village Buildings Group
// ============================================================
export default function VillageBuildings({ activeBuildingId, xp, villageTier, stationTiers }: VillageBuildingsProps) {
  return (
    <group>
      {VILLAGE_LOCATIONS.map(loc => {
        if (loc.id === 0) return null; // Central plaza is in terrain

        const y = getTerrainHeight(loc.x, loc.z) + (loc.yOffset ?? 0);
        const isActive = activeBuildingId === loc.id;

        return (
          <group key={loc.id} position={[loc.x, y, loc.z]}>
            {/* Active Proximity Halo Ring */}
            {isActive && (
              <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[6.8, 7.5, 32]} />
                <meshStandardMaterial
                  color={loc.color}
                  emissive={loc.color}
                  emissiveIntensity={3.5}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            )}

            {/* Individual Themed Building Architecture */}
            {loc.id === 1 && <CabinStructure isActive={isActive} tier={stationTiers[1]} />}
            {loc.id === 2 && <QuranPavilion isActive={isActive} tier={stationTiers[2]} />}
            {loc.id === 3 && <HadisLibrary isActive={isActive} tier={stationTiers[3]} />}
            {loc.id === 4 && <MatrixPavilion isActive={isActive} tier={stationTiers[4]} />}
            {loc.id === 5 && <HatalarMonument isActive={isActive} tier={stationTiers[5]} />}
            {loc.id === 6 && <SukurGazebo isActive={isActive} tier={stationTiers[6]} />}
            {loc.id === 7 && <MosqueStructure isActive={isActive} tier={stationTiers[7]} />}
            {loc.id === 8 && <AhiretPalace isActive={isActive} xp={xp} tier={stationTiers[8]} villageTier={villageTier} />}
          </group>
        );
      })}
    </group>
  );
}

'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { VILLAGE_LOCATIONS, getTerrainHeight } from '@/lib/villageData';
import type { StationTier, StationTierMap, VillageTier } from '@/lib/growth';
import { SafeGltfInstances, SafeGltfModel, preloadGltfAssets, type AssetTransform } from './ModelAsset';

interface VillageBuildingsProps {
  activeBuildingId: number | null;
  xp: number;
  villageTier: VillageTier;
  stationTiers: StationTierMap;
}
const BUILDING = {
  floor: '/models/buildings/floor.glb',
  wall: '/models/buildings/wall.glb',
  roundCorner: '/models/buildings/wall-corner-round.glb',
  squareDoor: '/models/buildings/wall-doorway-square.glb',
  roundDoor: '/models/buildings/wall-doorway-round.glb',
  wideRoundDoor: '/models/buildings/wall-doorway-wide-round.glb',
  squareWindow: '/models/buildings/wall-window-square-detailed.glb',
  roundWindow: '/models/buildings/wall-window-round-detailed.glb',
  wideWindow: '/models/buildings/wall-window-wide-square.glb',
  column: '/models/buildings/column.glb',
  thinColumn: '/models/buildings/column-thin.glb',
  wideColumn: '/models/buildings/column-wide.glb',
  roof: '/models/buildings/roof-flat-square.glb',
  roofCorner: '/models/buildings/roof-flat-corner.glb',
  stairs: '/models/buildings/stairs-center.glb',
  border: '/models/buildings/border.glb',
  borderRound: '/models/buildings/border-corner-round.glb',
  plating: '/models/buildings/plating-detailed.glb',
} as const;

preloadGltfAssets(Object.values(BUILDING));

function useStationScale(tier: StationTier) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = tier === 1 ? 0.86 : tier === 2 ? 0.98 : 1.1;
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

interface ShellProps {
  width?: number;
  depth?: number;
  height?: number;
  tint: string;
  door?: 'round' | 'square' | 'wide-round';
  window?: 'round' | 'square' | 'wide';
  position?: [number, number, number];
  rotation?: [number, number, number];
}

function BuildingShell({ width = 2.8, depth = 2.4, height = 1, tint, door = 'square', window = 'square', position = [0, 0, 0], rotation = [0, 0, 0] }: ShellProps) {
  const doorUrl = door === 'round' ? BUILDING.roundDoor : door === 'wide-round' ? BUILDING.wideRoundDoor : BUILDING.squareDoor;
  const windowUrl = window === 'round' ? BUILDING.roundWindow : window === 'wide' ? BUILDING.wideWindow : BUILDING.squareWindow;
  const wallY = 1.55 * height;
  const roofY = 3.2 * height;
  return (
    <group position={position} rotation={rotation}>
      <SafeGltfModel url={BUILDING.floor} position={[0, 0.05, 0]} scale={[width, 1, depth]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={BUILDING.wall} position={[0, wallY, -depth]} scale={[width, height, 1]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={doorUrl} position={[0, wallY, depth]} rotation={[0, Math.PI, 0]} scale={[width, height, 1]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={windowUrl} position={[-width, wallY, 0]} rotation={[0, Math.PI / 2, 0]} scale={[depth, height, 1]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={windowUrl} position={[width, wallY, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[depth, height, 1]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={BUILDING.roof} position={[0, roofY, 0]} scale={[width * 1.1, 1, depth * 1.1]} tint={tint} fallbackColor={tint} />
      <SafeGltfModel url={BUILDING.stairs} position={[0, 0.05, depth + 0.65]} rotation={[0, Math.PI, 0]} scale={[1.35, 0.72, 1.2]} tint={tint} fallbackColor={tint} />
    </group>
  );
}

function ModelColumns({ radius, count, height, tint, y = 0 }: { radius: number; count: number; height: number; tint: string; y?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const angle = index / count * Math.PI * 2;
        return <SafeGltfModel key={index} url={BUILDING.thinColumn} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]} scale={[0.75, height, 0.75]} tint={tint} fallbackColor={tint} />;
      })}
    </group>
  );
}

function JournalStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <BuildingShell width={3.1} depth={2.5} tint="#b45309" window="square" />
      <SafeGltfModel url="/models/nature/log_stack.glb" position={[-4.2, 0, 1.8]} scale={1.4} />
      <GrowthLayer active={tier >= 2}>
        <SafeGltfModel url={BUILDING.roof} position={[0, 2.7, 4.15]} scale={[3.25, 0.72, 1.7]} tint="#92400e" />
        {[-2.7, 2.7].map(x => <SafeGltfModel key={x} url={BUILDING.thinColumn} position={[x, 0, 4.6]} scale={[0.7, 1.6, 0.7]} tint="#78350f" />)}
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <BuildingShell width={1.9} depth={1.7} height={0.72} tint="#d97706" position={[0, 3.1, -0.35]} />
        <SafeGltfModel url={BUILDING.wideWindow} position={[4.1, 1.25, -0.4]} rotation={[0, -Math.PI / 2, 0]} scale={[1.7, 1.3, 1]} tint="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        <Sparkles count={22} scale={[9, 7, 9]} color="#fde68a" size={1.8} speed={0.2} />
      </GrowthLayer>
      <pointLight position={[0, 2.4, 3.1]} color="#f59e0b" intensity={1.4 + tier * 0.45} distance={18} />
    </group>
  );
}

function QuranStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <SafeGltfModel url={BUILDING.floor} position={[0, 0.08, 0]} scale={[4.1, 1, 4.1]} tint="#fbbf24" />
      <ModelColumns radius={3.6} count={6} height={2.5} tint="#f8fafc" />
      <SafeGltfModel url={BUILDING.roofCorner} position={[0, 4.4, 0]} scale={[4.3, 1.2, 4.3]} tint="#fbbf24" emissive="#d97706" emissiveIntensity={0.3 + tier * 0.2} />
      <SafeGltfModel url={BUILDING.wideRoundDoor} position={[0, 1.6, -2.7]} scale={[2.4, 1.5, 1]} tint="#f59e0b" />
      <GrowthLayer active={tier >= 2}>
        <ModelColumns radius={5.3} count={8} height={1.7} tint="#fde68a" />
        <SafeGltfModel url={BUILDING.borderRound} position={[0, 4.9, 0]} scale={[4.8, 1, 4.8]} tint="#f59e0b" />
      </GrowthLayer>
      <GrowthLayer active={tier >= 3}>
        <SafeGltfModel url={BUILDING.floor} position={[0, 0.16, 5.8]} scale={[2.4, 1, 2.4]} tint="#38bdf8" emissive="#0284c7" emissiveIntensity={0.7} />
        {[[-2.3, 4.9], [2.3, 4.9], [-2.3, 6.8], [2.3, 6.8]].map(([x, z], index) => <SafeGltfModel key={index} url={BUILDING.roundCorner} position={[x, 0, z]} scale={[0.75, 1.8, 0.75]} tint="#fbbf24" />)}
      </GrowthLayer>
      <pointLight position={[0, 4, 0]} color="#fbbf24" intensity={2 + tier * 0.6} distance={22} />
    </group>
  );
}

function HadisStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <BuildingShell width={3.5} depth={2.8} tint="#475569" window="round" door="round" />
      <SafeGltfModel url={BUILDING.plating} position={[0, 1.5, -2.95]} scale={[3, 1.5, 1]} tint="#10b981" />
      <GrowthLayer active={tier >= 2}><BuildingShell width={1.8} depth={2.1} height={0.82} tint="#64748b" window="square" position={[4.8, 0, 0]} /><ModelColumns radius={4.8} count={4} height={1.55} tint="#d1fae5" /></GrowthLayer>
      <GrowthLayer active={tier >= 3}><BuildingShell width={1.8} depth={2.1} height={0.82} tint="#64748b" window="square" position={[-4.8, 0, 0]} />{[-4.5, -1.5, 1.5, 4.5].map(x => <SafeGltfModel key={x} url={BUILDING.column} position={[x, 0, 5]} scale={[0.8, 2, 0.8]} tint="#f8fafc" />)}</GrowthLayer>
      <pointLight position={[0, 2.8, 2.6]} color="#10b981" intensity={1.2 + tier * 0.45} distance={18} />
    </group>
  );
}

function MatrixStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <BuildingShell width={2.7} depth={2.7} tint="#0891b2" window="wide" door="square" />
      {[[-3.1, -3.1], [3.1, -3.1], [-3.1, 3.1], [3.1, 3.1]].map(([x, z], index) => <SafeGltfModel key={index} url={BUILDING.border} position={[x, 0.12, z]} rotation={[0, index % 2 ? Math.PI / 2 : 0, 0]} scale={[2.8, 1, 1]} tint="#22d3ee" emissive="#06b6d4" emissiveIntensity={1.1} />)}
      <GrowthLayer active={tier >= 2}><SafeGltfModel url={BUILDING.plating} position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} scale={[3.4, 2, 3.4]} tint="#22d3ee" emissive="#0891b2" emissiveIntensity={0.7} /></GrowthLayer>
      <GrowthLayer active={tier >= 3}><BuildingShell width={1.85} depth={1.85} height={0.7} tint="#7c3aed" window="wide" position={[0, 3.25, 0]} />{[0, 1, 2].map(index => <SafeGltfModel key={index} url={BUILDING.borderRound} position={[0, 6.2 + index * 0.65, 0]} rotation={[index * 0.35, index * 0.6, 0]} scale={[3.1 - index * 0.35, 0.7, 3.1 - index * 0.35]} tint={index % 2 ? '#a78bfa' : '#22d3ee'} emissive="#06b6d4" emissiveIntensity={1.2} />)}</GrowthLayer>
      <pointLight position={[0, 4, 0]} color="#22d3ee" intensity={1.8 + tier * 0.7} distance={24} />
    </group>
  );
}

function HatalarStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <SafeGltfModel url={BUILDING.floor} position={[0, 0.04, 0]} scale={[4.5, 1, 4.5]} tint="#1c1917" />
      <SafeGltfModel url={BUILDING.plating} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.3, 3, 1.3]} tint="#292524" />
      <SafeGltfModel url={BUILDING.wideColumn} position={[0, 0, 0]} scale={[1.8, 3.5, 1.8]} tint="#292524" />
      <GrowthLayer active={tier >= 2}><SafeGltfModel url={BUILDING.borderRound} position={[0, 0.18, 0]} scale={[5.3, 1, 5.3]} tint="#075985" emissive="#0284c7" emissiveIntensity={0.65} /></GrowthLayer>
      <GrowthLayer active={tier >= 3}>{Array.from({ length: 6 }, (_, index) => { const angle = index * Math.PI / 3; return <SafeGltfModel key={index} url={BUILDING.column} position={[Math.cos(angle) * 5, 0, Math.sin(angle) * 5]} scale={[0.65, 2.1, 0.65]} tint="#78350f" emissive="#f59e0b" emissiveIntensity={0.8} />; })}<pointLight position={[0, 3.6, 0]} color="#f59e0b" intensity={2.4} distance={16} /></GrowthLayer>
    </group>
  );
}

function SukurStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  const flowerCount = tier === 1 ? 6 : tier === 2 ? 16 : 32;
  const flowerModels = ['/models/nature/flower_purpleA.glb', '/models/nature/flower_redB.glb', '/models/nature/flower_yellowC.glb'];
  const flowerGroups = flowerModels.map((url, variant) => ({ url, transforms: Array.from({ length: flowerCount }, (_, index) => index).filter(index => index % 3 === variant).map(index => { const angle = index / flowerCount * Math.PI * 2; const radius = 5.4 + index % 3 * 0.7; return { position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], rotation: [0, angle, 0], scale: 1.4 + (index % 4) * 0.12 } as AssetTransform; }) }));
  return (
    <group ref={scaleRef}>
      <SafeGltfModel url={BUILDING.floor} position={[0, 0.05, 0]} scale={[3.8, 1, 3.8]} tint="#10b981" />
      <ModelColumns radius={3.3} count={8} height={2.2} tint="#fef3c7" />
      <SafeGltfModel url={BUILDING.roofCorner} position={[0, 4, 0]} scale={[4, 1.1, 4]} tint="#f59e0b" />
      {flowerGroups.map(group => <SafeGltfInstances key={group.url} url={group.url} transforms={group.transforms} />)}
      <GrowthLayer active={tier >= 2}><SafeGltfModel url={BUILDING.borderRound} position={[0, 4.5, 0]} scale={[4.3, 1, 4.3]} tint="#fbbf24" /></GrowthLayer>
      <GrowthLayer active={tier >= 3}><ModelColumns radius={5.4} count={10} height={1.3} tint="#fde68a" /><Sparkles count={48} scale={[15, 7, 15]} color="#fde68a" size={2.1} speed={0.25} /></GrowthLayer>
      <pointLight position={[0, 3, 0]} color="#fbbf24" intensity={1.8 + tier * 0.6} distance={20} />
    </group>
  );
}

function MosqueStation({ tier }: { tier: StationTier }) {
  const scaleRef = useStationScale(tier);
  return (
    <group ref={scaleRef}>
      <BuildingShell width={3.7} depth={3.2} tint="#059669" window="round" door="wide-round" />
      <ModelColumns radius={4.3} count={4} height={2.4} tint="#f8fafc" />
      <GrowthLayer active={tier >= 2}><SafeGltfModel url={BUILDING.thinColumn} position={[-5.1, 0, -1]} scale={[1.1, 5.3, 1.1]} tint="#f8fafc" /><SafeGltfModel url={BUILDING.roofCorner} position={[-5.1, 8, -1]} scale={[1.5, 1.2, 1.5]} tint="#fbbf24" emissive="#d97706" emissiveIntensity={0.8} /></GrowthLayer>
      <GrowthLayer active={tier >= 3}><SafeGltfModel url={BUILDING.floor} position={[0, 0.13, 6.4]} scale={[6.2, 1, 2.8]} tint="#e2e8f0" />{[-5, -2.5, 0, 2.5, 5].map(x => <SafeGltfModel key={x} url={BUILDING.column} position={[x, 0, 7.2]} scale={[0.75, 2.2, 0.75]} tint="#f8fafc" />)}<Sparkles count={34} scale={[14, 10, 14]} color="#fbbf24" size={2} speed={0.18} /></GrowthLayer>
      <pointLight position={[0, 4, 2.5]} color="#34d399" intensity={2.2 + tier * 0.6} distance={26} />
    </group>
  );
}

function AhiretStation({ tier, villageTier, xp }: { tier: StationTier; villageTier: VillageTier; xp: number }) {
  const scaleRef = useStationScale(Math.max(tier, Math.ceil(villageTier / 2)) as StationTier);
  const glow = 1 + Math.min(xp / 400, 2.4);
  return (
    <group ref={scaleRef}>
      <BuildingShell width={5.2} depth={4.5} height={1.35} tint="#fbbf24" window="round" door="wide-round" />
      <ModelColumns radius={6.2} count={8} height={3.4} tint="#fef3c7" />
      <SafeGltfModel url={BUILDING.borderRound} position={[0, 6.1, 0]} scale={[6.3, 1.2, 6.3]} tint="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2 * glow} />
      <GrowthLayer active={villageTier >= 2}>{[-1, 1].map(side => <group key={side} position={[side * 7.2, 0, 0]}><SafeGltfModel url={BUILDING.wideColumn} position={[0, 0, 0]} scale={[1.4, 4.4, 1.4]} tint="#f8fafc" /><SafeGltfModel url={BUILDING.roofCorner} position={[0, 7.2, 0]} scale={[1.9, 1.3, 1.9]} tint="#fbbf24" emissive="#d97706" emissiveIntensity={1.1} /></group>)}</GrowthLayer>
      <GrowthLayer active={villageTier >= 3}><BuildingShell width={2.5} depth={2.3} height={0.8} tint="#fde68a" window="round" door="round" position={[0, 5.3, 0]} /><Sparkles count={55} scale={[20, 18, 20]} color="#fde047" size={3} speed={0.3} /></GrowthLayer>
      <GrowthLayer active={villageTier >= 4}>{[0, 1, 2].map(index => <SafeGltfModel key={index} url={BUILDING.borderRound} position={[0, 10.5 + index * 1.1, 0]} rotation={[index * 0.25, index * 0.55, 0]} scale={[7 - index, 0.8, 7 - index]} tint={index % 2 ? '#67e8f9' : '#fde047'} emissive="#f59e0b" emissiveIntensity={1.8} />)}</GrowthLayer>
      {villageTier >= 5 && <Sparkles count={100} scale={[28, 28, 28]} color="#ffffff" size={3.3} speed={0.36} />}
      <pointLight position={[0, 12, 0]} color="#f59e0b" intensity={4.5 * glow} distance={80 + villageTier * 20} />
    </group>
  );
}

function StationStructure({ id, tier, villageTier, xp }: { id: number; tier: StationTier; villageTier: VillageTier; xp: number }) {
  if (id === 1) return <JournalStation tier={tier} />;
  if (id === 2) return <QuranStation tier={tier} />;
  if (id === 3) return <HadisStation tier={tier} />;
  if (id === 4) return <MatrixStation tier={tier} />;
  if (id === 5) return <HatalarStation tier={tier} />;
  if (id === 6) return <SukurStation tier={tier} />;
  if (id === 7) return <MosqueStation tier={tier} />;
  return <AhiretStation tier={tier} villageTier={villageTier} xp={xp} />;
}

export default function VillageBuildings({ activeBuildingId, xp, villageTier, stationTiers }: VillageBuildingsProps) {
  return (
    <group>
      {VILLAGE_LOCATIONS.map(location => {
        if (location.id === 0) return null;
        const y = getTerrainHeight(location.x, location.z) + (location.yOffset ?? 0);
        const isActive = activeBuildingId === location.id;
        return (
          <group key={location.id} position={[location.x, y, location.z]}>
            {isActive && <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[6.8, 7.5, 32]} /><meshStandardMaterial color={location.color} emissive={location.color} emissiveIntensity={3.5} transparent opacity={0.85} /></mesh>}
            <StationStructure id={location.id} tier={stationTiers[location.id]} villageTier={villageTier} xp={xp} />
          </group>
        );
      })}
    </group>
  );
}

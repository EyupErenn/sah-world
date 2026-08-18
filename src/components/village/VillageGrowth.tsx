'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { VillageTier } from '@/lib/growth';
import { getTerrainHeight } from '@/lib/villageData';
import { SafeGltfInstances, SafeGltfModel, preloadGltfAssets, type AssetTransform } from './ModelAsset';

const CROP_MODELS = [
  '/models/nature/crops_wheatStageA.glb',
  '/models/nature/crops_wheatStageB.glb',
  '/models/nature/crops_cornStageB.glb',
  '/models/nature/crops_cornStageD.glb',
];

preloadGltfAssets([...CROP_MODELS, '/models/nature/fence_simple.glb', '/models/nature/fence_gate.glb']);

function GrowthLayer({ active, children }: { active: boolean; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = active ? 1 : 0.001;
    const factor = 1 - Math.exp(-4.2 * delta);
    const next = THREE.MathUtils.lerp(groupRef.current.scale.x, target, factor);
    groupRef.current.scale.setScalar(next);
    groupRef.current.visible = next > 0.008;
  });

  return <group ref={groupRef} scale={active ? 1 : 0.001}>{children}</group>;
}

const NPC_PATHS: Array<Array<[number, number]>> = [
  [[-18, -4], [10, -8], [34, 6]],
  [[-42, 18], [-18, 8], [4, 4]],
  [[18, 26], [44, 18], [68, 28]],
  [[8, -38], [28, -58], [42, -82]],
  [[-70, 40], [-50, 24], [-24, 16]],
  [[12, 78], [22, 96], [24, 112]],
];

function AmbientNPC({ path, index }: { path: Array<[number, number]>; index: number }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef((index * 0.17) % 1);

  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return;
    progressRef.current = (progressRef.current + delta * (0.025 + index * 0.002)) % 2;
    const returning = progressRef.current > 1;
    const patrolProgress = returning ? 2 - progressRef.current : progressRef.current;
    const pathProgress = patrolProgress * (path.length - 1);
    const segment = Math.min(path.length - 2, Math.floor(pathProgress));
    const local = pathProgress - segment;
    const start = path[segment];
    const end = path[segment + 1];
    const x = THREE.MathUtils.lerp(start[0], end[0], local);
    const z = THREE.MathUtils.lerp(start[1], end[1], local);
    const stride = Math.sin(clock.elapsedTime * 7 + index) * 0.34;

    rootRef.current.position.set(x, getTerrainHeight(x, z) + 0.08 + Math.abs(Math.sin(clock.elapsedTime * 7 + index)) * 0.06, z);
    rootRef.current.rotation.y = Math.atan2(end[0] - start[0], end[1] - start[1]) + (returning ? Math.PI : 0);
    if (leftLegRef.current) leftLegRef.current.rotation.x = stride;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -stride;
  });

  const colors = ['#6366f1', '#0d9488', '#d97706', '#be123c', '#7c3aed', '#0369a1'];

  return (
    <group ref={rootRef}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.75, 4, 8]} />
        <meshStandardMaterial color={colors[index % colors.length]} roughness={0.76} />
      </mesh>
      <mesh position={[0, 2.12, 0]} castShadow>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshStandardMaterial color="#d8a47f" roughness={0.82} />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.13, 0.58, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.56, 3, 6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.13, 0.58, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.56, 3, 6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.48, 12]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}

function VillagePopulation({ tier }: { tier: VillageTier }) {
  const count = tier < 3 ? 0 : tier === 3 ? 3 : tier === 4 ? 5 : 6;
  return <group>{NPC_PATHS.slice(0, count).map((path, index) => <AmbientNPC key={index} path={path} index={index} />)}</group>;
}

function FarmFields({ tier }: { tier: VillageTier }) {
  const cropCount = tier < 3 ? 0 : tier === 3 ? 56 : tier === 4 ? 96 : 144;
  const cropGroups = useMemo(() => {
    const groups = CROP_MODELS.map(url => ({ url, transforms: [] as AssetTransform[] }));
    if (cropCount === 0) return groups;
    const columns = tier === 3 ? 8 : tier === 4 ? 12 : 16;
    for (let index = 0; index < cropCount; index += 1) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = 48 + column * 1.25;
      const z = 94 + row * 1.65;
      groups[index % groups.length].transforms.push({ position: [x, getTerrainHeight(x, z), z], rotation: [0, (index % 3) * 0.35, 0], scale: 0.9 + (index % 4) * 0.08 });
    }
    return groups;
  }, [cropCount, tier]);

  if (tier < 3) return null;

  return (
    <group>
      <mesh position={[58, getTerrainHeight(58, 101) + 0.03, 101]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[tier === 3 ? 24 : tier === 4 ? 34 : 44, tier === 3 ? 15 : 22]} />
        <meshStandardMaterial color="#713f12" roughness={0.96} />
      </mesh>
      {cropGroups.map(group => <SafeGltfInstances key={group.url} url={group.url} transforms={group.transforms} />)}
      <SafeGltfModel url="/models/nature/fence_gate.glb" position={[45, getTerrainHeight(45, 101), 101]} rotation={[0, Math.PI / 2, 0]} scale={1.7} />
      <SafeGltfInstances url="/models/nature/fence_simple.glb" transforms={Array.from({ length: tier === 3 ? 5 : 8 }, (_, index) => ({ position: [49 + index * 3.4, getTerrainHeight(49 + index * 3.4, 89), 89], rotation: [0, 0, 0], scale: 1.7 } as AssetTransform))} />

      <GrowthLayer active={tier >= 4}>
        <group position={[79, getTerrainHeight(79, 104), 104]}>
          <SafeGltfModel url="/models/buildings/floor.glb" position={[0, 0, 0]} scale={[2.8, 1, 2.4]} tint="#92400e" />
          <SafeGltfModel url="/models/buildings/wall-doorway-wide-round.glb" position={[0, 1.6, 2.4]} rotation={[0, Math.PI, 0]} scale={[2.8, 1.3, 1]} tint="#92400e" />
          <SafeGltfModel url="/models/buildings/wall.glb" position={[0, 1.6, -2.4]} scale={[2.8, 1.3, 1]} tint="#92400e" />
          <SafeGltfModel url="/models/buildings/roof-flat-square.glb" position={[0, 3.7, 0]} scale={[3.1, 1.2, 2.7]} tint="#7f1d1d" />
        </group>
      </GrowthLayer>
    </group>
  );
}

function SharedLandmarks({ tier }: { tier: VillageTier }) {
  return (
    <group>
      <GrowthLayer active={tier >= 2}>
        {[-1.1, -0.35, 0.35, 1.1].map((angle, index) => (
          <group key={index} position={[Math.sin(angle) * 20, getTerrainHeight(Math.sin(angle) * 20, Math.cos(angle) * 20), Math.cos(angle) * 20]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.48, 0]} castShadow>
              <boxGeometry args={[2.2, 0.16, 0.62]} />
              <meshStandardMaterial color="#78350f" roughness={0.84} />
            </mesh>
            {[-0.82, 0.82].map(x => <mesh key={x} position={[x, 0.22, 0]} castShadow><boxGeometry args={[0.14, 0.5, 0.48]} /><meshStandardMaterial color="#451a03" /></mesh>)}
          </group>
        ))}
      </GrowthLayer>

      <GrowthLayer active={tier >= 3}>
        <group position={[-28, getTerrainHeight(-28, 30), 30]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.4, 2.8, 1, 12]} />
            <meshStandardMaterial color="#64748b" roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <cylinderGeometry args={[1.75, 1.75, 0.16, 16]} />
            <meshStandardMaterial color="#0284c7" emissive="#075985" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 3.1, 0]} castShadow>
            <torusGeometry args={[1.45, 0.14, 8, 20, Math.PI]} />
            <meshStandardMaterial color="#334155" metalness={0.72} />
          </mesh>
        </group>
        <group position={[-18, getTerrainHeight(-18, 32), 32]}>
          {[[-3, 0], [3, 0], [0, 3.2]].map(([x, z], index) => (
            <group key={index} position={[x, 0, z]}>
              <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[3.2, 2.2, 2.4]} /><meshStandardMaterial color={index === 2 ? '#b45309' : '#7c2d12'} roughness={0.82} /></mesh>
              <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[2.35, 1.25, 4]} /><meshStandardMaterial color="#451a03" /></mesh>
            </group>
          ))}
        </group>
      </GrowthLayer>

      <GrowthLayer active={tier >= 4}>
        <group position={[-116, getTerrainHeight(-116, 106), 106]}>
          {[[-8, 0], [0, 4], [8, -2], [2, -8]].map(([x, z], index) => (
            <group key={index} position={[x, 0, z]} scale={0.78 + index * 0.06}>
              <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[4.3, 2.3, 3.8]} /><meshStandardMaterial color={index % 2 ? '#9a3412' : '#78350f'} roughness={0.84} /></mesh>
              <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[3.25, 1.55, 4]} /><meshStandardMaterial color="#431407" /></mesh>
              <mesh position={[0, 1.2, 1.93]}><planeGeometry args={[0.8, 1.1]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
            </group>
          ))}
        </group>
      </GrowthLayer>
    </group>
  );
}

export default function VillageGrowth({ villageTier }: { villageTier: VillageTier }) {
  return (
    <group>
      <SharedLandmarks tier={villageTier} />
      <FarmFields tier={villageTier} />
      <VillagePopulation tier={villageTier} />
      {villageTier >= 5 && <Sparkles count={130} scale={[290, 42, 290]} position={[0, 16, 0]} color="#fde68a" size={1.4} speed={0.16} opacity={0.42} />}
    </group>
  );
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  VILLAGE_LOCATIONS,
  WORLD_BOUNDS,
  WORLD_SIZE,
  getRoadDistance,
  getActiveRoadPaths,
  getStreamCenterZ,
  getTerrainHeight,
  isRoadSurface,
} from '@/lib/villageData';
import { WORLD_COLORS } from '@/lib/designTokens';
import type { VillageTier } from '@/lib/growth';
import { SafeGltfInstances, SafeGltfModel, preloadGltfAssets, type AssetTransform } from './ModelAsset';

interface SceneryPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}
const TREE_MODELS = [
  '/models/nature/tree_cone_dark.glb',
  '/models/nature/tree_default.glb',
  '/models/nature/tree_detailed.glb',
  '/models/nature/tree_oak.glb',
  '/models/nature/tree_pineTallA_detailed.glb',
  '/models/nature/tree_pineRoundC.glb',
  '/models/nature/tree_plateau.glb',
  '/models/nature/tree_thin_dark.glb',
];
const FLOWERING_TREE_MODELS = ['/models/nature/tree_small_fall.glb', '/models/nature/tree_blocks_fall.glb'];
const ROCK_MODELS = ['/models/nature/rock_largeA.glb', '/models/nature/rock_largeC.glb', '/models/nature/rock_tallD.glb'];
const BUSH_MODELS = ['/models/nature/plant_bush.glb', '/models/nature/plant_bushDetailed.glb', '/models/nature/plant_bushLarge.glb'];

preloadGltfAssets([...TREE_MODELS, ...FLOWERING_TREE_MODELS, ...ROCK_MODELS, ...BUSH_MODELS, '/models/nature/bridge_stone.glb']);

function seeded(seed: number) {
  const value = Math.sin(seed * 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function createVillageTerrainGeometry(villageTier: VillageTier) {
  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 112, 112);
  const positions = geometry.attributes.position;
  const colors: number[] = [];
  const grassLow = new THREE.Color(WORLD_COLORS.grassLow);
  const grassHigh = new THREE.Color(WORLD_COLORS.grassHigh);
  const road = new THREE.Color(WORLD_COLORS.road);
  const plaza = new THREE.Color(WORLD_COLORS.plaza);
  const rock = new THREE.Color(WORLD_COLORS.rock);
  const soil = new THREE.Color(WORLD_COLORS.soil);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = -positions.getY(index);
    const height = getTerrainHeight(x, z);
    const slope = Math.abs(getTerrainHeight(x + 1.5, z) - height) + Math.abs(getTerrainHeight(x, z + 1.5) - height);
    const roadDistance = getRoadDistance(x, z, villageTier);
    const color = new THREE.Color();
    positions.setZ(index, height);

    if (Math.hypot(x, z) < 17) color.copy(plaza);
    else if (isRoadSurface(x, z, villageTier)) {
      if (villageTier === 1) color.copy(soil).multiplyScalar(0.82);
      else color.copy(road).lerp(soil, villageTier === 2 ? 0.22 : 0);
    } else if (slope > 1.15 || height > 8) color.copy(rock).lerp(soil, 0.28);
    else if (roadDistance < 10 || Math.abs(z - getStreamCenterZ(x)) < 9) color.copy(soil).lerp(grassLow, 0.25);
    else {
      const heightMix = THREE.MathUtils.clamp((height + 3) / 11, 0, 1);
      const variation = seeded(index + Math.round(x * 3 + z * 5)) * 0.13;
      color.copy(grassLow).lerp(grassHigh, THREE.MathUtils.clamp(heightMix * 0.62 + variation, 0, 1));
    }
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createRiverGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const samples = 80;
  const riverWidth = 6.4;
  for (let index = 0; index <= samples; index += 1) {
    const x = -WORLD_BOUNDS - 6 + (index / samples) * (WORLD_BOUNDS * 2 + 12);
    const z = getStreamCenterZ(x);
    const nextZ = getStreamCenterZ(x + 1);
    const tangent = new THREE.Vector2(1, nextZ - z).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    const waterY = getTerrainHeight(x, z) + 0.22;
    positions.push(x + normal.x * riverWidth, waterY, z + normal.y * riverWidth, x - normal.x * riverWidth, waterY, z - normal.y * riverWidth);
    uvs.push(index / samples, 0, index / samples, 1);
    if (index < samples) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function VillageRiver() {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const riverGeometry = useMemo(() => createRiverGeometry(), []);
  const bridgeZ = getStreamCenterZ(13);
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.emissiveIntensity = 0.2 + Math.sin(clock.elapsedTime * 1.15) * 0.06;
    materialRef.current.opacity = 0.86 + Math.sin(clock.elapsedTime * 0.8) * 0.035;
  });
  return (
    <group>
      <mesh geometry={riverGeometry} receiveShadow renderOrder={2}>
        <meshPhysicalMaterial ref={materialRef} color="#38bdf8" emissive="#075985" emissiveIntensity={0.2} roughness={0.12} metalness={0.2} transmission={0.38} thickness={0.5} transparent opacity={0.88} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <SafeGltfModel url="/models/nature/bridge_stone.glb" position={[13, getTerrainHeight(13, bridgeZ) + 0.24, bridgeZ]} rotation={[0, -0.12, 0]} scale={[3.1, 1.5, 4.1]} fallbackColor="#64748b" />
    </group>
  );
}

function addToGroup(groups: Record<string, AssetTransform[]>, url: string, point: SceneryPoint, modelScale: number) {
  (groups[url] ??= []).push({ position: [point.x, point.y, point.z], rotation: [0, point.rotation, 0], scale: point.scale * modelScale });
}

function ModelVillageScenery({ villageTier }: { villageTier: VillageTier }) {
  const lanternPostRef = useRef<THREE.InstancedMesh>(null);
  const lanternBulbRef = useRef<THREE.InstancedMesh>(null);
  const scenery = useMemo(() => {
    const groups: Record<string, AssetTransform[]> = {};
    const lanterns: SceneryPoint[] = [];
    for (let gx = -142; gx <= 142; gx += 10) {
      for (let gz = -142; gz <= 142; gz += 10) {
        const seed = (gx + 171) * 401 + (gz + 173) * 97;
        const x = gx + (seeded(seed) - 0.5) * 8;
        const z = gz + (seeded(seed + 1) - 0.5) * 8;
        const nearStation = VILLAGE_LOCATIONS.some(location => Math.hypot(x - location.x, z - location.z) < (location.id === 8 ? 24 : 17));
        const nearRiver = Math.abs(z - getStreamCenterZ(x)) < 12;
        if (isRoadSurface(x, z, villageTier) || nearStation || nearRiver || Math.hypot(x, z) < 25 || seeded(seed + 2) < (villageTier === 1 ? 0.42 : 0.28)) continue;
        const point: SceneryPoint = { x, y: getTerrainHeight(x, z), z, scale: 0.72 + seeded(seed + 3) * 0.72, rotation: seeded(seed + 4) * Math.PI * 2 };
        addToGroup(groups, TREE_MODELS[Math.floor(seeded(seed + 5) * TREE_MODELS.length)], point, 1.32);
        if (seeded(seed + 6) > 0.68) {
          const detail: SceneryPoint = { x: x + (seeded(seed + 7) - 0.5) * 7, z: z + (seeded(seed + 8) - 0.5) * 7, y: 0, scale: 0.55 + seeded(seed + 9) * 0.7, rotation: seeded(seed + 10) * Math.PI };
          detail.y = getTerrainHeight(detail.x, detail.z);
          const isRock = seeded(seed + 11) > 0.48;
          const collection = isRock ? ROCK_MODELS : BUSH_MODELS;
          addToGroup(groups, collection[Math.floor(seeded(seed + 12) * collection.length)], detail, isRock ? 1.3 : 1.05);
        }
      }
    }
    const floweringTreeCount = villageTier === 1 ? 0 : villageTier === 2 ? 8 : 26;
    for (let index = 0; index < floweringTreeCount; index += 1) {
      const angle = (index / 26) * Math.PI * 2 + seeded(index + 900) * 0.4;
      const radius = 13 + (index % 4) * 4.2;
      const x = 24 + Math.cos(angle) * radius;
      const z = 116 + Math.sin(angle) * radius;
      addToGroup(groups, FLOWERING_TREE_MODELS[index % FLOWERING_TREE_MODELS.length], { x, y: getTerrainHeight(x, z), z, scale: 0.76 + seeded(index + 940) * 0.44, rotation: angle }, 1.28);
    }
    const lanternSpacing = villageTier === 2 ? 44 : villageTier === 3 ? 30 : 20;
    for (const path of villageTier === 1 ? [] : getActiveRoadPaths(villageTier)) {
      for (let segment = 0; segment < path.points.length - 1; segment += 1) {
        const start = path.points[segment];
        const end = path.points[segment + 1];
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const length = Math.hypot(dx, dz);
        const nx = -dz / length;
        const nz = dx / length;
        for (let distance = 16; distance < length; distance += lanternSpacing) {
          const t = distance / length;
          const side = (segment + Math.round(distance / 13)) % 2 === 0 ? 1 : -1;
          const x = start[0] + dx * t + nx * (path.width + 2.2) * side;
          const z = start[1] + dz * t + nz * (path.width + 2.2) * side;
          lanterns.push({ x, y: getTerrainHeight(x, z), z, scale: 1, rotation: 0 });
        }
      }
    }
    return { groups, lanterns };
  }, [villageTier]);

  useEffect(() => {
    if (!lanternPostRef.current || !lanternBulbRef.current) return;
    const dummy = new THREE.Object3D();
    scenery.lanterns.forEach((point, index) => {
      dummy.position.set(point.x, point.y + 1.45, point.z);
      dummy.updateMatrix();
      lanternPostRef.current!.setMatrixAt(index, dummy.matrix);
      dummy.position.y = point.y + 2.82;
      dummy.updateMatrix();
      lanternBulbRef.current!.setMatrixAt(index, dummy.matrix);
    });
    lanternPostRef.current.instanceMatrix.needsUpdate = true;
    lanternBulbRef.current.instanceMatrix.needsUpdate = true;
  }, [scenery.lanterns]);

  const lanternCount = Math.max(1, scenery.lanterns.length);
  return (
    <group>
      {Object.entries(scenery.groups).map(([url, transforms]) => <SafeGltfInstances key={url} url={url} transforms={transforms} />)}
      <instancedMesh ref={lanternPostRef} args={[undefined, undefined, lanternCount]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 2.9, 7]} />
        <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lanternBulbRef} args={[undefined, undefined, lanternCount]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={WORLD_COLORS.lantern} emissive="#f59e0b" emissiveIntensity={3.3} />
      </instancedMesh>
    </group>
  );
}

export default function VillageTerrain({ villageTier }: { villageTier: VillageTier }) {
  const terrainGeometry = useMemo(() => createVillageTerrainGeometry(villageTier), [villageTier]);
  return (
    <group>
      <mesh geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial vertexColors roughness={0.86} metalness={0.04} /></mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><ringGeometry args={[8, 17, 48]} /><meshStandardMaterial color={villageTier === 1 ? WORLD_COLORS.soil : WORLD_COLORS.plaza} roughness={0.68} metalness={villageTier === 1 ? 0 : 0.12} /></mesh>
      {villageTier >= 2 && <group><mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[7.35, 7.8, 48]} /><meshStandardMaterial color="#6366f1" emissive="#4f46e5" emissiveIntensity={1.2 + villageTier * 0.12} /></mesh><mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[2.4, 2.8, 0.35, 12]} /><meshStandardMaterial color="#334155" roughness={0.7} /></mesh><mesh position={[0, 1.45, 0]} castShadow><octahedronGeometry args={[1.15, 0]} /><meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={1.6 + villageTier * 0.2} metalness={0.6} roughness={0.2} /></mesh></group>}
      <VillageRiver />
      <ModelVillageScenery villageTier={villageTier} />
    </group>
  );
}

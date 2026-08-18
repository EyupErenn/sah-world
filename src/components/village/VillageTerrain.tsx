'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  VILLAGE_LOCATIONS,
  ROAD_PATHS,
  WORLD_BOUNDS,
  WORLD_SIZE,
  getRoadDistance,
  getStreamCenterZ,
  getTerrainHeight,
  isRoadSurface,
} from '@/lib/villageData';
import { WORLD_COLORS } from '@/lib/designTokens';

type TreeKind = 'pine' | 'deciduous' | 'cypress' | 'flowering';

interface SceneryPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

function seeded(seed: number) {
  const value = Math.sin(seed * 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function createVillageTerrainGeometry() {
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
    const roadDistance = getRoadDistance(x, z);
    const color = new THREE.Color();
    positions.setZ(index, height);

    if (Math.hypot(x, z) < 17) color.copy(plaza);
    else if (isRoadSurface(x, z)) color.copy(road);
    else if (slope > 1.15 || height > 8) color.copy(rock).lerp(soil, 0.28);
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
    positions.push(x + normal.x * riverWidth, waterY, z + normal.y * riverWidth);
    positions.push(x - normal.x * riverWidth, waterY, z - normal.y * riverWidth);
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
      <group position={[13, getTerrainHeight(13, getStreamCenterZ(13)) + 0.34, getStreamCenterZ(13)]} rotation={[0, -0.12, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[10, 0.55, 17]} />
          <meshStandardMaterial color="#64748b" roughness={0.88} />
        </mesh>
        {[-4.5, 4.5].map(x => (
          <mesh key={x} position={[x, 0.65, 0]} castShadow>
            <boxGeometry args={[0.38, 0.9, 17]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function InstancedVillageScenery() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const pineRef = useRef<THREE.InstancedMesh>(null);
  const deciduousRef = useRef<THREE.InstancedMesh>(null);
  const cypressRef = useRef<THREE.InstancedMesh>(null);
  const floweringRef = useRef<THREE.InstancedMesh>(null);
  const treeShadowRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const detailShadowRef = useRef<THREE.InstancedMesh>(null);
  const lanternPostRef = useRef<THREE.InstancedMesh>(null);
  const lanternBulbRef = useRef<THREE.InstancedMesh>(null);

  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.24, 0.38, 2.2, 7), []);
  const pineGeometry = useMemo(() => new THREE.ConeGeometry(1.35, 3.2, 7), []);
  const deciduousGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.35, 1), []);
  const cypressGeometry = useMemo(() => new THREE.ConeGeometry(0.78, 4.4, 8), []);
  const floweringGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.2, 1), []);
  const treeShadowGeometry = useMemo(() => new THREE.CircleGeometry(1.55, 14), []);
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.72, 0), []);
  const bushGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.78, 1), []);
  const detailShadowGeometry = useMemo(() => new THREE.CircleGeometry(0.9, 12), []);
  const lanternGeometry = useMemo(() => new THREE.CylinderGeometry(0.09, 0.13, 2.9, 7), []);
  const bulbGeometry = useMemo(() => new THREE.SphereGeometry(0.2, 8, 8), []);

  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: WORLD_COLORS.trunk, roughness: 0.92 }), []);
  const pineMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#075c4a', roughness: 0.72 }), []);
  const deciduousMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.78 }), []);
  const cypressMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.7 }), []);
  const floweringMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f9a8d4', emissive: '#be185d', emissiveIntensity: 0.18, roughness: 0.68 }), []);
  const shadowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: WORLD_COLORS.shadow, transparent: true, opacity: 0.28, depthWrite: false }), []);
  const rockMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: WORLD_COLORS.rock, roughness: 0.96 }), []);
  const bushMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: WORLD_COLORS.foliageLight, roughness: 0.82 }), []);
  const lanternMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.82, roughness: 0.3 }), []);
  const bulbMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: WORLD_COLORS.lantern, emissive: '#f59e0b', emissiveIntensity: 3.3 }), []);

  const scenery = useMemo(() => {
    const trees: Record<TreeKind, SceneryPoint[]> = { pine: [], deciduous: [], cypress: [], flowering: [] };
    const allTrees: SceneryPoint[] = [];
    const rocks: SceneryPoint[] = [];
    const bushes: SceneryPoint[] = [];
    const lanterns: SceneryPoint[] = [];

    for (let gx = -142; gx <= 142; gx += 10) {
      for (let gz = -142; gz <= 142; gz += 10) {
        const seed = (gx + 171) * 401 + (gz + 173) * 97;
        const x = gx + (seeded(seed) - 0.5) * 8;
        const z = gz + (seeded(seed + 1) - 0.5) * 8;
        const nearStation = VILLAGE_LOCATIONS.some(location => Math.hypot(x - location.x, z - location.z) < (location.id === 8 ? 24 : 17));
        const nearRiver = Math.abs(z - getStreamCenterZ(x)) < 12;
        if (isRoadSurface(x, z) || nearStation || nearRiver || Math.hypot(x, z) < 25 || seeded(seed + 2) < 0.28) continue;

        const point = { x, y: getTerrainHeight(x, z), z, scale: 0.75 + seeded(seed + 3) * 0.8, rotation: seeded(seed + 4) * Math.PI * 2 };
        const climate = seeded(seed + 5);
        const kind: TreeKind = climate < 0.38 ? 'pine' : climate < 0.7 ? 'deciduous' : 'cypress';
        trees[kind].push(point);
        allTrees.push(point);

        if (seeded(seed + 6) > 0.68) {
          const detail = { x: x + (seeded(seed + 7) - 0.5) * 7, z: z + (seeded(seed + 8) - 0.5) * 7, y: 0, scale: 0.55 + seeded(seed + 9) * 0.75, rotation: seeded(seed + 10) * Math.PI };
          detail.y = getTerrainHeight(detail.x, detail.z);
          (seeded(seed + 11) > 0.48 ? rocks : bushes).push(detail);
        }
      }
    }

    for (let index = 0; index < 26; index += 1) {
      const angle = (index / 26) * Math.PI * 2 + seeded(index + 900) * 0.4;
      const radius = 13 + (index % 4) * 4.2;
      const x = 24 + Math.cos(angle) * radius;
      const z = 116 + Math.sin(angle) * radius;
      const point = { x, y: getTerrainHeight(x, z), z, scale: 0.75 + seeded(index + 940) * 0.48, rotation: angle };
      trees.flowering.push(point);
      allTrees.push(point);
    }

    for (const path of ROAD_PATHS) {
      for (let segment = 0; segment < path.points.length - 1; segment += 1) {
        const start = path.points[segment];
        const end = path.points[segment + 1];
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const length = Math.hypot(dx, dz);
        const nx = -dz / length;
        const nz = dx / length;
        for (let distance = 16; distance < length; distance += 26) {
          const t = distance / length;
          const side = (segment + Math.round(distance / 13)) % 2 === 0 ? 1 : -1;
          const x = start[0] + dx * t + nx * (path.width + 2.2) * side;
          const z = start[1] + dz * t + nz * (path.width + 2.2) * side;
          lanterns.push({ x, y: getTerrainHeight(x, z), z, scale: 1, rotation: 0 });
        }
      }
    }
    return { trees, allTrees, rocks, bushes, lanterns };
  }, []);

  useEffect(() => {
    const refs = [trunkRef, pineRef, deciduousRef, cypressRef, floweringRef, treeShadowRef, rockRef, bushRef, detailShadowRef, lanternPostRef, lanternBulbRef];
    if (refs.some(ref => !ref.current)) return;
    const dummy = new THREE.Object3D();
    const setPoint = (mesh: THREE.InstancedMesh, point: SceneryPoint, index: number, yOffset: number, scale: THREE.Vector3) => {
      dummy.position.set(point.x, point.y + yOffset * point.scale, point.z);
      dummy.rotation.set(0, point.rotation, 0);
      dummy.scale.copy(scale).multiplyScalar(point.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    };

    scenery.allTrees.forEach((tree, index) => {
      setPoint(trunkRef.current!, tree, index, 1.1, new THREE.Vector3(1, 1, 1));
      dummy.position.set(tree.x, tree.y + 0.025, tree.z);
      dummy.rotation.set(-Math.PI / 2, tree.rotation, 0);
      dummy.scale.set(tree.scale * 1.25, tree.scale, 1);
      dummy.updateMatrix();
      treeShadowRef.current!.setMatrixAt(index, dummy.matrix);
    });
    scenery.trees.pine.forEach((tree, index) => setPoint(pineRef.current!, tree, index, 3.25, new THREE.Vector3(1.25, 1.35, 1.25)));
    scenery.trees.deciduous.forEach((tree, index) => setPoint(deciduousRef.current!, tree, index, 3, new THREE.Vector3(1.35, 1.05, 1.35)));
    scenery.trees.cypress.forEach((tree, index) => setPoint(cypressRef.current!, tree, index, 3.45, new THREE.Vector3(0.9, 1.25, 0.9)));
    scenery.trees.flowering.forEach((tree, index) => setPoint(floweringRef.current!, tree, index, 2.9, new THREE.Vector3(1.45, 1.05, 1.45)));

    const details = [...scenery.rocks, ...scenery.bushes];
    scenery.rocks.forEach((point, index) => setPoint(rockRef.current!, point, index, 0.5, new THREE.Vector3(1, 0.72, 1)));
    scenery.bushes.forEach((point, index) => setPoint(bushRef.current!, point, index, 0.6, new THREE.Vector3(1.3, 0.85, 1.1)));
    details.forEach((point, index) => {
      dummy.position.set(point.x, point.y + 0.02, point.z);
      dummy.rotation.set(-Math.PI / 2, point.rotation, 0);
      dummy.scale.set(point.scale, point.scale * 0.75, 1);
      dummy.updateMatrix();
      detailShadowRef.current!.setMatrixAt(index, dummy.matrix);
    });
    scenery.lanterns.forEach((point, index) => {
      setPoint(lanternPostRef.current!, point, index, 1.45, new THREE.Vector3(1, 1, 1));
      setPoint(lanternBulbRef.current!, point, index, 2.82, new THREE.Vector3(1, 1, 1));
    });
    refs.forEach(ref => { if (ref.current) ref.current.instanceMatrix.needsUpdate = true; });
  }, [scenery]);

  const count = (items: SceneryPoint[]) => Math.max(1, items.length);
  const allDetails = [...scenery.rocks, ...scenery.bushes];

  return (
    <group>
      <instancedMesh ref={treeShadowRef} args={[treeShadowGeometry, shadowMaterial, count(scenery.allTrees)]} />
      <instancedMesh ref={trunkRef} args={[trunkGeometry, trunkMaterial, count(scenery.allTrees)]} castShadow />
      <instancedMesh ref={pineRef} args={[pineGeometry, pineMaterial, count(scenery.trees.pine)]} castShadow />
      <instancedMesh ref={deciduousRef} args={[deciduousGeometry, deciduousMaterial, count(scenery.trees.deciduous)]} castShadow />
      <instancedMesh ref={cypressRef} args={[cypressGeometry, cypressMaterial, count(scenery.trees.cypress)]} castShadow />
      <instancedMesh ref={floweringRef} args={[floweringGeometry, floweringMaterial, count(scenery.trees.flowering)]} castShadow />
      <instancedMesh ref={detailShadowRef} args={[detailShadowGeometry, shadowMaterial, count(allDetails)]} />
      <instancedMesh ref={rockRef} args={[rockGeometry, rockMaterial, count(scenery.rocks)]} castShadow receiveShadow />
      <instancedMesh ref={bushRef} args={[bushGeometry, bushMaterial, count(scenery.bushes)]} castShadow />
      <instancedMesh ref={lanternPostRef} args={[lanternGeometry, lanternMaterial, count(scenery.lanterns)]} castShadow />
      <instancedMesh ref={lanternBulbRef} args={[bulbGeometry, bulbMaterial, count(scenery.lanterns)]} />
    </group>
  );
}

export default function VillageTerrain() {
  const terrainGeometry = useMemo(() => createVillageTerrainGeometry(), []);
  return (
    <group>
      <mesh geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.86} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[8, 17, 48]} />
        <meshStandardMaterial color={WORLD_COLORS.plaza} roughness={0.68} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.35, 7.8, 48]} />
        <meshStandardMaterial color="#6366f1" emissive="#4f46e5" emissiveIntensity={1.55} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[2.4, 2.8, 0.35, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <octahedronGeometry args={[1.15, 0]} />
        <meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={2.2} metalness={0.6} roughness={0.2} />
      </mesh>
      <VillageRiver />
      <InstancedVillageScenery />
    </group>
  );
}

'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VILLAGE_LOCATIONS, getTerrainHeight, isRoadSurface } from '@/lib/villageData';

// ============================================================
// Procedural Village Terrain with Vertex Colors, Lake & Roads
// ============================================================

function createVillageTerrainGeometry() {
  const size = 160;
  const segments = 56;

  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const posAttr = geo.attributes.position;
  const colors: number[] = [];

  const grassColor = new THREE.Color('#064e3b');
  const grassHighlight = new THREE.Color('#047857');
  const pathColor = new THREE.Color('#1e293b');
  const plazaColor = new THREE.Color('#334155');
  const hillSummitColor = new THREE.Color('#1e1b4b');
  const sandColor = new THREE.Color('#451a03');

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = -posAttr.getY(i);

    const h = getTerrainHeight(x, z);
    posAttr.setZ(i, h);

    const distFromCenter = Math.hypot(x, z);
    const onRoad = isRoadSurface(x, z);
    const tempColor = new THREE.Color();

    if (distFromCenter < 14) {
      tempColor.copy(plazaColor);
    } else if (onRoad) {
      tempColor.copy(pathColor);
    } else if (h < -0.2) {
      tempColor.copy(sandColor);
    } else if (h > 3.0) {
      tempColor.copy(hillSummitColor);
    } else {
      const t = Math.min(1.0, Math.max(0, h / 2.0));
      tempColor.copy(grassColor).lerp(grassHighlight, t);
    }

    colors.push(tempColor.r, tempColor.g, tempColor.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// ── Water Lake ──
function VillageLake() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.15 + Math.sin(clock.getElapsedTime() * 1.2) * 0.03;
    }
  });

  return (
    <group position={[-14, 0, 12]}>
      {/* Lake Bed Soft Rim */}
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11.6, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Lake Water Surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11.2, 32]} />
        <meshPhysicalMaterial
          color="#0284c7"
          roughness={0.08}
          metalness={0.25}
          transmission={0.7}
          thickness={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

// ── Instanced Trees, Shadows & Road Lanterns ──
function InstancedVillageScenery() {
  const treeTrunkRef = useRef<THREE.InstancedMesh>(null);
  const treeLeavesRef = useRef<THREE.InstancedMesh>(null);
  const treeShadowRef = useRef<THREE.InstancedMesh>(null);
  const lanternPostRef = useRef<THREE.InstancedMesh>(null);
  const lanternBulbRef = useRef<THREE.InstancedMesh>(null);

  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.35, 2.0, 6), []);
  const leavesGeo = useMemo(() => new THREE.ConeGeometry(1.2, 2.4, 6), []);
  const shadowGeo = useMemo(() => new THREE.CircleGeometry(1.4, 16), []);
  const lanternGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.12, 2.6, 6), []);
  const bulbGeo = useMemo(() => new THREE.SphereGeometry(0.18, 8, 8), []);

  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 }), []);
  const leavesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.6 }), []);
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#020617', transparent: true, opacity: 0.45, depthWrite: false }), []);
  const lanternMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85 }), []);
  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 3.5 }), []);

  const sceneryData = useMemo(() => {
    const trees: Array<{ x: number; y: number; z: number; scale: number }> = [];
    const lanterns: Array<{ x: number; y: number; z: number }> = [];

    // 1. Lanterns along road connections
    for (const loc of VILLAGE_LOCATIONS) {
      if (loc.id === 0) continue;
      for (const t of [0.35, 0.7]) {
        const lx = loc.x * t + 1.8;
        const lz = loc.z * t + 1.8;
        const ly = getTerrainHeight(lx, lz);
        lanterns.push({ x: lx, y: ly, z: lz });
      }
    }

    // 2. Trees scattered around the meadows and borders
    for (let gx = -70; gx <= 70; gx += 12) {
      for (let gz = -70; gz <= 70; gz += 12) {
        const jitterX = ((gx * 37 + gz * 19) % 7) - 3.5;
        const jitterZ = ((gx * 23 + gz * 43) % 7) - 3.5;
        const x = gx + jitterX;
        const z = gz + jitterZ;

        if (isRoadSurface(x, z) || Math.hypot(x, z) < 18 || Math.hypot(x + 14, z - 12) < 14) {
          continue;
        }

        const y = getTerrainHeight(x, z);
        const scale = 0.85 + Math.abs((gx * 13 + gz * 7) % 5) * 0.18;
        trees.push({ x, y, z, scale });
      }
    }

    return { trees, lanterns };
  }, []);

  useEffect(() => {
    if (!treeTrunkRef.current || !treeLeavesRef.current || !treeShadowRef.current || !lanternPostRef.current || !lanternBulbRef.current) return;

    const dummy = new THREE.Object3D();

    // Setup Trees
    sceneryData.trees.forEach((t, i) => {
      // Tree Ground Shadow
      dummy.position.set(t.x, t.y + 0.02, t.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(t.scale, t.scale, 1);
      dummy.updateMatrix();
      treeShadowRef.current!.setMatrixAt(i, dummy.matrix);

      // Trunk
      dummy.position.set(t.x, t.y + 1.0 * t.scale, t.z);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.rotation.set(0, (i * 0.5) % Math.PI, 0);
      dummy.updateMatrix();
      treeTrunkRef.current!.setMatrixAt(i, dummy.matrix);

      // Leaves
      dummy.position.set(t.x, t.y + 2.8 * t.scale, t.z);
      dummy.scale.set(t.scale * 1.6, t.scale * 2.2, t.scale * 1.6);
      dummy.updateMatrix();
      treeLeavesRef.current!.setMatrixAt(i, dummy.matrix);
    });

    // Setup Lanterns
    sceneryData.lanterns.forEach((l, i) => {
      // Post
      dummy.position.set(l.x, l.y + 1.3, l.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lanternPostRef.current!.setMatrixAt(i, dummy.matrix);

      // Glowing Bulb
      dummy.position.set(l.x, l.y + 2.5, l.z);
      dummy.updateMatrix();
      lanternBulbRef.current!.setMatrixAt(i, dummy.matrix);
    });

    treeShadowRef.current.instanceMatrix.needsUpdate = true;
    treeTrunkRef.current.instanceMatrix.needsUpdate = true;
    treeLeavesRef.current.instanceMatrix.needsUpdate = true;
    lanternPostRef.current.instanceMatrix.needsUpdate = true;
    lanternBulbRef.current.instanceMatrix.needsUpdate = true;
  }, [sceneryData]);

  return (
    <group>
      {/* Tree Ground Shadows */}
      <instancedMesh
        ref={treeShadowRef}
        args={[shadowGeo, shadowMat, Math.max(1, sceneryData.trees.length)]}
      />

      {/* Tree Trunks */}
      <instancedMesh
        ref={treeTrunkRef}
        args={[trunkGeo, trunkMat, Math.max(1, sceneryData.trees.length)]}
        castShadow
      />

      {/* Tree Foliage */}
      <instancedMesh
        ref={treeLeavesRef}
        args={[leavesGeo, leavesMat, Math.max(1, sceneryData.trees.length)]}
        castShadow
      />

      {/* Road Lantern Posts */}
      <instancedMesh
        ref={lanternPostRef}
        args={[lanternGeo, lanternMat, Math.max(1, sceneryData.lanterns.length)]}
        castShadow
      />

      {/* Road Lantern Glowing Bulbs */}
      <instancedMesh
        ref={lanternBulbRef}
        args={[bulbGeo, bulbMat, Math.max(1, sceneryData.lanterns.length)]}
      />
    </group>
  );
}

export default function VillageTerrain() {
  const terrainGeo = useMemo(() => createVillageTerrainGeometry(), []);

  return (
    <group>
      {/* Main Village Undulating Terrain */}
      <mesh
        geometry={terrainGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.06}
        />
      </mesh>

      {/* Central Plaza Compass Inlay */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.2, 13.8, 32]} />
        <meshStandardMaterial color="#6366f1" emissive="#818cf8" emissiveIntensity={2.0} />
      </mesh>

      {/* Village Water Lake */}
      <VillageLake />

      {/* Instanced Scenery with Shadows & Glowing Lanterns */}
      <InstancedVillageScenery />
    </group>
  );
}

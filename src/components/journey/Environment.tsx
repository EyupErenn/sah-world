'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CURVE_POINTS } from '@/lib/constants';

// ============================================================
// Ultra-Performant Instanced Environment & Procedural Terrain
// Uses InstancedMesh (2-3 draw calls instead of 500+)
// ============================================================

// Procedural Terrain with gentle rolling hills & rich vertex colors
function createUndulatingTerrain() {
  const width = 1200;
  const height = 900;
  const segmentsW = 48;
  const segmentsH = 48;

  const geo = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH);
  const posAttr = geo.attributes.position;
  const colors: number[] = [];

  // Color palette: deep slate emerald to misty indigo-violet
  const valleyColor = new THREE.Color('#0f172a');
  const grassMidColor = new THREE.Color('#064e3b');
  const grassHighlight = new THREE.Color('#047857');
  const ridgeColor = new THREE.Color('#1e1b4b');

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);

    // Height displacement via harmonic sine waves
    const distFromCenter = Math.abs(x);
    let elevation = 0;
    
    // Flatten near road center, roll up into gentle hills at margins
    if (distFromCenter > 25) {
      const hillFactor = Math.min(1.0, (distFromCenter - 25) / 100);
      elevation = (
        Math.sin(x * 0.015) * 8 +
        Math.cos(y * 0.012) * 9 +
        Math.sin((x + y) * 0.02) * 5
      ) * hillFactor;
    }

    posAttr.setZ(i, elevation);

    // Calculate vertex color based on elevation and position
    const normH = (elevation + 15) / 30;
    const tempColor = new THREE.Color();

    if (normH < 0.35) {
      tempColor.copy(valleyColor).lerp(grassMidColor, normH / 0.35);
    } else if (normH < 0.7) {
      tempColor.copy(grassMidColor).lerp(grassHighlight, (normH - 0.35) / 0.35);
    } else {
      tempColor.copy(grassHighlight).lerp(ridgeColor, (normH - 0.7) / 0.3);
    }

    colors.push(tempColor.r, tempColor.g, tempColor.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Low-poly drifting atmospheric cloud
function CloudGroup() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.08) * 6;
    }
  });

  const cloudClusters = [
    { pos: [-45, 42, 30] as [number, number, number], scale: 3.2 },
    { pos: [55, 48, 120] as [number, number, number], scale: 3.8 },
    { pos: [-60, 45, 210] as [number, number, number], scale: 3.5 },
    { pos: [50, 50, 310] as [number, number, number], scale: 4.0 },
    { pos: [-40, 52, 400] as [number, number, number], scale: 3.6 },
  ];

  return (
    <group ref={groupRef}>
      {cloudClusters.map((c, i) => (
        <group key={i} position={c.pos} scale={c.scale}>
          <mesh position={[0, 0, 0]}>
            <dodecahedronGeometry args={[3.0, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} transparent opacity={0.88} />
          </mesh>
          <mesh position={[2.2, -0.3, 0]}>
            <dodecahedronGeometry args={[2.2, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} transparent opacity={0.85} />
          </mesh>
          <mesh position={[-2.2, -0.2, 0]}>
            <dodecahedronGeometry args={[2.3, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Instanced High-Performance Forest
function InstancedForest() {
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const tier1MeshRef = useRef<THREE.InstancedMesh>(null);
  const tier2MeshRef = useRef<THREE.InstancedMesh>(null);
  const tier3MeshRef = useRef<THREE.InstancedMesh>(null);

  // Generate tree transforms along the route
  const treeData = useMemo(() => {
    const list: Array<{ x: number; y: number; z: number; scale: number; rotY: number; type: number }> = [];
    
    for (let i = 0; i < CURVE_POINTS.length - 1; i++) {
      const p1 = CURVE_POINTS[i];
      const p2 = CURVE_POINTS[i + 1];

      for (let step = 0; step < 8; step++) {
        const t = step / 8;
        const x = p1[0] + (p2[0] - p1[0]) * t;
        const y = p1[1] + (p2[1] - p1[1]) * t;
        const z = p1[2] + (p2[2] - p1[2]) * t;

        // Left side trees
        const offL = 6.2 + (step % 3) * 4.5 + ((i * 3 + step) % 4) * 2;
        list.push({
          x: x - offL,
          y: y - 0.05,
          z: z + (step % 2) * 3,
          scale: 0.85 + ((step * 7 + i) % 5) * 0.16,
          rotY: ((step * 45 + i * 30) * Math.PI) / 180,
          type: (step + i) % 3,
        });

        // Right side trees
        const offR = 6.2 + ((step + 1) % 3) * 4.5 + ((i * 5 + step) % 4) * 2;
        list.push({
          x: x + offR,
          y: y - 0.05,
          z: z - (step % 2) * 3,
          scale: 0.85 + ((step * 11 + i) % 5) * 0.16,
          rotY: ((step * 60 + i * 45) * Math.PI) / 180,
          type: (step + i + 1) % 3,
        });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    if (!trunkMeshRef.current || !tier1MeshRef.current || !tier2MeshRef.current || !tier3MeshRef.current) return;

    const dummy = new THREE.Object3D();
    const count = treeData.length;

    for (let i = 0; i < count; i++) {
      const { x, y, z, scale, rotY } = treeData[i];

      // 1. Trunk
      dummy.position.set(x, y + 0.9 * scale, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(i, dummy.matrix);

      // 2. Foliage Tier 1 (Base Cone)
      dummy.position.set(x, y + 2.2 * scale, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale * 1.5, scale * 1.8, scale * 1.5);
      dummy.updateMatrix();
      tier1MeshRef.current.setMatrixAt(i, dummy.matrix);

      // 3. Foliage Tier 2 (Mid Cone)
      dummy.position.set(x, y + 3.4 * scale, z);
      dummy.rotation.set(0, rotY + 0.5, 0);
      dummy.scale.set(scale * 1.15, scale * 1.5, scale * 1.15);
      dummy.updateMatrix();
      tier2MeshRef.current.setMatrixAt(i, dummy.matrix);

      // 4. Foliage Tier 3 (Top Crown)
      dummy.position.set(x, y + 4.4 * scale, z);
      dummy.rotation.set(0, rotY + 1.0, 0);
      dummy.scale.set(scale * 0.8, scale * 1.2, scale * 0.8);
      dummy.updateMatrix();
      tier3MeshRef.current.setMatrixAt(i, dummy.matrix);
    }

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    tier1MeshRef.current.instanceMatrix.needsUpdate = true;
    tier2MeshRef.current.instanceMatrix.needsUpdate = true;
    tier3MeshRef.current.instanceMatrix.needsUpdate = true;
  }, [treeData]);

  const treeCount = treeData.length;

  return (
    <group>
      {/* Instanced Trunks */}
      <instancedMesh ref={trunkMeshRef} args={[undefined, undefined, treeCount]} castShadow>
        <cylinderGeometry args={[0.16, 0.28, 1.8, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </instancedMesh>

      {/* Instanced Foliage Tier 1 (Deep Forest Green) */}
      <instancedMesh ref={tier1MeshRef} args={[undefined, undefined, treeCount]} castShadow>
        <coneGeometry args={[1.0, 1.0, 6]} />
        <meshStandardMaterial color="#065f46" roughness={0.6} />
      </instancedMesh>

      {/* Instanced Foliage Tier 2 (Lush Emerald) */}
      <instancedMesh ref={tier2MeshRef} args={[undefined, undefined, treeCount]} castShadow>
        <coneGeometry args={[1.0, 1.0, 6]} />
        <meshStandardMaterial color="#059669" roughness={0.6} />
      </instancedMesh>

      {/* Instanced Foliage Tier 3 (Vibrant Spiritual Jade) */}
      <instancedMesh ref={tier3MeshRef} args={[undefined, undefined, treeCount]} castShadow>
        <coneGeometry args={[1.0, 1.0, 6]} />
        <meshStandardMaterial color="#10b981" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

export default function Environment() {
  const terrainGeo = useMemo(() => createUndulatingTerrain(), []);

  return (
    <group>
      {/* Rich Procedural Undulating Terrain */}
      <mesh
        geometry={terrainGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 220]}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.85}
          metalness={0.08}
        />
      </mesh>

      {/* 2-Draw-Call Instanced Forest */}
      <InstancedForest />

      {/* Drifting Ethereal Clouds */}
      <CloudGroup />
    </group>
  );
}

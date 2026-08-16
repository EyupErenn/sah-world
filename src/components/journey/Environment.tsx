'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CURVE_POINTS } from '@/lib/constants';

// ============================================================
// Stylized Low-Poly Environment
// Rolling hills, pine trees, deciduous trees, and drifting clouds
// ============================================================

function PineTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.28, 1.6, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[1.5, 2.0, 6]} />
        <meshStandardMaterial color="#15803d" roughness={0.65} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <coneGeometry args={[1.1, 1.6, 6]} />
        <meshStandardMaterial color="#16a34a" roughness={0.65} />
      </mesh>
      <mesh position={[0, 4.1, 0]} castShadow>
        <coneGeometry args={[0.7, 1.2, 6]} />
        <meshStandardMaterial color="#22c55e" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 0.15 + position[2]) * 2.5;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <dodecahedronGeometry args={[3.2, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.92} />
      </mesh>
      <mesh position={[2.2, -0.4, 0]}>
        <dodecahedronGeometry args={[2.4, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-2.2, -0.3, 0]}>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <dodecahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

export default function Environment() {
  const trees = useMemo(() => {
    const list: Array<{ pos: [number, number, number]; scale: number }> = [];
    for (let i = 0; i < CURVE_POINTS.length - 1; i++) {
      const p1 = CURVE_POINTS[i];
      const p2 = CURVE_POINTS[i + 1];
      for (let step = 0; step < 9; step++) {
        const t = step / 9;
        const x = p1[0] + (p2[0] - p1[0]) * t;
        const y = p1[1] + (p2[1] - p1[1]) * t;
        const z = p1[2] + (p2[2] - p1[2]) * t;

        // Left trees
        const offsetLeft = 6.5 + (step % 3) * 4;
        list.push({
          pos: [x - offsetLeft, y - 0.1, z + (step % 2) * 2.5],
          scale: 0.85 + ((step * 3) % 4) * 0.18,
        });

        // Right trees
        const offsetRight = 6.5 + ((step + 1) % 3) * 4;
        list.push({
          pos: [x + offsetRight, y - 0.1, z - (step % 2) * 2.5],
          scale: 0.85 + ((step * 5) % 4) * 0.18,
        });
      }
    }
    return list;
  }, []);

  const clouds = useMemo(() => {
    return [
      { pos: [-35, 34, 30] as [number, number, number], scale: 2.2 },
      { pos: [40, 36, 110] as [number, number, number], scale: 2.8 },
      { pos: [-45, 32, 190] as [number, number, number], scale: 2.5 },
      { pos: [35, 38, 280] as [number, number, number], scale: 3.0 },
      { pos: [-30, 42, 370] as [number, number, number], scale: 2.6 },
    ];
  }, []);

  return (
    <group>
      {/* Soft stylized ground terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 220]} receiveShadow>
        <planeGeometry args={[1400, 800, 16, 16]} />
        <meshStandardMaterial
          color="#dcfce7"
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>

      {/* Trees along the road */}
      {trees.map((t, idx) => (
        <PineTree key={idx} position={t.pos} scale={t.scale} />
      ))}

      {/* Clouds */}
      {clouds.map((c, idx) => (
        <Cloud key={idx} position={c.pos} scale={c.scale} />
      ))}
    </group>
  );
}

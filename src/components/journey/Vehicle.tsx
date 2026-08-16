'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VehicleType } from '@/types';

// ============================================================
// Low-Poly PBR Vehicle with MeshStandardMaterial / MeshPhysicalMaterial
// Correctly-proportioned multi-part construction with rolling wheels
// ============================================================

interface VehicleProps {
  vehicleType: VehicleType;
  scrollProgress: number; // 0.0 - 1.0 (used for suspension bob speed)
}

// Shared materials
const GLASS_MAT = {
  color: '#0f172a',
  roughness: 0.04,
  metalness: 0.15,
  transparent: true,
  opacity: 0.62,
};

function CarVehicle({ color, groupRef }: { color: string; groupRef: React.RefObject<THREE.Group | null> }) {
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const susRefs = useRef<THREE.Group[]>([]);

  // Wheel positions: [x, y_offset, z]
  const wheelPositions: [number, number, number][] = [
    [-1.0, 0, 1.2],   // Front-left
    [1.0,  0, 1.2],   // Front-right
    [-1.0, 0, -1.2],  // Rear-left
    [1.0,  0, -1.2],  // Rear-right
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Suspension bob (gentle vertical oscillation)
    susRefs.current.forEach((sg, i) => {
      if (sg) sg.position.y = Math.sin(t * 4 + i * 1.5) * 0.018;
    });
    // Wheel rotation tied to travel
    wheelRefs.current.forEach(w => {
      if (w) w.rotation.x += 0.06;
    });
  });

  return (
    <group ref={groupRef}>
      {/* ── Main Body ── */}
      <mesh castShadow position={[0, 0.38, 0]}>
        <boxGeometry args={[1.9, 0.52, 3.4]} />
        <meshStandardMaterial color={color} metalness={0.42} roughness={0.38} />
      </mesh>

      {/* ── Front Fender Bulge ── */}
      <mesh castShadow position={[0, 0.35, 1.4]}>
        <boxGeometry args={[1.92, 0.22, 0.7]} />
        <meshStandardMaterial color={color} metalness={0.42} roughness={0.38} />
      </mesh>

      {/* ── Cabin/Roof ── */}
      <mesh castShadow position={[0, 0.82, -0.18]}>
        <boxGeometry args={[1.62, 0.5, 1.75]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.32} />
      </mesh>

      {/* ── Windshield Glass (front) ── */}
      <mesh position={[0, 0.78, 0.68]}>
        <boxGeometry args={[1.56, 0.44, 0.06]} />
        <meshStandardMaterial {...GLASS_MAT} />
      </mesh>

      {/* ── Rear Window Glass ── */}
      <mesh position={[0, 0.78, -1.05]}>
        <boxGeometry args={[1.56, 0.44, 0.06]} />
        <meshStandardMaterial {...GLASS_MAT} />
      </mesh>

      {/* ── Side Windows L ── */}
      <mesh position={[-0.96, 0.80, -0.18]}>
        <boxGeometry args={[0.04, 0.38, 1.5]} />
        <meshStandardMaterial {...GLASS_MAT} />
      </mesh>

      {/* ── Side Windows R ── */}
      <mesh position={[0.96, 0.80, -0.18]}>
        <boxGeometry args={[0.04, 0.38, 1.5]} />
        <meshStandardMaterial {...GLASS_MAT} />
      </mesh>

      {/* ── Headlights (emissive white) ── */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.38, 1.72]}>
          <boxGeometry args={[0.38, 0.14, 0.04]} />
          <meshStandardMaterial emissive="#fffde7" emissiveIntensity={1.8} color="#ffffff" roughness={0} />
        </mesh>
      ))}

      {/* ── Taillights (emissive red) ── */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.38, -1.72]}>
          <boxGeometry args={[0.38, 0.12, 0.04]} />
          <meshStandardMaterial emissive="#ef4444" emissiveIntensity={1.5} color="#ef4444" roughness={0} />
        </mesh>
      ))}

      {/* ── Wheels (4x) ── */}
      {wheelPositions.map((pos, i) => (
        <group
          key={i}
          position={[pos[0], pos[1], pos[2]]}
          ref={el => { if (el) susRefs.current[i] = el; }}
        >
          {/* Tire */}
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            castShadow
            ref={el => { if (el) wheelRefs.current[i] = el; }}
          >
            <cylinderGeometry args={[0.38, 0.38, 0.22, 18]} />
            <meshStandardMaterial color="#1a202c" roughness={0.9} metalness={0.0} />
          </mesh>
          {/* Hubcap */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[pos[0] < 0 ? 0.14 : -0.14, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 12]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* ── Undercarriage ── */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.1, 2.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BikeVehicle({ color, groupRef }: { color: string; groupRef: React.RefObject<THREE.Group | null> }) {
  const frontWheelRef = useRef<THREE.Mesh>(null);
  const rearWheelRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (frontWheelRef.current) frontWheelRef.current.rotation.x += 0.09;
    if (rearWheelRef.current) rearWheelRef.current.rotation.x += 0.09;
  });
  return (
    <group ref={groupRef}>
      {/* Frame top tube */}
      <mesh position={[0, 0.88, 0.1]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 1.45, 8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Down tube */}
      <mesh position={[0, 0.5, 0.55]} rotation={[-Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 1.1, 8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Seat post */}
      <mesh position={[0, 0.75, -0.45]} rotation={[0.12, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.55, 8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Saddle */}
      <mesh position={[0, 1.05, -0.5]}>
        <boxGeometry args={[0.15, 0.05, 0.36]} />
        <meshStandardMaterial color="#1a202c" roughness={0.8} />
      </mesh>
      {/* Handlebar */}
      <mesh position={[0, 1.1, 0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.52, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Rider body */}
      <mesh position={[0, 1.35, 0.1]} rotation={[Math.PI / 10, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.55, 6, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Rider head */}
      <mesh position={[0, 1.92, 0.25]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.8} />
      </mesh>
      {/* Front wheel */}
      <mesh position={[0, 0.44, 0.88]} rotation={[0, 0, Math.PI / 2]} ref={frontWheelRef}>
        <torusGeometry args={[0.38, 0.07, 10, 24]} />
        <meshStandardMaterial color="#1a202c" roughness={0.85} />
      </mesh>
      {/* Rear wheel */}
      <mesh position={[0, 0.44, -0.9]} rotation={[0, 0, Math.PI / 2]} ref={rearWheelRef}>
        <torusGeometry args={[0.38, 0.07, 10, 24]} />
        <meshStandardMaterial color="#1a202c" roughness={0.85} />
      </mesh>
    </group>
  );
}

function HorseVehicle({ color, groupRef }: { color: string; groupRef: React.RefObject<THREE.Group | null> }) {
  const bodyRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (bodyRef.current) {
      bodyRef.current.position.y = 0.95 + Math.sin(clock.getElapsedTime() * 3.5) * 0.06;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.85, 0.72, 1.85]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.5, 0.78]} rotation={[Math.PI / 5, 0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.88, 0.38]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.92, 1.12]} castShadow>
        <boxGeometry args={[0.32, 0.45, 0.62]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Mane (dark strip) */}
      <mesh position={[0, 1.72, 0.88]}>
        <boxGeometry args={[0.1, 0.55, 0.22]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Legs (4 cylinder legs) */}
      {[[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.6], [0.3, -0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z as number]} castShadow>
          <cylinderGeometry args={[0.1, 0.09, 0.82, 8]} />
          <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
        </mesh>
      ))}
      {/* Rider */}
      <mesh position={[0, 1.55, -0.1]} rotation={[0.06, 0, 0]}>
        <capsuleGeometry args={[0.16, 0.5, 6, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
    </group>
  );
}

function RocketVehicle({ color, groupRef }: { color: string; groupRef: React.RefObject<THREE.Group | null> }) {
  const plumeLightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (plumeLightRef.current) {
      plumeLightRef.current.intensity = 1.4 + Math.sin(clock.getElapsedTime() * 12) * 0.6;
    }
  });
  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Main fuselage */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.55, 2.8, 12]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <coneGeometry args={[0.5, 1.1, 12]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} />
      </mesh>
      {/* Side fins (2) */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side * 0.7, -0.9, 0]} rotation={[0, 0, side * 0.5]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Engine bell */}
      <mesh position={[0, -1.65, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.5, 12]} />
        <meshStandardMaterial color="#718096" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Exhaust plume glow */}
      <pointLight ref={plumeLightRef} position={[0, -2.1, 0]} color="#ff7700" intensity={1.4} distance={8} />
      {/* Window */}
      <mesh position={[0, 0.6, 0.52]}>
        <circleGeometry args={[0.22, 12]} />
        <meshStandardMaterial color="#93c5fd" roughness={0.05} metalness={0.2} transparent opacity={0.7} emissive="#93c5fd" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================
// Main Vehicle Component (switches by vehicleType)
// ============================================================
export default function Vehicle({ vehicleType, scrollProgress }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null);

  const colorMap: Record<VehicleType, string> = {
    car: '#4f46e5',
    bike: '#059669',
    horse: '#b8860b',
    rocket: '#ef4444',
  };
  const color = colorMap[vehicleType];

  return (
    <>
      {vehicleType === 'car'    && <CarVehicle    color={color} groupRef={groupRef} />}
      {vehicleType === 'bike'   && <BikeVehicle   color={color} groupRef={groupRef} />}
      {vehicleType === 'horse'  && <HorseVehicle  color={color} groupRef={groupRef} />}
      {vehicleType === 'rocket' && <RocketVehicle color={color} groupRef={groupRef} />}
    </>
  );
}

// Expose group ref for parent CameraRig
export { };

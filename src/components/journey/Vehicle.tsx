'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VehicleType } from '@/types';

// ============================================================
// Stylized PBR Vehicles (Car, Bike, Horse, Rocket)
// Designed for rich aesthetics, reflections, and animations
// ============================================================

interface VehicleProps {
  vehicleType: VehicleType;
}

// ── 1. CAR (Futuristic Cyber Sedan) ──
function CarVehicle({ color }: { color: string }) {
  const wheelFL = useRef<THREE.Mesh>(null);
  const wheelFR = useRef<THREE.Mesh>(null);
  const wheelRL = useRef<THREE.Mesh>(null);
  const wheelRR = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const rotSpeed = 0.12;
    if (wheelFL.current) wheelFL.current.rotation.x += rotSpeed;
    if (wheelFR.current) wheelFR.current.rotation.x += rotSpeed;
    if (wheelRL.current) wheelRL.current.rotation.x += rotSpeed;
    if (wheelRR.current) wheelRR.current.rotation.x += rotSpeed;
  });

  return (
    <group position={[0, 0.45, 0]}>
      {/* Chassis base */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[2.0, 0.45, 3.8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Aerodynamic Cabin / Glass Dome */}
      <mesh position={[0, 0.72, -0.2]} castShadow>
        <boxGeometry args={[1.65, 0.55, 2.1]} />
        <meshPhysicalMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.1}
          transmission={0.4}
          thickness={0.5}
        />
      </mesh>

      {/* Front Hood Scoop */}
      <mesh position={[0, 0.48, 1.2]} castShadow>
        <boxGeometry args={[1.5, 0.15, 1.1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rear Spoiler / Wing */}
      <mesh position={[0, 0.95, -1.7]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.7, -1.7]}>
          <boxGeometry args={[0.08, 0.45, 0.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}

      {/* Glowing Neon Headlights (Cyan/White) */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 1.91]}>
          <boxGeometry args={[0.35, 0.12, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.0} />
        </mesh>
      ))}

      {/* Glowing Neon Taillights (Red/Orange Lightbar) */}
      <mesh position={[0, 0.32, -1.91]}>
        <boxGeometry args={[1.7, 0.1, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4.0} />
      </mesh>

      {/* Wheels with Alloy Rims */}
      {/* Front Left */}
      <group position={[-1.12, 0.08, 1.2]}>
        <mesh ref={wheelFL} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.29, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[1.12, 0.08, 1.2]}>
        <mesh ref={wheelFR} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.29, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Left */}
      <group position={[-1.12, 0.08, -1.2]}>
        <mesh ref={wheelRL} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.29, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Right */}
      <group position={[1.12, 0.08, -1.2]}>
        <mesh ref={wheelRR} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.29, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Underglow Light */}
      <pointLight position={[0, -0.1, 0]} color={color} intensity={1.5} distance={5} />
    </group>
  );
}

// ── 2. BIKE ──
function BikeVehicle({ color }: { color: string }) {
  const fWheel = useRef<THREE.Mesh>(null);
  const rWheel = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (fWheel.current) fWheel.current.rotation.x += 0.15;
    if (rWheel.current) rWheel.current.rotation.x += 0.15;
  });

  return (
    <group position={[0, 0.4, 0]}>
      {/* Front Wheel */}
      <mesh ref={fWheel} position={[0, 0.35, 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.45, 0.08, 8, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Rear Wheel */}
      <mesh ref={rWheel} position={[0, 0.35, -1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.45, 0.08, 8, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0.7, 0]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.9, -0.4]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.5]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Handlebars */}
      <mesh position={[0, 1.15, 0.9]} castShadow>
        <boxGeometry args={[0.9, 0.06, 0.06]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
      </mesh>
      {/* Light */}
      <mesh position={[0, 1.0, 1.1]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

// ── 3. HORSE ──
function HorseVehicle({ color }: { color: string }) {
  const bodyRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bodyRef.current) {
      bodyRef.current.position.y = 0.5 + Math.sin(clock.getElapsedTime() * 8) * 0.1;
      bodyRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 8) * 0.05;
    }
  });

  return (
    <group ref={bodyRef}>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.9, 2.0]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Neck & Head */}
      <mesh position={[0, 2.0, 0.9]} rotation={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 1.1, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Mane / Gold Saddle */}
      <mesh position={[0, 1.68, -0.1]} castShadow>
        <boxGeometry args={[0.85, 0.2, 0.8]} />
        <meshStandardMaterial color="#ffd700" emissive="#b8860b" emissiveIntensity={0.5} metalness={0.7} />
      </mesh>
      {/* Legs (4) */}
      {[[-0.3, 0.5, 0.7], [0.3, 0.5, 0.7], [-0.3, 0.5, -0.7], [0.3, 0.5, -0.7]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.12, 0.08, 1.1, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ── 4. ROCKET ──
function RocketVehicle({ color }: { color: string }) {
  const plumeRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (plumeRef.current) {
      plumeRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 20) * 0.25;
    }
  });

  return (
    <group position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Fuselage */}
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.75, 3.4, 16]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Nosecone */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[0.6, 1.2, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Thruster Plume */}
      <mesh ref={plumeRef} position={[0, -2.1, 0]}>
        <coneGeometry args={[0.5, 1.6, 12]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ff4400" emissiveIntensity={4.0} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, -2.2, 0]} color="#ff6600" intensity={4} distance={8} />
    </group>
  );
}

// ============================================================
// Main Vehicle Component
// ============================================================
export default function Vehicle({ vehicleType }: VehicleProps) {
  const colorMap: Record<VehicleType, string> = {
    car: '#4f46e5',
    bike: '#059669',
    horse: '#b8860b',
    rocket: '#ef4444',
  };
  const color = colorMap[vehicleType] ?? '#4f46e5';

  return (
    <>
      {vehicleType === 'car'    && <CarVehicle    color={color} />}
      {vehicleType === 'bike'   && <BikeVehicle   color={color} />}
      {vehicleType === 'horse'  && <HorseVehicle  color={color} />}
      {vehicleType === 'rocket' && <RocketVehicle color={color} />}
    </>
  );
}

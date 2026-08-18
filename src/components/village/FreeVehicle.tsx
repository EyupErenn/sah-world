'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { VehicleType } from '@/types';
import { getTerrainHeight, isRoadSurface, WORLD_BOUNDS } from '@/lib/villageData';

interface FreeVehicleProps {
  vehicleType: VehicleType;
  isInputBlocked: boolean;
  touchInput?: { steer: number; throttle: number };
  onUpdateState: (x: number, y: number, z: number, heading: number, speed: number) => void;
  vehicleRef?: React.RefObject<THREE.Group | null>;
}

// ============================================================
// Procedural Soft Contact Shadow Texture (Bruno Simon Style)
// ============================================================
function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ============================================================
// 1. CAR (Stylized Bruno Simon Cyber Coupe)
// ============================================================
function CarModel({
  color,
  speed,
  steerAngle,
  suspensionFL,
  suspensionFR,
  suspensionRL,
  suspensionRR,
}: {
  color: string;
  speed: number;
  steerAngle: number;
  suspensionFL: number;
  suspensionFR: number;
  suspensionRL: number;
  suspensionRR: number;
}) {
  const wheelFLMesh = useRef<THREE.Group>(null);
  const wheelFRMesh = useRef<THREE.Group>(null);
  const wheelRLMesh = useRef<THREE.Group>(null);
  const wheelRRMesh = useRef<THREE.Group>(null);

  const frontWheelAngle = useRef(0);
  const rearWheelAngle = useRef(0);

  useFrame((_, delta) => {
    const rot = -speed * delta * 4.0;
    frontWheelAngle.current += rot;
    rearWheelAngle.current += rot;

    if (wheelFLMesh.current) {
      wheelFLMesh.current.position.y = 0.04 + suspensionFL;
      wheelFLMesh.current.rotation.y = steerAngle;
      wheelFLMesh.current.children[0]?.rotation.set(frontWheelAngle.current, 0, Math.PI / 2);
    }
    if (wheelFRMesh.current) {
      wheelFRMesh.current.position.y = 0.04 + suspensionFR;
      wheelFRMesh.current.rotation.y = steerAngle;
      wheelFRMesh.current.children[0]?.rotation.set(frontWheelAngle.current, 0, Math.PI / 2);
    }
    if (wheelRLMesh.current) {
      wheelRLMesh.current.position.y = 0.04 + suspensionRL;
      wheelRLMesh.current.children[0]?.rotation.set(rearWheelAngle.current, 0, Math.PI / 2);
    }
    if (wheelRRMesh.current) {
      wheelRRMesh.current.position.y = 0.04 + suspensionRR;
      wheelRRMesh.current.children[0]?.rotation.set(rearWheelAngle.current, 0, Math.PI / 2);
    }
  });

  return (
    <group position={[0, 0.44, 0]}>
      {/* Dark Aerodynamic Chassis Underbody & Diffuser */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.92, 0.22, 3.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Main Painted Body Shell */}
      <RoundedBox args={[1.92, 0.44, 3.5]} radius={0.16} smoothness={4} position={[0, 0.34, -0.04]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </RoundedBox>

      {/* Sloping Front Hood & Nose */}
      <RoundedBox args={[1.78, 0.3, 1.0]} radius={0.12} smoothness={4} position={[0, 0.39, -1.62]} rotation={[-0.1, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </RoundedBox>

      {/* Separate rear deck gives the coupe a readable hood/cabin/trunk silhouette. */}
      <RoundedBox args={[1.82, 0.3, 0.82]} radius={0.1} smoothness={4} position={[0, 0.46, 1.48]} rotation={[0.06, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.24} />
      </RoundedBox>

      {/* Cockpit Greenhouse (Curved Cabin Glass) */}
      <RoundedBox args={[1.48, 0.58, 1.84]} radius={0.2} smoothness={5} position={[0, 0.75, 0.08]} castShadow>
        <meshPhysicalMaterial
          color="#090d16"
          metalness={0.8}
          roughness={0.1}
          transmission={0.45}
          thickness={0.5}
        />
      </RoundedBox>

      {/* Distinct windshield and rear glass planes break up the cabin mass. */}
      <mesh position={[0, 0.77, -0.86]} rotation={[-0.26, 0, 0]}>
        <boxGeometry args={[1.34, 0.42, 0.035]} />
        <meshPhysicalMaterial color="#0ea5e9" transmission={0.5} roughness={0.08} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.76, 1.0]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[1.3, 0.38, 0.035]} />
        <meshPhysicalMaterial color="#082f49" transmission={0.38} roughness={0.1} metalness={0.5} />
      </mesh>

      {/* Roof Cap */}
      <mesh position={[0, 0.88, 0.14]} castShadow>
        <boxGeometry args={[1.42, 0.08, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.2} />
      </mesh>

      {/* Side Accent Trim Stripes */}
      {[-0.94, 0.94].map((x, i) => (
        <mesh key={i} position={[x, 0.34, 0]}>
          <boxGeometry args={[0.04, 0.08, 3.0]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
        </mesh>
      ))}

      {/* Sporty Rear Wing / Spoiler */}
      <mesh position={[0, 0.82, 1.62]} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} position={[x, 0.68, 1.62]} castShadow>
          <boxGeometry args={[0.08, 0.24, 0.12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}

      {/* Side Mirrors */}
      {[-0.88, 0.88].map((x, i) => (
        <mesh key={i} position={[x, 0.58, -0.65]} castShadow>
          <boxGeometry args={[0.22, 0.12, 0.16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}

      {/* Front Headlight Strips & Projector Dots */}
      {[-0.68, 0.68].map((x, i) => (
        <group key={i} position={[x, 0.28, -2.0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.08, 0.06]} />
            <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.5} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={4.5} />
          </mesh>
        </group>
      ))}

      {/* Warm working headlights illuminate the road ahead. */}
      <pointLight position={[-0.65, 0.3, -2.12]} color="#fff7d6" intensity={1.8} distance={9} decay={2} />
      <pointLight position={[0.65, 0.3, -2.12]} color="#fff7d6" intensity={1.8} distance={9} decay={2} />

      {/* Front grille and lower bumper. */}
      <mesh position={[0, 0.16, -2.08]}>
        <boxGeometry args={[1.1, 0.16, 0.07]} />
        <meshStandardMaterial color="#020617" metalness={0.75} roughness={0.45} />
      </mesh>

      {/* Rear-only lamp clusters and bumper — no red glow on the front. */}
      {[-0.64, 0.64].map(x => (
        <RoundedBox key={x} args={[0.46, 0.13, 0.065]} radius={0.035} smoothness={3} position={[x, 0.42, 1.92]}>
          <meshStandardMaterial color="#fb7185" emissive="#ef4444" emissiveIntensity={3.6} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.12, 1.94]}>
        <boxGeometry args={[1.62, 0.14, 0.08]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.42} />
      </mesh>

      {/* 4 Wheels with Individual Suspension & Rims */}
      {/* Front Left */}
      <group ref={wheelFLMesh} position={[-1.02, 0.04, -1.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.32, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
          {/* Wheel Rim Cap */}
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
        </mesh>
      </group>

      {/* Front Right */}
      <group ref={wheelFRMesh} position={[1.02, 0.04, -1.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.32, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
        </mesh>
      </group>

      {/* Rear Left */}
      <group ref={wheelRLMesh} position={[-1.02, 0.04, 1.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.34, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.04, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
        </mesh>
      </group>

      {/* Rear Right */}
      <group ref={wheelRRMesh} position={[1.02, 0.04, 1.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.34, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.04, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
        </mesh>
      </group>

      {/* Soft Underglow */}
      <pointLight position={[0, -0.1, 0]} color={color} intensity={1.5} distance={3.8} />
    </group>
  );
}

// ============================================================
// 2. BIKE (Stylized Low-Poly Bicycle with Spoke Suggestions)
// ============================================================
function BikeModel({
  color,
  speed,
  steerAngle,
}: {
  color: string;
  speed: number;
  steerAngle: number;
}) {
  const frontWheel = useRef<THREE.Group>(null);
  const rearWheel = useRef<THREE.Mesh>(null);
  const pedalRef = useRef<THREE.Group>(null);

  const wheelAngle = useRef(0);

  useFrame((_, delta) => {
    const rot = -speed * delta * 5.0;
    wheelAngle.current += rot;

    if (frontWheel.current) {
      frontWheel.current.rotation.y = steerAngle;
      const fTire = frontWheel.current.children[0];
      if (fTire) fTire.rotation.set(wheelAngle.current, 0, Math.PI / 2);
    }
    if (rearWheel.current) {
      rearWheel.current.rotation.set(wheelAngle.current, 0, Math.PI / 2);
    }
    if (pedalRef.current) {
      pedalRef.current.rotation.x += rot * 0.4;
    }
  });

  return (
    <group position={[0, 0.44, 0]}>
      {/* Front Fork & Steerable Assembly */}
      <group ref={frontWheel} position={[0, 0.1, -1.2]}>
        {/* Front Tire & Spoke Disc */}
        <mesh castShadow>
          <torusGeometry args={[0.46, 0.06, 8, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
          {/* Spoke lines */}
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.01, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} transparent opacity={0.3} />
          </mesh>
        </mesh>

        {/* Front Fork Legs */}
        <mesh position={[-0.08, 0.38, 0.08]} rotation={[0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[0.08, 0.38, 0.08]} rotation={[0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>

        {/* Handlebars */}
        <mesh position={[0, 0.98, 0.18]} castShadow>
          <boxGeometry args={[0.85, 0.05, 0.07]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Handlebar Grips */}
        {[-0.38, 0.38].map((x, i) => (
          <mesh key={i} position={[x, 0.98, 0.18]}>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        ))}

        {/* Headlamp */}
        <mesh position={[0, 0.88, -0.05]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.5} />
        </mesh>
      </group>

      {/* Rear Wheel */}
      <mesh ref={rearWheel} position={[0, 0.1, 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.46, 0.06, 8, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.01, 6]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} transparent opacity={0.3} />
        </mesh>
      </mesh>

      {/* Diamond Main Frame Tubes */}
      {/* Top tube */}
      <mesh position={[0, 0.78, -0.15]} rotation={[-0.08, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.65, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Down tube */}
      <mesh position={[0, 0.42, -0.45]} rotation={[0.62, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Seat tube */}
      <mesh position={[0, 0.52, 0.28]} rotation={[-0.24, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.25, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rear chainstay */}
      <mesh position={[0, 0.12, 0.74]} rotation={[0.02, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Crankset & Pedals */}
      <group ref={pedalRef} position={[0, 0.1, 0.15]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.28, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        <mesh position={[-0.14, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.08, 0.14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.14, -0.12, 0]}>
          <boxGeometry args={[0.04, 0.08, 0.14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Saddle */}
      <mesh position={[0, 0.88, 0.36]} castShadow>
        <boxGeometry args={[0.22, 0.07, 0.45]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Rear Reflector */}
      <mesh position={[0, 0.68, 0.46]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.0} />
      </mesh>
    </group>
  );
}

// ============================================================
// 3. HORSE (Stylized Low-Poly Steed with Galloping Cycle)
// ============================================================
function HorseModel({
  color,
  speed,
}: {
  color: string;
  speed: number;
}) {
  const horseBodyRef = useRef<THREE.Group>(null);
  const legFL = useRef<THREE.Group>(null);
  const legFR = useRef<THREE.Group>(null);
  const legBL = useRef<THREE.Group>(null);
  const legBR = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const isMoving = Math.abs(speed) > 0.4;
    const t = isMoving ? clock.getElapsedTime() * Math.min(18, Math.abs(speed) * 1.6) : clock.getElapsedTime() * 1.5;

    if (horseBodyRef.current) {
      if (isMoving) {
        horseBodyRef.current.position.y = 0.5 + Math.sin(t * 2) * 0.08;
        horseBodyRef.current.rotation.x = Math.sin(t * 2) * 0.06;
      } else {
        // Idle breathing
        horseBodyRef.current.position.y = 0.5 + Math.sin(t) * 0.015;
        horseBodyRef.current.rotation.x = 0;
      }
    }

    if (isMoving) {
      if (legFL.current) legFL.current.rotation.x = Math.sin(t) * 0.65;
      if (legFR.current) legFR.current.rotation.x = -Math.sin(t) * 0.65;
      if (legBL.current) legBL.current.rotation.x = -Math.sin(t) * 0.55;
      if (legBR.current) legBR.current.rotation.x = Math.sin(t) * 0.55;
    } else {
      if (legFL.current) legFL.current.rotation.x = 0;
      if (legFR.current) legFR.current.rotation.x = 0;
      if (legBL.current) legBL.current.rotation.x = 0;
      if (legBR.current) legBR.current.rotation.x = 0;
    }

    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 1.5) * 0.18;
    }
  });

  return (
    <group ref={horseBodyRef} position={[0, 0.5, 0]}>
      {/* Torso */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.72, 0.82, 1.85]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Neck & Head */}
      <mesh position={[0, 1.65, -0.75]} rotation={[0.42, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.95, 0.52]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.05, -1.18]} castShadow>
        <boxGeometry args={[0.38, 0.36, 0.65]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Stylized Ears */}
      {[-0.14, 0.14].map((x, i) => (
        <mesh key={i} position={[x, 2.32, -1.02]} rotation={[-0.2, 0, 0]}>
          <coneGeometry args={[0.06, 0.22, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {/* Golden Royal Saddle */}
      <mesh position={[0, 1.5, 0.05]} castShadow>
        <boxGeometry args={[0.78, 0.16, 0.72]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} metalness={0.7} />
      </mesh>

      {/* Tail */}
      <mesh ref={tailRef} position={[0, 1.1, 1.05]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.75, 0.18]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* 4 Animated Legs */}
      {/* Front Left */}
      <group ref={legFL} position={[-0.26, 0.9, -0.65]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.95, 8]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
      </group>

      {/* Front Right */}
      <group ref={legFR} position={[0.26, 0.9, -0.65]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.95, 8]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
      </group>

      {/* Back Left */}
      <group ref={legBL} position={[-0.26, 0.9, 0.65]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.95, 8]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
      </group>

      {/* Back Right */}
      <group ref={legBR} position={[0.26, 0.9, 0.65]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.95, 8]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================
// 4. ROCKET (Stylized Low-Poly Sci-Fi Rocket)
// ============================================================
function RocketModel({
  color,
  speed,
}: {
  color: string;
  speed: number;
}) {
  const plumeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (plumeRef.current) {
      const active = Math.abs(speed) > 0.5 ? 1.6 : 0.8;
      plumeRef.current.scale.z = (1 + Math.sin(clock.getElapsedTime() * 26) * 0.35) * active;
      plumeRef.current.scale.x = 1 + Math.sin(clock.getElapsedTime() * 18) * 0.15;
    }
  });

  return (
    <group position={[0, 0.88, 0]}>
      {/* Cylindrical Main Fuselage */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.6, 3.2, 16]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Sleek Aerodynamic Nosecone */}
      <mesh position={[0, 0, -2.1]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.46, 1.15, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.15} />
      </mesh>

      {/* Cyber Glass Canopy */}
      <mesh position={[0, 0.32, -0.6]} castShadow>
        <boxGeometry args={[0.42, 0.28, 1.1]} />
        <meshPhysicalMaterial color="#0284c7" transmission={0.75} roughness={0.05} />
      </mesh>

      {/* 4 Aerodynamic Delta Wings / Fins */}
      {[0, 1, 2, 3].map(i => {
        const a = (i * Math.PI) / 2;
        return (
          <group key={i} rotation={[0, 0, a]} position={[0, 0, 1.0]}>
            <mesh position={[0.7, 0, 0]} castShadow>
              <boxGeometry args={[0.65, 0.06, 0.85]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Thruster Engine Ring */}
      <mesh position={[0, 0, 1.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.44, 0.2, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>

      {/* Fiery Thruster Plume */}
      <mesh ref={plumeRef} position={[0, 0, 2.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.38, 1.5, 12]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ef4444"
          emissiveIntensity={5.0}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight position={[0, 0, 2.2]} color="#f97316" intensity={3.5} distance={6} />
    </group>
  );
}

// ============================================================
// Main Physics-Driven Vehicle Component with Bruno Simon Feel
// ============================================================
export default function FreeVehicle({
  vehicleType,
  isInputBlocked,
  touchInput,
  onUpdateState,
  vehicleRef,
}: FreeVehicleProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);

  // Soft Contact Shadow Texture Memo
  const shadowTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createContactShadowTexture();
  }, []);

  // Physics state (refs — mutated every frame, not for rendering)
  const posRef = useRef({ x: 0, z: 0 });
  const headingRef = useRef(0);
  const speedRef = useRef(0);
  const steerInputRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);
  const suspensionRef = useRef({ fl: 0, fr: 0, rl: 0, rr: 0 });

  // Render-visible state — updated throttled in useFrame so JSX re-renders
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displaySteer, setDisplaySteer] = useState(0);
  const displayFrameCount = useRef(0);

  const keysRef = useRef<{ [k: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputBlocked) return;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInputBlocked]);

  // Main Vehicle Simulation Loop
  useFrame((_, delta) => {
    const root = rootGroupRef.current;
    const body = bodyGroupRef.current;
    if (!root || !body) return;

    if (vehicleRef && vehicleRef.current !== root) {
      (vehicleRef as React.MutableRefObject<THREE.Group | null>).current = root;
    }

    const dt = Math.min(delta, 0.1);
    const keys = isInputBlocked ? {} : keysRef.current;

    // 1. Gather Inputs
    let forwardInput = 0;
    let steerInput = 0;

    if (keys['w'] || keys['arrowup']) forwardInput += 1;
    if (keys['s'] || keys['arrowdown']) forwardInput -= 1;
    if (keys['a'] || keys['arrowleft']) steerInput += 1;
    if (keys['d'] || keys['arrowright']) steerInput -= 1;

    if (touchInput && !isInputBlocked) {
      forwardInput += touchInput.throttle;
      steerInput -= touchInput.steer;
    }

    forwardInput = Math.max(-1, Math.min(1, forwardInput));
    steerInput = Math.max(-1, Math.min(1, steerInput));
    steerInputRef.current = steerInput;

    // 2. Surface Physics
    const onRoad = isRoadSurface(posRef.current.x, posRef.current.z);
    const maxSpeed = onRoad ? 21.0 : 14.0;
    const maxReverse = -6.5;
    const accelRate = onRoad ? 24.0 : 16.0;
    const brakeRate = 34.0;
    const drag = onRoad ? 0.94 : 0.86;

    // 3. Speed & Acceleration
    let speed = speedRef.current;
    let accelForce = 0;

    if (forwardInput > 0) {
      accelForce = accelRate * forwardInput;
      speed += accelForce * dt;
      if (speed > maxSpeed) speed = maxSpeed;
    } else if (forwardInput < 0) {
      if (speed > 0) {
        accelForce = -brakeRate;
        speed -= brakeRate * dt;
      } else {
        accelForce = accelRate * forwardInput;
        speed += accelRate * forwardInput * dt;
        if (speed < maxReverse) speed = maxReverse;
      }
    } else {
      speed *= Math.pow(drag, dt * 60);
      if (Math.abs(speed) < 0.04) speed = 0;
    }
    speedRef.current = speed;

    // 4. Proportional Steering & Heading
    if (Math.abs(speed) > 0.08 && steerInput !== 0) {
      const turnMultiplier = Math.min(1.0, Math.abs(speed) / 3.8) * Math.sign(speed);
      const turnSpeed = 2.9;
      headingRef.current += steerInput * turnSpeed * turnMultiplier * dt;
    }

    // 5. Position Integration
    const heading = headingRef.current;
    const vx = -Math.sin(heading) * speed;
    const vz = -Math.cos(heading) * speed;

    posRef.current.x += vx * dt;
    posRef.current.z += vz * dt;

    // Soft bounds clamp
    const bound = WORLD_BOUNDS - 2;
    if (posRef.current.x > bound) { posRef.current.x = bound; speedRef.current *= -0.25; }
    if (posRef.current.x < -bound) { posRef.current.x = -bound; speedRef.current *= -0.25; }
    if (posRef.current.z > bound) { posRef.current.z = bound; speedRef.current *= -0.25; }
    if (posRef.current.z < -bound) { posRef.current.z = -bound; speedRef.current *= -0.25; }

    // 6. Terrain Pitch & Roll Alignment
    const x = posRef.current.x;
    const z = posRef.current.z;
    const y = getTerrainHeight(x, z);

    // Lookahead for slope pitch
    const lookDist = 1.6;
    const yAhead = getTerrainHeight(x - Math.sin(heading) * lookDist, z - Math.cos(heading) * lookDist);
    const yBehind = getTerrainHeight(x + Math.sin(heading) * lookDist, z + Math.cos(heading) * lookDist);
    const terrainPitch = Math.atan2(yAhead - yBehind, lookDist * 2);

    // Dynamic Suspension Compression & Weight Shift (Bruno Simon physics)
    const accelPitchDelta = -(accelForce / 35.0) * 0.08; // squat on accel, dive on brake
    const targetPitch = terrainPitch + accelPitchDelta;
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, 0.18);

    // Dynamic Centrifugal Body Lean into turns
    const targetRoll = -steerInput * (speed / maxSpeed) * 0.16;
    rollRef.current = THREE.MathUtils.lerp(rollRef.current, targetRoll, 0.15);

    // Wheel compression simulation
    suspensionRef.current.fl = THREE.MathUtils.lerp(suspensionRef.current.fl, -accelPitchDelta * 0.4 + targetRoll * 0.3, 0.2);
    suspensionRef.current.fr = THREE.MathUtils.lerp(suspensionRef.current.fr, -accelPitchDelta * 0.4 - targetRoll * 0.3, 0.2);
    suspensionRef.current.rl = THREE.MathUtils.lerp(suspensionRef.current.rl, accelPitchDelta * 0.4 + targetRoll * 0.3, 0.2);
    suspensionRef.current.rr = THREE.MathUtils.lerp(suspensionRef.current.rr, accelPitchDelta * 0.4 - targetRoll * 0.3, 0.2);

    // Apply Root Transforms
    root.position.set(x, y + 0.04, z);
    root.rotation.set(0, heading, 0);

    // Apply Body Pitch & Roll
    body.rotation.set(pitchRef.current, 0, rollRef.current, 'YXZ');

    // Dynamic Contact Shadow Scale & Opacity
    if (shadowMeshRef.current) {
      const shadowScale = 1.0 + Math.abs(speed / maxSpeed) * 0.15;
      shadowMeshRef.current.scale.set(shadowScale, shadowScale, 1);
    }

    // Notify listeners / camera / minimap
    onUpdateState(x, y, z, heading, speed);

    // Throttled state update for JSX re-renders (every 4 frames ~15Hz)
    displayFrameCount.current++;
    if (displayFrameCount.current % 4 === 0) {
      setDisplaySpeed(speed);
      setDisplaySteer(steerInputRef.current);
    }
  });

  const colorMap: Record<VehicleType, string> = {
    car: '#6366f1',
    bike: '#10b981',
    horse: '#d97706',
    rocket: '#ef4444',
  };
  const color = colorMap[vehicleType] ?? '#6366f1';

  return (
    <group ref={rootGroupRef}>
      {/* ============ SOFT CONTACT SHADOW (Bruno Simon grounded feel) ============ */}
      <mesh
        ref={shadowMeshRef}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[3.1, 5]} />
        {shadowTexture ? (
          <meshBasicMaterial
            map={shadowTexture}
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial color="#000000" transparent opacity={0.4} />
        )}
      </mesh>

      {/* ============ DYNAMIC VEHICLE BODY WITH SUSPENSION ============ */}
      <group ref={bodyGroupRef}>
        {vehicleType === 'car' && (
          <CarModel
            color={color}
            speed={displaySpeed}
            steerAngle={displaySteer * 0.45}
            suspensionFL={suspensionRef.current.fl}
            suspensionFR={suspensionRef.current.fr}
            suspensionRL={suspensionRef.current.rl}
            suspensionRR={suspensionRef.current.rr}
          />
        )}
        {vehicleType === 'bike' && (
          <BikeModel
            color={color}
            speed={displaySpeed}
            steerAngle={displaySteer * 0.4}
          />
        )}
        {vehicleType === 'horse' && (
          <HorseModel
            color={color}
            speed={displaySpeed}
          />
        )}
        {vehicleType === 'rocket' && (
          <RocketModel
            color={color}
            speed={displaySpeed}
          />
        )}

        {/* Dynamic Speed Dust & Sparkle Trail — visible when moving */}
        <group
          position={[0, 0.05, 1.8]}
          visible={Math.abs(displaySpeed) > 2.5}
        >
          <Sparkles count={14} scale={[1.4, 0.5, 2.2]} size={1.9} speed={0.9} color="#94a3b8" opacity={0.55} />
        </group>
      </group>
    </group>
  );
}

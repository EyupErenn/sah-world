'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VehicleType } from '@/types';

// ============================================================
// STYLIZED HIGH-FIDELITY VEHICLES
// Note on Three.js orientation:
// When parent group uses group.lookAt(target), local -Z points forward.
// All vehicles here are oriented facing -Z (Forward = -Z, Up = +Y, Right = +X).
// ============================================================

interface VehicleProps {
  vehicleType: VehicleType;
}

// ── 1. CAR (Cyber-Spiritual Grand Tourer) ──
function CarVehicle({ color }: { color: string }) {
  const wheelFL = useRef<THREE.Mesh>(null);
  const wheelFR = useRef<THREE.Mesh>(null);
  const wheelRL = useRef<THREE.Mesh>(null);
  const wheelRR = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const rotSpeed = -0.16; // rolling forward
    if (wheelFL.current) wheelFL.current.rotation.x += rotSpeed;
    if (wheelFR.current) wheelFR.current.rotation.x += rotSpeed;
    if (wheelRL.current) wheelRL.current.rotation.x += rotSpeed;
    if (wheelRR.current) wheelRR.current.rotation.x += rotSpeed;
  });

  return (
    <group position={[0, 0.42, 0]}>
      {/* Aerodynamic Lower Body Chassis */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.38, 3.6]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.22} />
      </mesh>

      {/* Front Nose Wedge */}
      <mesh position={[0, 0.18, -1.6]} rotation={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[1.75, 0.28, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.22} />
      </mesh>

      {/* Sleek Cockpit Glass Dome */}
      <mesh position={[0, 0.58, 0.15]} castShadow>
        <boxGeometry args={[1.5, 0.46, 1.9]} />
        <meshPhysicalMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.08}
          transmission={0.5}
          thickness={0.6}
        />
      </mesh>

      {/* Rear Aero Diffuser & Spoiler */}
      <mesh position={[0, 0.82, 1.55]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.35]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} position={[x, 0.58, 1.55]}>
          <boxGeometry args={[0.06, 0.42, 0.16]} />
          <meshStandardMaterial color="#090d16" metalness={0.9} />
        </mesh>
      ))}

      {/* Front Headlights (Facing -Z Forward) */}
      {[-0.68, 0.68].map((x, i) => (
        <group key={i} position={[x, 0.26, -1.96]}>
          <mesh>
            <boxGeometry args={[0.32, 0.1, 0.08]} />
            <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.5} />
          </mesh>
        </group>
      ))}

      {/* Rear Taillight Lightbar (Facing +Z Back) */}
      <mesh position={[0, 0.28, 1.82]}>
        <boxGeometry args={[1.65, 0.08, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4.5} />
      </mesh>

      {/* Side Neon Accent Strips */}
      {[-0.96, 0.96].map((x, i) => (
        <mesh key={i} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.05, 2.8]} />
          <meshStandardMaterial color="#6366f1" emissive="#818cf8" emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* Wheels with Sport Rims */}
      {/* Front Left */}
      <group position={[-1.02, 0.02, -1.1]}>
        <mesh ref={wheelFL} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[1.02, 0.02, -1.1]}>
        <mesh ref={wheelFR} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Left */}
      <group position={[-1.02, 0.02, 1.1]}>
        <mesh ref={wheelRL} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Right */}
      <group position={[1.02, 0.02, 1.1]}>
        <mesh ref={wheelRR} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Underglow Light */}
      <pointLight position={[0, -0.15, 0]} color={color} intensity={2.2} distance={4.5} />
    </group>
  );
}

// ── 2. BIKE (Aerodynamic Cyber-Bicycle) ──
function BikeVehicle({ color }: { color: string }) {
  const fWheel = useRef<THREE.Mesh>(null);
  const rWheel = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const rotSpeed = -0.22;
    if (fWheel.current) fWheel.current.rotation.x += rotSpeed;
    if (rWheel.current) rWheel.current.rotation.x += rotSpeed;
  });

  return (
    <group position={[0, 0.46, 0]}>
      {/* Front Wheel (-Z Forward) */}
      <mesh ref={fWheel} position={[0, 0.1, -1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.46, 0.07, 10, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>
      {/* Front Rim Hub */}
      <mesh position={[0, 0.1, -1.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.9} emissive="#0284c7" emissiveIntensity={0.8} />
      </mesh>

      {/* Rear Wheel (+Z Back) */}
      <mesh ref={rWheel} position={[0, 0.1, 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.46, 0.07, 10, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>
      {/* Rear Rim Hub */}
      <mesh position={[0, 0.1, 1.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.9} emissive="#0284c7" emissiveIntensity={0.8} />
      </mesh>

      {/* Aero Diamond Frame */}
      <mesh position={[0, 0.45, 0]} rotation={[-0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.1, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0.35]} rotation={[0.45, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.65, -0.45]} rotation={[-0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ergonomic Saddle */}
      <mesh position={[0, 0.88, 0.42]} castShadow>
        <boxGeometry args={[0.26, 0.08, 0.55]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Handlebars */}
      <mesh position={[0, 1.12, -0.92]} castShadow>
        <boxGeometry args={[0.85, 0.05, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Front Glowing Light */}
      <mesh position={[0, 1.05, -1.08]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={4.0} />
      </mesh>

      {/* Rear Taillight */}
      <mesh position={[0, 0.8, 0.72]}>
        <boxGeometry args={[0.12, 0.06, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4.5} />
      </mesh>

      <pointLight position={[0, 0.2, 0]} color={color} intensity={1.8} distance={3.5} />
    </group>
  );
}

// ── 3. HORSE (Majestic Low-Poly Spiritual Steed) ──
function HorseVehicle({ color }: { color: string }) {
  const bodyRef = useRef<THREE.Group>(null);
  const legFL = useRef<THREE.Mesh>(null);
  const legFR = useRef<THREE.Mesh>(null);
  const legBL = useRef<THREE.Mesh>(null);
  const legBR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 7;
    if (bodyRef.current) {
      bodyRef.current.position.y = 0.48 + Math.sin(t * 2) * 0.06;
      bodyRef.current.rotation.x = Math.sin(t * 2) * 0.04;
    }
    // Gallop leg rotation
    if (legFL.current) legFL.current.rotation.x = Math.sin(t) * 0.55;
    if (legFR.current) legFR.current.rotation.x = -Math.sin(t) * 0.55;
    if (legBL.current) legBL.current.rotation.x = -Math.sin(t) * 0.5;
    if (legBR.current) legBR.current.rotation.x = Math.sin(t) * 0.5;
  });

  return (
    <group ref={bodyRef}>
      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.75, 0.85, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>

      {/* Neck & Head (-Z is Forward) */}
      <mesh position={[0, 1.85, -0.85]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.45, 1.05, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.15, -1.25]} castShadow>
        <boxGeometry args={[0.4, 0.38, 0.65]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>

      {/* Golden Saddle & Spiritual Barding */}
      <mesh position={[0, 1.55, 0.05]} castShadow>
        <boxGeometry args={[0.82, 0.18, 0.75]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing Stirrup Auras */}
      {[-0.44, 0.44].map((x, i) => (
        <mesh key={i} position={[x, 1.25, 0.05]}>
          <boxGeometry args={[0.08, 0.45, 0.08]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} />
        </mesh>
      ))}

      {/* Four Running Legs */}
      <mesh ref={legFL} position={[-0.28, 0.5, -0.65]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 1.0, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh ref={legFR} position={[0.28, 0.5, -0.65]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 1.0, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh ref={legBL} position={[-0.28, 0.5, 0.65]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 1.0, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh ref={legBR} position={[0.28, 0.5, 0.65]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 1.0, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>

      <pointLight position={[0, 0.4, 0]} color="#f59e0b" intensity={1.5} distance={4} />
    </group>
  );
}

// ── 4. ROCKET (Futuristic Spiritual Star-Cruiser) ──
function RocketVehicle({ color }: { color: string }) {
  const plumeRef = useRef<THREE.Mesh>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (plumeRef.current) {
      plumeRef.current.scale.z = 1 + Math.sin(t * 24) * 0.3;
      plumeRef.current.scale.x = 1 + Math.cos(t * 18) * 0.15;
    }
    if (coreGlowRef.current) {
      coreGlowRef.current.rotation.z += 0.05;
    }
  });

  return (
    <group position={[0, 0.85, 0]}>
      {/* Sleek Fuselage Body (Aligned along Z axis, Nose pointing at -Z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.62, 3.2, 16]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Aerodynamic Nose Cone (-Z Forward) */}
      <mesh position={[0, 0, -2.1]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.48, 1.1, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.6} roughness={0.15} />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.32, -0.6]} castShadow>
        <boxGeometry args={[0.45, 0.3, 1.1]} />
        <meshPhysicalMaterial
          color="#0284c7"
          metalness={0.9}
          roughness={0.05}
          transmission={0.7}
          thickness={0.5}
        />
      </mesh>

      {/* Delta Stabilizer Fins */}
      {[-0.68, 0.68].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.8]} rotation={[0, 0, (i === 0 ? -1 : 1) * 0.4]} castShadow>
          <boxGeometry args={[0.65, 0.06, 1.1]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* Top Vertical Fin */}
      <mesh position={[0, 0.62, 0.8]} castShadow>
        <boxGeometry args={[0.06, 0.65, 1.0]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Plasma Thruster Plume (+Z Backwards) */}
      <mesh ref={plumeRef} position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.38, 1.4, 12]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ef4444"
          emissiveIntensity={5.0}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Rotating Core Energy Ring */}
      <mesh ref={coreGlowRef} position={[0, 0, 0.2]}>
        <torusGeometry args={[0.68, 0.04, 8, 20]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3.5} />
      </mesh>

      <pointLight position={[0, 0, 2.0]} color="#f97316" intensity={3.5} distance={6} />
    </group>
  );
}

// ============================================================
// Main Vehicle Component
// ============================================================
export default function Vehicle({ vehicleType }: VehicleProps) {
  const colorMap: Record<VehicleType, string> = {
    car: '#6366f1',
    bike: '#10b981',
    horse: '#d97706',
    rocket: '#ef4444',
  };
  const color = colorMap[vehicleType] ?? '#6366f1';

  return (
    <group>
      {vehicleType === 'car'    && <CarVehicle    color={color} />}
      {vehicleType === 'bike'   && <BikeVehicle   color={color} />}
      {vehicleType === 'horse'  && <HorseVehicle  color={color} />}
      {vehicleType === 'rocket' && <RocketVehicle color={color} />}
    </group>
  );
}

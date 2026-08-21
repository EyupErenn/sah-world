'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { VehicleType } from '@/types';
import { getTerrainHeight, isRoadSurface, WORLD_BOUNDS } from '@/lib/villageData';
import type { VillageTier } from '@/lib/growth';
import VehicleModelAsset from './VehicleModelAsset';

interface FreeVehicleProps {
  vehicleType: VehicleType;
  isInputBlocked: boolean;
  villageTier: VillageTier;
  touchInput?: { steer: number; throttle: number };
  onUpdateState: (x: number, y: number, z: number, heading: number, speed: number) => void;
  debugTeleport?: { x: number; z: number; sequence: number } | null;
  vehicleRef?: React.RefObject<THREE.Group | null>;
}
function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();
  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function FreeVehicle({ vehicleType, isInputBlocked, villageTier, touchInput, onUpdateState, debugTeleport, vehicleRef }: FreeVehicleProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const shadowTexture = useMemo(() => typeof window === 'undefined' ? null : createContactShadowTexture(), []);

  const posRef = useRef({ x: 0, z: 0 });
  const headingRef = useRef(0);
  const speedRef = useRef(0);
  const steerInputRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);
  const suspensionRef = useRef({ fl: 0, fr: 0, rl: 0, rr: 0 });
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displaySteer, setDisplaySteer] = useState(0);
  const [displaySuspension, setDisplaySuspension] = useState({ fl: 0, fr: 0, rl: 0, rr: 0 });
  const displayFrameCount = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!debugTeleport || process.env.NODE_ENV !== 'development') return;
    posRef.current = { x: debugTeleport.x, z: debugTeleport.z };
    headingRef.current = 0;
    speedRef.current = 0;
  }, [debugTeleport]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isInputBlocked) keysRef.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => { keysRef.current[event.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInputBlocked]);

  useFrame((_, delta) => {
    const root = rootGroupRef.current;
    const body = bodyGroupRef.current;
    if (!root || !body) return;
    if (vehicleRef && vehicleRef.current !== root) (vehicleRef as React.MutableRefObject<THREE.Group | null>).current = root;

    const dt = Math.min(delta, 0.1);
    const keys = isInputBlocked ? {} : keysRef.current;
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
    forwardInput = THREE.MathUtils.clamp(forwardInput, -1, 1);
    steerInput = THREE.MathUtils.clamp(steerInput, -1, 1);
    steerInputRef.current = steerInput;

    const onRoad = isRoadSurface(posRef.current.x, posRef.current.z, villageTier);
    const maxSpeed = onRoad ? 21 : 14;
    const maxReverse = -6.5;
    const accelRate = onRoad ? 24 : 16;
    const brakeRate = 34;
    const drag = onRoad ? 0.94 : 0.86;
    let speed = speedRef.current;
    let accelForce = 0;
    if (forwardInput > 0) {
      accelForce = accelRate * forwardInput;
      speed = Math.min(maxSpeed, speed + accelForce * dt);
    } else if (forwardInput < 0) {
      if (speed > 0) {
        accelForce = -brakeRate;
        speed -= brakeRate * dt;
      } else {
        accelForce = accelRate * forwardInput;
        speed = Math.max(maxReverse, speed + accelRate * forwardInput * dt);
      }
    } else {
      speed *= Math.pow(drag, dt * 60);
      if (Math.abs(speed) < 0.04) speed = 0;
    }
    speedRef.current = speed;

    if (Math.abs(speed) > 0.08 && steerInput !== 0) {
      const turnMultiplier = Math.min(1, Math.abs(speed) / 3.8) * Math.sign(speed);
      headingRef.current += steerInput * 2.9 * turnMultiplier * dt;
    }
    const heading = headingRef.current;
    posRef.current.x += -Math.sin(heading) * speed * dt;
    posRef.current.z += -Math.cos(heading) * speed * dt;

    const bound = WORLD_BOUNDS - 2;
    if (posRef.current.x > bound) { posRef.current.x = bound; speedRef.current *= -0.25; }
    if (posRef.current.x < -bound) { posRef.current.x = -bound; speedRef.current *= -0.25; }
    if (posRef.current.z > bound) { posRef.current.z = bound; speedRef.current *= -0.25; }
    if (posRef.current.z < -bound) { posRef.current.z = -bound; speedRef.current *= -0.25; }

    const x = posRef.current.x;
    const z = posRef.current.z;
    const y = getTerrainHeight(x, z);
    const lookDistance = 1.6;
    const yAhead = getTerrainHeight(x - Math.sin(heading) * lookDistance, z - Math.cos(heading) * lookDistance);
    const yBehind = getTerrainHeight(x + Math.sin(heading) * lookDistance, z + Math.cos(heading) * lookDistance);
    const terrainPitch = Math.atan2(yAhead - yBehind, lookDistance * 2);
    const accelPitchDelta = -(accelForce / 35) * 0.08;
    const targetPitch = terrainPitch + accelPitchDelta;
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, 0.18);
    const targetRoll = -steerInput * (speed / maxSpeed) * 0.16;
    rollRef.current = THREE.MathUtils.lerp(rollRef.current, targetRoll, 0.15);
    suspensionRef.current.fl = THREE.MathUtils.lerp(suspensionRef.current.fl, -accelPitchDelta * 0.4 + targetRoll * 0.3, 0.2);
    suspensionRef.current.fr = THREE.MathUtils.lerp(suspensionRef.current.fr, -accelPitchDelta * 0.4 - targetRoll * 0.3, 0.2);
    suspensionRef.current.rl = THREE.MathUtils.lerp(suspensionRef.current.rl, accelPitchDelta * 0.4 + targetRoll * 0.3, 0.2);
    suspensionRef.current.rr = THREE.MathUtils.lerp(suspensionRef.current.rr, accelPitchDelta * 0.4 - targetRoll * 0.3, 0.2);

    root.position.set(x, y + 0.04, z);
    root.rotation.set(0, heading, 0);
    body.rotation.set(pitchRef.current, 0, rollRef.current, 'YXZ');
    if (shadowMeshRef.current) {
      const shadowScale = 1 + Math.abs(speed / maxSpeed) * 0.15;
      shadowMeshRef.current.scale.set(shadowScale, shadowScale, 1);
    }
    onUpdateState(x, y, z, heading, speed);
    displayFrameCount.current += 1;
    if (displayFrameCount.current % 4 === 0) {
      setDisplaySpeed(speed);
      setDisplaySteer(steerInputRef.current);
      setDisplaySuspension({ ...suspensionRef.current });
    }
  });

  const colorMap: Record<VehicleType, string> = { car: '#6366f1', bike: '#10b981', horse: '#d97706', rocket: '#ef4444' };
  const color = colorMap[vehicleType];
  return (
    <group ref={rootGroupRef}>
      <mesh ref={shadowMeshRef} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[3.1, 5]} />
        {shadowTexture ? <meshBasicMaterial map={shadowTexture} transparent opacity={0.65} depthWrite={false} /> : <meshBasicMaterial color="#000000" transparent opacity={0.4} />}
      </mesh>
      <group ref={bodyGroupRef}>
        <VehicleModelAsset vehicleType={vehicleType} color={color} speed={displaySpeed} steerAngle={displaySteer * 0.45} suspensionFL={displaySuspension.fl} suspensionFR={displaySuspension.fr} suspensionRL={displaySuspension.rl} suspensionRR={displaySuspension.rr} />
        <group position={[0, 0.05, 1.8]} visible={Math.abs(displaySpeed) > 2.5}><Sparkles count={14} scale={[1.4, 0.5, 2.2]} size={1.9} speed={0.9} color="#94a3b8" opacity={0.55} /></group>
      </group>
    </group>
  );
}

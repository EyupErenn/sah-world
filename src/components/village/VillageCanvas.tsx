'use client';

import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { VehicleType } from '@/types';

import VillageTerrain from './VillageTerrain';
import VillageBuildings from './VillageBuildings';
import FreeVehicle from './FreeVehicle';
import VillageCamera from './VillageCamera';

interface VillageCanvasProps {
  vehicleType: VehicleType;
  activeBuildingId: number | null;
  xp: number;
  isInputBlocked: boolean;
  touchInput?: { steer: number; throttle: number };
  onPlayerUpdate: (x: number, y: number, z: number, heading: number, speed: number) => void;
}

export default function VillageCanvas({
  vehicleType,
  activeBuildingId,
  xp,
  isInputBlocked,
  touchInput,
  onPlayerUpdate,
}: VillageCanvasProps) {
  const [dpr, setDpr] = useState(1.5);
  const [vehicleState, setVehicleState] = useState({
    x: 0,
    y: 0.1,
    z: 0,
    heading: 0,
    speed: 0,
  });

  const handleVehicleUpdate = (x: number, y: number, z: number, heading: number, speed: number) => {
    setVehicleState({ x, y, z, heading, speed });
    onPlayerUpdate(x, y, z, heading, speed);
  };

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.32,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        // Explicitly use PCFShadowMap (PCFSoftShadowMap deprecated in r185)
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
      camera={{ fov: 46, near: 0.1, far: 500, position: [0, 6, 12] }}
      dpr={dpr}
      style={{ width: '100%', height: '100%' }}
    >
      <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(1.0)} />
      <AdaptiveDpr pixelated />

      {/* ============ RICH WARM/COOL CHIAROSCURO LIGHTING (Bruno Simon Craft) ============ */}
      {/* Primary Warm Sunlight */}
      <directionalLight
        position={[48, 78, 32]}
        intensity={2.2}
        color="#fff7ed"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={280}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0003}
        shadow-radius={2.5}
      />

      {/* Cool Sky / Rich Earth Hemisphere Fill */}
      <hemisphereLight args={['#bae6fd', '#064e3b', 0.75]} />

      {/* Cool Violet Rim / Contrast Light */}
      <directionalLight position={[-40, 28, -40]} intensity={0.55} color="#818cf8" />

      {/* Soft Ambient Balance */}
      <ambientLight intensity={0.25} color="#f8fafc" />

      {/* Atmospheric Sky, Subtle Stars & Cinematic Depth Fog */}
      <Sky sunPosition={[48, 78, 32]} rayleigh={0.3} turbidity={3.8} mieCoefficient={0.004} mieDirectionalG={0.84} />
      <Stars radius={240} depth={50} count={950} factor={2.6} saturation={0.4} fade speed={0.2} />
      <fog attach="fog" args={['#090d16', 55, 300]} />

      <Suspense fallback={null}>
        {/* Dynamic 3rd Person Follow Camera */}
        <VillageCamera vehicleState={vehicleState} />

        {/* 3D Village World Terrain & Scenery */}
        <VillageTerrain />
        <VillageBuildings activeBuildingId={activeBuildingId} xp={xp} />

        {/* Player-Controlled Physics Vehicle */}
        <FreeVehicle
          vehicleType={vehicleType}
          isInputBlocked={isInputBlocked}
          touchInput={touchInput}
          onUpdateState={handleVehicleUpdate}
        />
      </Suspense>

      {/* ============ POST-PROCESSING WITH TUNED BLOOM & VIGNETTE ============ */}
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.62} luminanceSmoothing={0.22} intensity={0.58} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.42} />
      </EffectComposer>
    </Canvas>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars, AdaptiveDpr, PerformanceMonitor, GradientTexture } from '@react-three/drei';
import { EffectComposer, Bloom, HueSaturation, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { VehicleType } from '@/types';
import { WORLD_COLORS } from '@/lib/designTokens';

import VillageTerrain from './VillageTerrain';
import VillageBuildings from './VillageBuildings';
import FreeVehicle from './FreeVehicle';
import VillageCamera from './VillageCamera';

function JourneySky() {
  return (
    <mesh scale={560} renderOrder={-1000}>
      <sphereGeometry args={[1, 32, 20]} />
      <meshBasicMaterial side={THREE.BackSide} depthWrite={false} fog={false}>
        <GradientTexture
          stops={[0, 0.42, 1]}
          colors={[WORLD_COLORS.skyHorizon, '#9da8dc', WORLD_COLORS.skyZenith]}
          size={1024}
        />
      </meshBasicMaterial>
    </mesh>
  );
}

function CinematicEffects() {
  const width = useThree(state => state.size.width);

  // Mobile GPUs are especially likely to recycle the WebGL context during an
  // orientation/viewport change. The lighting, fog and emissive materials stay
  // intact; the expensive composer is reserved for stable larger viewports.
  if (width < 640) return null;

  return (
    <EffectComposer multisampling={0}>
      <HueSaturation saturation={0.09} />
      <Bloom luminanceThreshold={0.72} luminanceSmoothing={0.28} intensity={0.48} mipmapBlur />
      <Vignette eskil={false} offset={0.22} darkness={0.34} />
    </EffectComposer>
  );
}

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
      shadows="percentage"
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.24,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        // r185 folds the old PCFSoft mode into PCF; light shadow-radius keeps
        // the penumbra soft without triggering a deprecation warning per frame.
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
      camera={{ fov: 46, near: 0.1, far: 700, position: [0, 6, 12] }}
      dpr={dpr}
      style={{ width: '100%', height: '100%' }}
    >
      <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(1.0)} />
      <AdaptiveDpr pixelated />

      {/* ============ RICH WARM/COOL CHIAROSCURO LIGHTING (Bruno Simon Craft) ============ */}
      {/* Primary Warm Sunlight */}
      <directionalLight
        position={[92, 138, 76]}
        intensity={2.2}
        color={WORLD_COLORS.sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={360}
        shadow-camera-left={-168}
        shadow-camera-right={168}
        shadow-camera-top={168}
        shadow-camera-bottom={-168}
        shadow-bias={-0.0003}
        shadow-radius={2.5}
      />

      {/* Cool Sky / Rich Earth Hemisphere Fill */}
      <hemisphereLight args={[WORLD_COLORS.coolFill, WORLD_COLORS.earthFill, 0.72]} />

      {/* Cool Violet Rim / Contrast Light */}
      <directionalLight position={[-96, 54, -110]} intensity={0.5} color="#818cf8" />

      {/* Soft Ambient Balance */}
      <ambientLight intensity={0.18} color="#eef2ff" />

      {/* Atmospheric Sky, Subtle Stars & Cinematic Depth Fog */}
      <JourneySky />
      <Stars radius={340} depth={80} count={1100} factor={2.6} saturation={0.4} fade speed={0.2} />
      <fogExp2 attach="fog" args={[WORLD_COLORS.fog, 0.0046]} />

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
      <CinematicEffects />
    </Canvas>
  );
}

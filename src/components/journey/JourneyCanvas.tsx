'use client';

import { useRef, forwardRef, useImperativeHandle, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';
import { STATIONS } from '@/lib/constants';
import type { VehicleType } from '@/types';
import { useFrame } from '@react-three/fiber';

import Road from './Road';
import Lighting from './Lighting';
import Environment from './Environment';
import StationMarker from './StationMarker';
import AhiretDeposu from './AhiretDeposu';
import XPOrb from './XPOrb';
import CameraRig, { type CameraRigHandle } from './CameraRig';
import Vehicle from './Vehicle';

// ============================================================
// Vehicle Scene Object — positions vehicle along curve each frame
// ============================================================
interface VehicleSceneObjectProps {
  vehicleType: VehicleType;
  progressRef: React.RefObject<number>;
  vehicleGroupRef: React.RefObject<THREE.Group | null>;
}

function VehicleSceneObject({ vehicleType, progressRef, vehicleGroupRef }: VehicleSceneObjectProps) {
  const internalGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = Math.max(0.0001, Math.min(0.9999, progressRef.current));
    const group = internalGroupRef.current;
    if (!group) return;

    const pos = JOURNEY_CURVE.getPointAt(p);
    group.position.copy(pos);

    const ahead = JOURNEY_CURVE.getPointAt(Math.min(p + 0.002, 0.9999));
    group.lookAt(ahead);

    // Sync to parent ref for camera
    if (vehicleGroupRef.current) {
      vehicleGroupRef.current.position.copy(group.position);
      vehicleGroupRef.current.quaternion.copy(group.quaternion);
    }
  });

  return (
    <group ref={internalGroupRef}>
      <Vehicle vehicleType={vehicleType} />
    </group>
  );
}

// ============================================================
// Main Inner Scene (inside Canvas)
// ============================================================
interface SceneProps {
  vehicleType: VehicleType;
  progressRef: React.RefObject<number>;
  vehicleGroupRef: React.RefObject<THREE.Group | null>;
  activeStationId: number | null;
  xp: number;
  orbTrigger: number;
  currentProgress: number;
}

function Scene({
  vehicleType, progressRef, vehicleGroupRef,
  activeStationId, xp, orbTrigger, currentProgress
}: SceneProps) {
  const [orbs, setOrbs] = useState<{ id: number; startProgress: number }[]>([]);
  const prevOrbTrigger = useRef(0);

  useEffect(() => {
    if (orbTrigger > prevOrbTrigger.current) {
      prevOrbTrigger.current = orbTrigger;
      setOrbs(prev => [...prev, { id: Date.now(), startProgress: currentProgress }]);
    }
  }, [orbTrigger, currentProgress]);

  // Station side offsets (placed gracefully beside the road)
  const stationPositions = STATIONS
    .filter(s => s.id >= 1 && s.id <= 7)
    .map(s => {
      const pos = JOURNEY_CURVE.getPointAt(s.progress);
      const tangent = JOURNEY_CURVE.getTangentAt(s.progress).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      pos.add(normal.multiplyScalar(7.5));
      return { station: s, position: pos.clone() };
    });

  const depotPos = JOURNEY_CURVE.getPointAt(1.0);
  depotPos.y += 0.5;

  return (
    <>
      <Lighting />
      <Environment />
      <Road />

      <Sky
        sunPosition={[40, 60, 30]}
        rayleigh={0.4}
        turbidity={6}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={250} depth={60} count={1200} factor={3} saturation={0.3} fade speed={0.3} />
      <fog attach="fog" args={['#e0f2fe', 80, 400]} />

      <VehicleSceneObject
        vehicleType={vehicleType}
        progressRef={progressRef}
        vehicleGroupRef={vehicleGroupRef}
      />

      {stationPositions.map(({ station, position }) => (
        <StationMarker
          key={station.id}
          station={station}
          position={position}
          isActive={activeStationId === station.id}
        />
      ))}

      <AhiretDeposu position={new THREE.Vector3(depotPos.x, depotPos.y, depotPos.z)} xp={xp} />

      {/* Flying XP Orbs */}
      {orbs.map(orb => (
        <XPOrb
          key={orb.id}
          startProgress={orb.startProgress}
          onComplete={() => setOrbs(prev => prev.filter(o => o.id !== orb.id))}
        />
      ))}

      <EffectComposer multisampling={4}>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.1}
          intensity={0.6}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.35} />
      </EffectComposer>
    </>
  );
}

// ============================================================
// JourneyCanvas (exported — wraps R3F Canvas)
// ============================================================
export interface JourneyCanvasHandle {
  setProgress: (p: number) => void;
}

interface JourneyCanvasProps {
  vehicleType: VehicleType;
  activeStationId: number | null;
  xp: number;
  orbTrigger: number;
  currentProgress: number;
}

const JourneyCanvas = forwardRef<JourneyCanvasHandle, JourneyCanvasProps>(
  function JourneyCanvas({ vehicleType, activeStationId, xp, orbTrigger, currentProgress }, ref) {
    const progressRef = useRef(0);
    const vehicleGroupRef = useRef<THREE.Group>(null);
    const cameraRigRef = useRef<CameraRigHandle>(null);

    useImperativeHandle(ref, () => ({
      setProgress: (p: number) => {
        progressRef.current = p;
        cameraRigRef.current?.setProgress(p);
      },
    }));

    return (
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 45, near: 0.1, far: 800, position: [0, 6, -12] }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <PerformanceMonitor>
          <AdaptiveDpr pixelated />
        </PerformanceMonitor>

        <CameraRig ref={cameraRigRef} vehicleGroupRef={vehicleGroupRef} />

        <Suspense fallback={null}>
          <Scene
            vehicleType={vehicleType}
            progressRef={progressRef}
            vehicleGroupRef={vehicleGroupRef}
            activeStationId={activeStationId}
            xp={xp}
            orbTrigger={orbTrigger}
            currentProgress={currentProgress}
          />
        </Suspense>
      </Canvas>
    );
  }
);

export default JourneyCanvas;

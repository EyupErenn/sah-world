'use client';

import { useRef, forwardRef, useImperativeHandle, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';
import { STATIONS } from '@/lib/constants';
import type { VehicleType } from '@/types';

import Road from './Road';
import Lighting from './Lighting';
import Environment from './Environment';
import StationMarker from './StationMarker';
import AhiretDeposu from './AhiretDeposu';
import XPOrb from './XPOrb';
import CameraRig, { type CameraRigHandle } from './CameraRig';
import Vehicle from './Vehicle';

// ============================================================
// Vehicle Scene Object — positions & aligns vehicle along the curve
// ============================================================
interface VehicleSceneObjectProps {
  vehicleType: VehicleType;
  progressRef: React.RefObject<number>;
  vehicleGroupRef: React.RefObject<THREE.Group | null>;
}

const _vPos = new THREE.Vector3();
const _vAhead = new THREE.Vector3();

function VehicleSceneObject({ vehicleType, progressRef, vehicleGroupRef }: VehicleSceneObjectProps) {
  const internalGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = Math.max(0.0001, Math.min(0.9999, progressRef.current));
    const group = internalGroupRef.current;
    if (!group) return;

    // Attach to shared ref for CameraRig
    if (vehicleGroupRef && vehicleGroupRef.current !== group) {
      (vehicleGroupRef as React.MutableRefObject<THREE.Group | null>).current = group;
    }

    const pos = JOURNEY_CURVE.getPointAt(p);
    _vPos.set(pos.x, pos.y + 0.08, pos.z);
    group.position.copy(_vPos);

    // Look ahead in direction of travel (-Z is forward for vehicles)
    const ahead = JOURNEY_CURVE.getPointAt(Math.min(p + 0.0025, 0.9999));
    _vAhead.set(ahead.x, ahead.y + 0.08, ahead.z);
    group.lookAt(_vAhead);
  });

  return (
    <group ref={internalGroupRef}>
      <Vehicle vehicleType={vehicleType} />
    </group>
  );
}

// ============================================================
// Main Inner Scene
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
  vehicleType,
  progressRef,
  vehicleGroupRef,
  activeStationId,
  xp,
  orbTrigger,
  currentProgress,
}: SceneProps) {
  const [orbs, setOrbs] = useState<{ id: number; startProgress: number }[]>([]);
  const prevOrbTrigger = useRef(0);

  useEffect(() => {
    if (orbTrigger > prevOrbTrigger.current) {
      prevOrbTrigger.current = orbTrigger;
      setOrbs(prev => [...prev, { id: Date.now(), startProgress: currentProgress }]);
    }
  }, [orbTrigger, currentProgress]);

  // Station positions slightly off to the side of the road
  const stationPositions = useMemo(() => {
    return STATIONS.filter(s => s.id >= 1 && s.id <= 7).map(s => {
      const pos = JOURNEY_CURVE.getPointAt(s.progress);
      const tangent = JOURNEY_CURVE.getTangentAt(s.progress).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      pos.add(normal.multiplyScalar(7.2));
      return { station: s, position: pos.clone() };
    });
  }, []);

  const depotPos = useMemo(() => {
    const p = JOURNEY_CURVE.getPointAt(1.0);
    p.y += 0.5;
    return p;
  }, []);

  return (
    <>
      <Lighting />
      <Environment />
      <Road />

      {/* Atmospheric Spiritual Twilight Sky */}
      <Sky
        sunPosition={[35, 65, 25]}
        rayleigh={0.35}
        turbidity={4}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />
      <Stars radius={220} depth={50} count={900} factor={2.5} saturation={0.4} fade speed={0.25} />
      <fog attach="fog" args={['#090d16', 50, 360]} />

      {/* Active 3D Vehicle */}
      <VehicleSceneObject
        vehicleType={vehicleType}
        progressRef={progressRef}
        vehicleGroupRef={vehicleGroupRef}
      />

      {/* 3D Station Checkpoint Monuments */}
      {stationPositions.map(({ station, position }) => (
        <StationMarker
          key={station.id}
          station={station}
          position={position}
          isActive={activeStationId === station.id}
        />
      ))}

      {/* Ahiret Deposu Final Celestial Monument */}
      <AhiretDeposu position={depotPos} xp={xp} />

      {/* Flying XP Orbs */}
      {orbs.map(orb => (
        <XPOrb
          key={orb.id}
          startProgress={orb.startProgress}
          onComplete={() => setOrbs(prev => prev.filter(o => o.id !== orb.id))}
        />
      ))}

      {/* High-Performance Post-Processing */}
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.55}
          luminanceSmoothing={0.15}
          intensity={0.65}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.22} darkness={0.38} />
      </EffectComposer>
    </>
  );
}

// ============================================================
// JourneyCanvas
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
    const vehicleGroupRef = useRef<THREE.Group | null>(null);
    const cameraRigRef = useRef<CameraRigHandle>(null);
    const [dpr, setDpr] = useState(1.5);

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
          toneMappingExposure: 1.25,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 45, near: 0.1, far: 600, position: [0, 5, 8] }}
        dpr={dpr}
        style={{ width: '100%', height: '100%' }}
      >
        <PerformanceMonitor
          onIncline={() => setDpr(1.5)}
          onDecline={() => setDpr(1.0)}
        />
        <AdaptiveDpr pixelated />

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

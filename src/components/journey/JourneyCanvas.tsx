'use client';

import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';
import { STATIONS } from '@/lib/constants';
import type { VehicleType } from '@/types';
import { useFrame } from '@react-three/fiber';

import Road from './Road';
import Lighting from './Lighting';
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
  vehicleGroupRef: React.MutableRefObject<THREE.Group>;
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
      <Vehicle vehicleType={vehicleType} scrollProgress={0} />
    </group>
  );
}

// ============================================================
// Ground Plane
// ============================================================
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 220]} receiveShadow>
      <planeGeometry args={[1800, 600]} />
      <meshStandardMaterial
        color="#e8eef5"
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  );
}

// ============================================================
// Ambient Floating Particles (subtle light motes)
// ============================================================
function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 220;
      arr[i * 3 + 1] = Math.random() * 45 + 2;
      arr[i * 3 + 2] = Math.random() * 480;
    }
    return arr;
  });

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c7d2fe" size={0.55} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

// ============================================================
// Main Inner Scene (inside Canvas)
// ============================================================
interface SceneProps {
  vehicleType: VehicleType;
  progressRef: React.RefObject<number>;
  vehicleGroupRef: React.RefObject<THREE.Group>;
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

  // Station side offsets (station marker offset from road center)
  const stationPositions = STATIONS
    .filter(s => s.id >= 1 && s.id <= 7)
    .map(s => {
      const pos = JOURNEY_CURVE.getPointAt(s.progress);
      const tangent = JOURNEY_CURVE.getTangentAt(s.progress).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      pos.add(normal.multiplyScalar(6));
      return { station: s, position: pos.clone() };
    });

  const depotPos = JOURNEY_CURVE.getPointAt(1.0);
  depotPos.y += 0.5;

  return (
    <>
      <Lighting />
      <Road />
      <GroundPlane />
      <AmbientParticles />

      <Sky
        sunPosition={[40, 10, 30]}
        rayleigh={0.35}
        turbidity={7}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={220} depth={55} count={1600} factor={4} saturation={0.4} fade speed={0.4} />
      <fog attach="fog" args={['#e8eef7', 55, 280]} />

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
        <SMAA />
        <Bloom
          luminanceThreshold={0.35}
          luminanceSmoothing={0.08}
          intensity={0.55}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.28} darkness={0.42} />
        <ChromaticAberration offset={[0.0003, 0.0003] as any} />
        <Noise opacity={0.022} />
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
    const vehicleGroupRef = useRef(new THREE.Group());
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
          toneMappingExposure: 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 48, near: 0.1, far: 700, position: [0, 6, -12] }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <PerformanceMonitor>
          <AdaptiveDpr pixelated />
        </PerformanceMonitor>

        <CameraRig ref={cameraRigRef} vehicleGroupRef={vehicleGroupRef} />

        <Scene
          vehicleType={vehicleType}
          progressRef={progressRef}
          vehicleGroupRef={vehicleGroupRef}
          activeStationId={activeStationId}
          xp={xp}
          orbTrigger={orbTrigger}
          currentProgress={currentProgress}
        />
      </Canvas>
    );
  }
);

export default JourneyCanvas;

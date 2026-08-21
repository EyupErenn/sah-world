'use client';

import { Component, Suspense, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { VehicleType } from '@/types';

const VEHICLE_MODELS: Record<VehicleType, string> = {
  car: '/models/vehicles/sedan.glb',
  bike: '/models/vehicles/hatchback-sports.glb',
  horse: '/models/vehicles/tractor.glb',
  rocket: '/models/vehicles/sedan-sports.glb',
};

Object.values(VEHICLE_MODELS).forEach(url => useGLTF.preload(url));

interface VehicleModelAssetProps {
  vehicleType: VehicleType;
  color: string;
  speed: number;
  steerAngle: number;
  suspensionFL: number;
  suspensionFR: number;
  suspensionRL: number;
  suspensionRR: number;
}

class VehicleAssetBoundary extends Component<{ url: string; children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[SAH World] Vehicle model could not be loaded: ${this.props.url}. Using a placeholder.`, error, info.componentStack);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function VehiclePlaceholder({ color }: { color: string }) {
  return <mesh position={[0, 0.65, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 0.8, 3.6]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>;
}

function LoadedVehicleModel({ url, modelScale, color, speed, steerAngle, suspensionFL, suspensionFR, suspensionRL, suspensionRR }: Omit<VehicleModelAssetProps, 'vehicleType'> & { url: string; modelScale: number }) {
  const { scene } = useGLTF(url);
  const wheelSpin = useRef(0);
  const { clone, wheels, baseY } = useMemo(() => {
    const next = scene.clone(true);
    next.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const source = Array.isArray(child.material) ? child.material : [child.material];
      const materials = source.map(material => {
        const cloned = material.clone();
        if ('color' in cloned && cloned.color instanceof THREE.Color) cloned.color.lerp(new THREE.Color(color), 0.2);
        return cloned;
      });
      child.material = Array.isArray(child.material) ? materials : materials[0];
    });
    const named = {
      fl: next.getObjectByName('wheel-front-left'),
      fr: next.getObjectByName('wheel-front-right'),
      rl: next.getObjectByName('wheel-back-left'),
      rr: next.getObjectByName('wheel-back-right'),
    };
    return { clone: next, wheels: named, baseY: { fl: named.fl?.position.y ?? 0, fr: named.fr?.position.y ?? 0, rl: named.rl?.position.y ?? 0, rr: named.rr?.position.y ?? 0 } };
  }, [color, scene]);

  useFrame((_, delta) => {
    wheelSpin.current += -speed * delta * 1.8;
    const entries: Array<[keyof typeof wheels, number, boolean]> = [
      ['fl', suspensionFL, true], ['fr', suspensionFR, true], ['rl', suspensionRL, false], ['rr', suspensionRR, false],
    ];
    entries.forEach(([key, suspension, front]) => {
      const wheel = wheels[key];
      if (!wheel) return;
      wheel.position.y = baseY[key] + suspension * 0.18;
      wheel.rotation.order = 'YXZ';
      wheel.rotation.y = front ? steerAngle : 0;
      wheel.rotation.x = wheelSpin.current;
    });
  });

  return (
    <group position={[0, 0.08, 0]} rotation={[0, Math.PI, 0]} scale={modelScale}>
      <primitive object={clone} dispose={null} />
    </group>
  );
}

export default function VehicleModelAsset(props: VehicleModelAssetProps) {
  const { vehicleType, ...visualProps } = props;
  const url = VEHICLE_MODELS[vehicleType];
  const modelScale = vehicleType === 'horse' ? 1.55 : vehicleType === 'bike' ? 2.3 : vehicleType === 'rocket' ? 2.15 : 2.25;
  const fallback = <VehiclePlaceholder color={props.color} />;
  return (
    <group>
      <VehicleAssetBoundary url={url} fallback={fallback}>
        <Suspense fallback={fallback}>
          <LoadedVehicleModel url={url} modelScale={modelScale} {...visualProps} />
        </Suspense>
      </VehicleAssetBoundary>
      <pointLight position={[-0.65, 0.55, -1.9]} color="#fff7d6" intensity={1.6} distance={9} decay={2} />
      <pointLight position={[0.65, 0.55, -1.9]} color="#fff7d6" intensity={1.6} distance={9} decay={2} />
    </group>
  );
}

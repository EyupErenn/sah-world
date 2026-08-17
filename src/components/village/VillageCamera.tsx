'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from '@/lib/villageData';

interface VillageCameraProps {
  vehicleState: { x: number; y: number; z: number; heading: number; speed: number };
}

const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();

export default function VillageCamera({ vehicleState }: VillageCameraProps) {
  const { camera } = useThree();
  const isInitRef = useRef(false);

  useFrame((_, delta) => {
    const { x, y, z, heading, speed } = vehicleState;

    // Dynamic distance & height based on speed
    const speedFactor = Math.min(1.0, Math.abs(speed) / 20.0);
    const dist = 7.8 + speedFactor * 1.5;
    const height = 3.6 + speedFactor * 0.6;

    // Calculate position behind vehicle (+Z local is behind, -Z is forward)
    const offX = Math.sin(heading) * dist;
    const offZ = Math.cos(heading) * dist;

    let targetCamY = y + height;
    // Terrain collision avoidance
    const terrainUnderCam = getTerrainHeight(x + offX, z + offZ);
    targetCamY = Math.max(targetCamY, terrainUnderCam + 1.8);

    _camTargetPos.set(x + offX, targetCamY, z + offZ);

    // Look ahead of vehicle
    const lookAheadDist = 4.2 + speedFactor * 2.0;
    _camLookTarget.set(
      x - Math.sin(heading) * lookAheadDist,
      y + 1.2,
      z - Math.cos(heading) * lookAheadDist
    );

    if (!isInitRef.current) {
      camera.position.copy(_camTargetPos);
      _currentLookAt.copy(_camLookTarget);
      camera.lookAt(_currentLookAt);
      isInitRef.current = true;
    } else {
      // Spring-lerp damping
      const lerpSpeed = 7.5;
      const factor = 1 - Math.exp(-lerpSpeed * delta);

      camera.position.lerp(_camTargetPos, factor);
      _currentLookAt.lerp(_camLookTarget, factor * 1.2);
      camera.lookAt(_currentLookAt);
    }
  });

  return null;
}

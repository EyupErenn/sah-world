'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// CameraRig — Cinematic 3rd-Person Dynamic Chase Camera
// ============================================================

export interface CameraRigHandle {
  setProgress: (p: number) => void;
}

interface CameraRigProps {
  vehicleGroupRef: React.RefObject<THREE.Group | null>;
}

// Vehicle faces local -Z.
// Chase camera sits behind (+Z) and above (+Y), looking ahead (-Z).
const CHASE_OFFSET   = new THREE.Vector3(0, 3.4, 7.6);
const LOOK_OFFSET    = new THREE.Vector3(0, 1.2, -4.5);
const ORBIT_RADIUS   = 22;
const LERP_FACTOR    = 0.085;

const _tmpVehiclePos  = new THREE.Vector3();
const _tmpTargetCam   = new THREE.Vector3();
const _tmpLookAt      = new THREE.Vector3();
const _tmpRotatedOff  = new THREE.Vector3();
const _tmpRotatedLook = new THREE.Vector3();

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig({ vehicleGroupRef }, ref) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const orbitTimeRef = useRef(0);
  const isInitializedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    setProgress: (p: number) => {
      progressRef.current = Math.max(0, Math.min(1, p));
    },
  }));

  useFrame((_, delta) => {
    const p = progressRef.current;
    const vehicle = vehicleGroupRef.current;
    if (!vehicle) return;

    vehicle.getWorldPosition(_tmpVehiclePos);

    if (p >= 0.97) {
      // === Ahiret Deposu Grand Orbit Mode ===
      orbitTimeRef.current += delta * 0.45;
      const endPos = JOURNEY_CURVE.getPointAt(1.0);
      const orbitX = endPos.x + Math.sin(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitZ = endPos.z + Math.cos(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitY = endPos.y + 11;

      camera.position.lerp(new THREE.Vector3(orbitX, orbitY, orbitZ), LERP_FACTOR);
      _tmpLookAt.set(endPos.x, endPos.y + 3.2, endPos.z);
      camera.lookAt(_tmpLookAt);
    } else {
      // === 3rd Person Follow Mode ===
      const quat = vehicle.quaternion;

      _tmpRotatedOff.copy(CHASE_OFFSET).applyQuaternion(quat);
      _tmpTargetCam.copy(_tmpVehiclePos).add(_tmpRotatedOff);

      _tmpRotatedLook.copy(LOOK_OFFSET).applyQuaternion(quat);
      _tmpLookAt.copy(_tmpVehiclePos).add(_tmpRotatedLook);

      if (!isInitializedRef.current) {
        camera.position.copy(_tmpTargetCam);
        camera.lookAt(_tmpLookAt);
        isInitializedRef.current = true;
      } else {
        camera.position.lerp(_tmpTargetCam, LERP_FACTOR);
        camera.lookAt(_tmpLookAt);
      }
    }
  });

  return null;
});

export default CameraRig;

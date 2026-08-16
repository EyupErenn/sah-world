'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// CameraRig — Scroll-scrubbed 3rd-person chase camera
// ============================================================
export interface CameraRigHandle {
  setProgress: (p: number) => void;
}

interface CameraRigProps {
  vehicleGroupRef: React.RefObject<THREE.Group>;
}

const CHASE_OFFSET   = new THREE.Vector3(0, 4.5, -9.5);  // behind-above vehicle
const LOOK_OFFSET    = new THREE.Vector3(0, 1.2,  6.0);   // ahead of vehicle
const ORBIT_RADIUS   = 22;                                  // Ahiret Deposu orbit radius
const LERP_FACTOR    = 0.065;                               // Camera damping (higher = snappier)

const tmpVehiclePos  = new THREE.Vector3();
const tmpTargetCam   = new THREE.Vector3();
const tmpLookAt      = new THREE.Vector3();
const tmpRotatedOff  = new THREE.Vector3();
const tmpRotatedLook = new THREE.Vector3();

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig({ vehicleGroupRef }, ref) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const orbitTimeRef = useRef(0);

  useImperativeHandle(ref, () => ({
    setProgress: (p: number) => { progressRef.current = p; },
  }));

  useFrame((_, delta) => {
    const p = progressRef.current;
    const vehicle = vehicleGroupRef.current;
    if (!vehicle) return;

    vehicle.getWorldPosition(tmpVehiclePos);

    if (p > 0.97) {
      // === Ahiret Deposu Orbit Camera ===
      orbitTimeRef.current += delta * 0.35;
      const endPos = JOURNEY_CURVE.getPointAt(1.0);
      const orbitX = endPos.x + Math.sin(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitZ = endPos.z + Math.cos(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitY = endPos.y + 11;

      camera.position.lerp(new THREE.Vector3(orbitX, orbitY, orbitZ), LERP_FACTOR);
      tmpLookAt.set(endPos.x, endPos.y + 4, endPos.z);
      camera.lookAt(tmpLookAt);
    } else {
      // === 3rd Person Chase Camera ===
      const quat = vehicle.quaternion;

      // Rotate offset by vehicle orientation
      tmpRotatedOff.copy(CHASE_OFFSET).applyQuaternion(quat);
      tmpTargetCam.copy(tmpVehiclePos).add(tmpRotatedOff);

      // Smooth camera lerp
      camera.position.lerp(tmpTargetCam, LERP_FACTOR);

      // Look-ahead point
      tmpRotatedLook.copy(LOOK_OFFSET).applyQuaternion(quat);
      tmpLookAt.copy(tmpVehiclePos).add(tmpRotatedLook);
      camera.lookAt(tmpLookAt);
    }
  });

  return null;
});

export default CameraRig;

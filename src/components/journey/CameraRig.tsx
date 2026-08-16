'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { JOURNEY_CURVE } from '@/lib/curve';

// ============================================================
// CameraRig — Dynamic 3rd-person chase camera for the journey
// ============================================================
export interface CameraRigHandle {
  setProgress: (p: number) => void;
}

interface CameraRigProps {
  vehicleGroupRef: React.RefObject<THREE.Group | null>;
}

// Framing: Camera sits slightly behind and above, looking forward down the track
const CHASE_OFFSET   = new THREE.Vector3(0, 3.2, -7.2);   // Behind & elevated
const LOOK_OFFSET    = new THREE.Vector3(0, 1.2,  4.0);   // Ahead along road
const ORBIT_RADIUS   = 24;                                // Ahiret Deposu orbit radius
const LERP_FACTOR    = 0.085;                             // Smooth chase interpolation

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
      // === Ahiret Deposu Orbit Mode ===
      orbitTimeRef.current += delta * 0.4;
      const endPos = JOURNEY_CURVE.getPointAt(1.0);
      const orbitX = endPos.x + Math.sin(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitZ = endPos.z + Math.cos(orbitTimeRef.current) * ORBIT_RADIUS;
      const orbitY = endPos.y + 12;

      camera.position.lerp(new THREE.Vector3(orbitX, orbitY, orbitZ), LERP_FACTOR);
      tmpLookAt.set(endPos.x, endPos.y + 3.5, endPos.z);
      camera.lookAt(tmpLookAt);
    } else {
      // === 3rd Person Follow Mode ===
      const quat = vehicle.quaternion;

      // Rotate camera offset with vehicle rotation
      tmpRotatedOff.copy(CHASE_OFFSET).applyQuaternion(quat);
      tmpTargetCam.copy(tmpVehiclePos).add(tmpRotatedOff);

      camera.position.lerp(tmpTargetCam, LERP_FACTOR);

      // Target look-ahead position
      tmpRotatedLook.copy(LOOK_OFFSET).applyQuaternion(quat);
      tmpLookAt.copy(tmpVehiclePos).add(tmpRotatedLook);
      camera.lookAt(tmpLookAt);
    }
  });

  return null;
});

export default CameraRig;

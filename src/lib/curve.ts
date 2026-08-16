'use client';
// lib/curve.ts — Client-only. Contains Three.js CatmullRomCurve3 singleton.
// Import only from client components (inside Canvas or 'use client' files).

import * as THREE from 'three';
import { CURVE_POINTS } from './constants';

let _curve: THREE.CatmullRomCurve3 | null = null;

export function getJourneyCurve(): THREE.CatmullRomCurve3 {
  if (!_curve) {
    _curve = new THREE.CatmullRomCurve3(
      CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'catmullrom',
      0.25
    );
  }
  return _curve;
}

// Convenience export — same singleton
export const JOURNEY_CURVE = getJourneyCurve();

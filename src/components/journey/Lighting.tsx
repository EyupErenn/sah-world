'use client';

// ============================================================
// Lighting Setup — 3-point lighting system for premium feel
// Sun (DirectionalLight w/ shadow) + Sky Fill (HemisphereLight) + Rim
// ============================================================
export default function Lighting() {
  return (
    <>
      {/* === KEY LIGHT (Sun) === */}
      {/* Warm directional sunlight from upper-right, casting soft shadows */}
      <directionalLight
        position={[40, 75, 30]}
        intensity={1.85}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.001}
      />

      {/* === FILL LIGHT (Sky / Hemisphere) === */}
      {/* Cool blue sky reflection bouncing off ground — fills shadow areas */}
      <hemisphereLight
        args={['#dde8ff', '#f0e8d8', 0.58]}
      />

      {/* === RIM LIGHT (Back/Accent) === */}
      {/* Subtle indigo rim from behind-left for silhouette definition */}
      <directionalLight
        position={[-35, 22, -35]}
        intensity={0.28}
        color="#c7d2fe"
      />

      {/* === AMBIENT BASE (very subtle so shadows remain readable) === */}
      <ambientLight intensity={0.12} color="#f8fafc" />
    </>
  );
}

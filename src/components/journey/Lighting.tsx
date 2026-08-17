'use client';

// ============================================================
// Cinematic Lighting System — Optimized for Spiritual Aesthetics & 60+ FPS
// Sun (DirectionalLight with tight shadow frustum) + Sky Fill + Rim
// ============================================================

export default function Lighting() {
  return (
    <>
      {/* === KEY CELESTIAL SUNLIGHT === */}
      <directionalLight
        position={[35, 65, 25]}
        intensity={1.75}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={250}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />

      {/* === HEMISPHERE LIGHT (Sky & Earth Bounce) === */}
      <hemisphereLight
        args={['#c7d2fe', '#064e3b', 0.65]}
      />

      {/* === SPIRITUAL INDIGO RIM LIGHT === */}
      <directionalLight
        position={[-30, 20, -30]}
        intensity={0.4}
        color="#818cf8"
      />

      {/* === AMBIENT LIGHT === */}
      <ambientLight intensity={0.18} color="#f1f5f9" />
    </>
  );
}

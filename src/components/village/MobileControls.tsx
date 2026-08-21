'use client';

import { useState, useRef, useEffect } from 'react';

interface MobileControlsProps {
  onInputChange: (input: { steer: number; throttle: number }) => void;
}

export default function MobileControls({ onInputChange }: MobileControlsProps) {
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  // Gas & Brake button states
  const [isGas, setIsGas] = useState(false);
  const [isBrake, setIsBrake] = useState(false);

  // Update input to parent whenever joystick or buttons change
  useEffect(() => {
    let steer = 0;
    let throttle = 0;

    // From joystick
    if (joystickActive) {
      steer = knobPos.x / 40; // -1 to 1
      throttle = -knobPos.y / 40; // -1 to 1
    }

    // From dedicated buttons
    if (isGas) throttle = 1;
    if (isBrake) throttle = -1;

    onInputChange({
      steer: Math.max(-1, Math.min(1, steer)),
      throttle: Math.max(-1, Math.min(1, throttle)),
    });
  }, [knobPos, joystickActive, isGas, isBrake, onInputChange]);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!baseRef.current) return;
    const touch = e.touches[0];
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 40;

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[800] select-none md:hidden">
      {/* ── Virtual Analog Stick (Bottom-Left) ── */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <div
          ref={baseRef}
          onTouchStart={() => setJoystickActive(true)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-28 h-28 rounded-full glass-panel ring-1 ring-white/10 flex items-center justify-center relative shadow-2xl bg-slate-900/60 backdrop-blur-md"
        >
          {/* Base Center Ring */}
          <div className="w-10 h-10 rounded-full border border-indigo-400/40 bg-indigo-950/40" />

          {/* Movable Thumb Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-white/80 shadow-lg absolute transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* ── Gas & Brake Pedals (Bottom-Right) ── */}
      <div className="absolute bottom-8 right-8 flex items-center gap-3 pointer-events-auto">
        {/* Brake / Reverse Pedal */}
        <button
          onTouchStart={() => setIsBrake(true)}
          onTouchEnd={() => setIsBrake(false)}
          onMouseDown={() => setIsBrake(true)}
          onMouseUp={() => setIsBrake(false)}
          className={`w-16 h-16 rounded-2xl glass-panel ring-1 ring-rose-500/30 flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-90 ${
            isBrake ? 'bg-rose-600/60 text-white scale-95 shadow-lg' : 'bg-slate-900/60 text-rose-300'
          }`}
        >
          <span className="text-lg">🛑</span>
          <span>FREN</span>
        </button>

        {/* Gas / Accelerate Pedal */}
        <button
          onTouchStart={() => setIsGas(true)}
          onTouchEnd={() => setIsGas(false)}
          onMouseDown={() => setIsGas(true)}
          onMouseUp={() => setIsGas(false)}
          className={`w-20 h-20 rounded-2xl glass-panel ring-1 ring-indigo-400/30 flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-90 ${
            isGas ? 'bg-emerald-600/60 border-emerald-400 text-white scale-95 shadow-lg' : 'bg-slate-900/60 text-emerald-300'
          }`}
        >
          <span className="text-2xl">⚡</span>
          <span>GAZ</span>
        </button>
      </div>
    </div>
  );
}

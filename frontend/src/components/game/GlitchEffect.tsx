/**
 * Glitch Effect Component
 * 
 * Epic 14: Screen shake and chromatic aberration on errors
 */

import { useEffect, useState } from 'react';

interface GlitchEffectProps {
  trigger: boolean;
  duration?: number;
}

export const GlitchEffect: React.FC<GlitchEffectProps> = ({
  trigger,
  duration = 500,
}) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      const timer = setTimeout(() => setIsActive(false), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        animation: 'glitch 0.3s',
        mixBlendMode: 'difference',
      }}
    >
      <style>{`
        @keyframes glitch {
          0%, 100% {
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
          10% {
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg);
          }
          20% {
            transform: translate(2px, -2px);
            filter: hue-rotate(180deg);
          }
          30% {
            transform: translate(-2px, -2px);
            filter: hue-rotate(270deg);
          }
          40% {
            transform: translate(2px, 2px);
            filter: hue-rotate(360deg);
          }
          50% {
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg);
          }
          60% {
            transform: translate(2px, -2px);
            filter: hue-rotate(180deg);
          }
          70% {
            transform: translate(-2px, -2px);
            filter: hue-rotate(270deg);
          }
          80% {
            transform: translate(2px, 2px);
            filter: hue-rotate(360deg);
          }
          90% {
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg);
          }
        }
      `}</style>
    </div>
  );
};


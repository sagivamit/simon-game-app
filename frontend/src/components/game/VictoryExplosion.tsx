/**
 * Victory Explosion Component
 * 
 * Epic 14: Neon particle explosion for winner celebration
 */

import { useEffect, useRef } from 'react';

interface VictoryExplosionProps {
  trigger: boolean;
  colors?: string[];
}

export const VictoryExplosion: React.FC<VictoryExplosionProps> = ({
  trigger,
  colors = ['#00ff41', '#ff0040', '#ffeb00', '#00d9ff'], // Epic 11: Neon colors
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Epic 14: Create particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      maxLife: number;
    }> = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create 100 particles
    for (let i = 0; i < 100; i++) {
      const angle = (Math.PI * 2 * i) / 100;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }

    // Epic 14: Animate particles
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        particle.life++;

        const alpha = 1 - particle.life / particle.maxLife;
        const size = 4 * alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Remove dead particles
        if (particle.life >= particle.maxLife) {
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [trigger, colors]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ background: 'transparent' }}
    />
  );
};


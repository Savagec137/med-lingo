import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { BaseSceneEntity } from '../engine/SceneEntity';
import { sceneEngine } from '../engine/SceneEngine';

function bezierPoint(t: number, points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 1) return points[0]!;
  const newPoints = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push({
      x: (1 - t) * points[i]!.x + t * points[i + 1]!.x,
      y: (1 - t) * points[i]!.y + t * points[i + 1]!.y,
    });
  }
  return bezierPoint(t, newPoints);
}

const PATH_POINTS = [
  { x: 0, y: 0 }, { x: 10, y: -5 }, { x: 25, y: -2 }, { x: 40, y: 5 },
  { x: 55, y: 2 }, { x: 70, y: -3 }, { x: 85, y: 0 }, { x: 100, y: 0 }
];

export function Ambulance() {
  const [progress, setProgress] = useState(0);
  const position = useMotionValue({ x: 0, y: 0 });
  const rotation = useMotionValue(0);

  const getPosition = (t: number) => {
    const p = bezierPoint(t, PATH_POINTS);
    return { x: p.x * 4, y: p.y * 4 + 50 };
  };

  const getTangent = (t: number) => {
    const dt = 0.001;
    const p1 = bezierPoint(t, PATH_POINTS);
    const p2 = bezierPoint(t + dt, PATH_POINTS);
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  };

  useEffect(() => {
    const entity = new (class extends BaseSceneEntity {
      private progress = Math.random();
      constructor() { super('ambulance', 'ambulance', { speed: 0.8, priority: 'high', enabled: true }); }
      animate(delta: number, time: number) {
        const curve = Math.sin(this.progress * Math.PI);
        const currentSpeed = 0.04 + (1 - curve) * 0.06;
        this.progress += currentSpeed * delta * 0.5;
        if (this.progress > 1) this.progress = 0;
        const pos = getPosition(this.progress);
        position.set(pos);
        rotation.set(getTangent(this.progress));
        setProgress(this.progress);
      }
    })();
    sceneEngine.register(entity);
    return () => sceneEngine.unregister(entity.id);
  }, []);

  return (
    <motion.div
      className="absolute w-12 h-8"
      style={{
        x: useTransform(position, (p) => p?.x ?? 0),
        y: useTransform(position, (p) => p?.y ?? 0),
        rotate: useTransform(rotation, (r) => (r * 180) / Math.PI),
      }}
    >
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="10" y="20" width="80" height="40" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2" />
        <rect x="20" y="10" width="40" height="20" rx="2" fill="#4fc3f7" stroke="#1a1a2e" strokeWidth="2" />
        <circle cx="25" cy="65" r="10" fill="#1a1a2e" /><circle cx="25" cy="65" r="6" fill="#333" />
        <circle cx="75" cy="65" r="10" fill="#1a1a2e" /><circle cx="75" cy="65" r="6" fill="#333" />
        <motion.circle cx="50" cy="8" r="6" fill="oklch(0.78 0.15 210)" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } }} />
        <rect x="45" y="28" width="10" height="24" fill="#e53935" rx="1" />
        <rect x="38" y="35" width="24" height="10" fill="#e53935" rx="1" />
      </svg>
    </motion.div>
  );
}
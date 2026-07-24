import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { BaseSceneEntity } from '../engine/SceneEntity';
import { sceneEngine } from '../engine/SceneEngine';

interface ParallaxLayerProps {
  depth: number;
  speed: number;
  children: React.ReactNode;
  className?: string;
}

export function ParallaxLayer({ depth, speed, children, className }: ParallaxLayerProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const entityRef = useRef<BaseSceneEntity | null>(null);

  useEffect(() => {
    const entity = new (class extends BaseSceneEntity {
      constructor() {
        super(`parallax-${depth}`, 'parallax', { speed, priority: 'low', enabled: true });
      }
      animate(delta: number, time: number) {
        const movement = Math.sin(time * 0.03 * this.config.speed) * 2 * depth;
        const movementY = Math.cos(time * 0.02 * this.config.speed) * 1 * depth;
        x.set(movement);
        y.set(movementY);
      }
    })();
    sceneEngine.register(entity);
    entityRef.current = entity;
    return () => { if (entityRef.current) sceneEngine.unregister(entityRef.current.id); };
  }, [depth, speed]);

  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
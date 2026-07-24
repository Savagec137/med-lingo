import { createContext, useContext, useEffect, useState } from 'react';
import { sceneEngine } from '../engine/SceneEngine';

interface SceneContextValue {
  fps: number;
  entityCount: number;
  setReducedMotion: (enabled: boolean) => void;
  isReducedMotion: boolean;
}

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const [fps, setFps] = useState(60);
  const [entityCount, setEntityCount] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    sceneEngine.start();
    const interval = setInterval(() => {
      const metrics = sceneEngine.getMetrics();
      setFps(metrics.fps);
      setEntityCount(metrics.entityCount);
    }, 500);
    return () => {
      clearInterval(interval);
      sceneEngine.stop();
    };
  }, []);

  const setReducedMotion = (enabled: boolean) => {
    setIsReducedMotion(enabled);
    sceneEngine.setReducedMotion(enabled);
  };

  return (
    <SceneContext.Provider value={{ fps, entityCount, setReducedMotion, isReducedMotion }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  return context;
}
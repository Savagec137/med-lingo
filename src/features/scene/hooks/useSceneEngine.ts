import { useEffect, useState } from "react";
import type { SceneEntity } from "../engine/types";
import { sceneEngine } from "../engine/SceneEngine";

export function useSceneEngine() {
  const [fps, setFps] = useState(60);
  const [entityCount, setEntityCount] = useState(0);

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

  const register = (entity: SceneEntity) => {
    sceneEngine.register(entity);
    return () => sceneEngine.unregister(entity.id);
  };

  const setReducedMotion = (enabled: boolean) => {
    sceneEngine.setReducedMotion(enabled);
  };

  return { fps, entityCount, register, setReducedMotion };
}

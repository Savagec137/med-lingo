import { SceneEntity, SceneState, PerformanceMetrics } from './types';
import { PerformanceMonitor } from './PerformanceMonitor';

export class SceneEngine {
  private state: SceneState;
  private animationFrame: number | null = null;
  private lastTime = 0;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.state = {
      entities: new Map(),
      isReducedMotion: false,
      performanceMode: 'high',
      fps: 60,
    };
    this.performanceMonitor = new PerformanceMonitor();
  }

  register(entity: SceneEntity): void {
    this.state.entities.set(entity.id, entity);
    this.updatePerformanceMode();
  }

  unregister(id: string): void {
    const entity = this.state.entities.get(id);
    if (entity?.dispose) entity.dispose();
    this.state.entities.delete(id);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private loop(timestamp: number): void {
    const delta = Math.min((timestamp - this.lastTime) / 16.667, 3);
    this.lastTime = timestamp;
    this.performanceMonitor.update(delta);
    this.state.fps = this.performanceMonitor.fps;
    this.updatePerformanceMode();

    for (const entity of this.state.entities.values()) {
      if (this.state.isReducedMotion && entity.config.priority === 'low') continue;
      if (entity.config.enabled) {
        entity.animate(delta, timestamp / 1000);
      }
    }

    this.animationFrame = requestAnimationFrame(this.loop);
  }

  private updatePerformanceMode(): void {
    const metrics = this.performanceMonitor.getMetrics();
    const entityCount = this.state.entities.size;

    if (this.state.isReducedMotion) {
      this.state.performanceMode = 'low';
      return;
    }

    if (metrics.fps < 45 || entityCount > 50) {
      this.state.performanceMode = 'low';
    } else if (metrics.fps < 55 || entityCount > 30) {
      this.state.performanceMode = 'medium';
    } else {
      this.state.performanceMode = 'high';
    }

    if (this.state.performanceMode === 'low') {
      for (const entity of this.state.entities.values()) {
        entity.config.enabled = entity.config.priority !== 'low';
      }
    } else {
      for (const entity of this.state.entities.values()) {
        entity.config.enabled = true;
      }
    }
  }

  setReducedMotion(enabled: boolean): void {
    this.state.isReducedMotion = enabled;
    this.updatePerformanceMode();
  }

  getMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }
}

export const sceneEngine = new SceneEngine();
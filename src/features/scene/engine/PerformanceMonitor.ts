import { PerformanceMetrics } from './types';

export class PerformanceMonitor {
  private fps = 60;
  private frameCount = 0;
  private lastUpdate = 0;
  private updateInterval = 500;

  update(delta: number): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastUpdate));
      this.frameCount = 0;
      this.lastUpdate = now;
    }
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      entityCount: 0,
      activeAnimations: 0,
    };
  }
}
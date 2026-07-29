import type { PerformanceMetrics } from "./type";

export class PerformanceMonitor {
  fps = 60;
  private frameCount = 0;
  private lastUpdate = 0;
  private updateInterval = 500;

  update(_delta: number): void {
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

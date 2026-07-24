import { AnimationConfig, SceneEntity } from './types';

export abstract class BaseSceneEntity implements SceneEntity {
  id: string;
  type: string;
  config: AnimationConfig;
  protected elapsed = 0;
  protected randomOffset: number;

  constructor(id: string, type: string, config: Partial<AnimationConfig> = {}) {
    this.id = id;
    this.type = type;
    this.randomOffset = Math.random() * 1000;
    this.config = {
      speed: config.speed ?? 1,
      delay: config.delay ?? 0,
      frequency: config.frequency ?? 1,
      priority: config.priority ?? 'medium',
      enabled: config.enabled ?? true,
    };
  }

  abstract animate(delta: number, time: number): void;

  protected shouldTrigger(frequency: number, time: number): boolean {
    const period = 1 / frequency;
    const phase = (time + this.randomOffset) % period;
    return phase < 0.01;
  }

  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  protected breathe(time: number, speed: number = 1, amplitude: number = 1): number {
    return Math.sin((time + this.randomOffset) * speed) * amplitude;
  }

  dispose?(): void {}
}
export interface AnimationConfig {
  speed: number;
  delay: number;
  frequency: number;
  priority: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export interface SceneEntity {
  id: string;
  type: string;
  config: AnimationConfig;
  animate: (delta: number, time: number) => void;
  dispose?: () => void;
}

export interface SceneState {
  entities: Map<string, SceneEntity>;
  isReducedMotion: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  fps: number;
}

export interface PerformanceMetrics {
  fps: number;
  entityCount: number;
  activeAnimations: number;
  memoryUsage?: number;
}
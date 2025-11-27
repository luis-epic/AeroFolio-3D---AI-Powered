import { Vector3 } from 'three';
import { Section, ProjectData, ChatMessage } from './utils/validation';

// Re-export types from validation for backward compatibility
export type { Section, ProjectData, ChatMessage };

export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export interface AIState {
  isLoading: boolean;
  response: string | null;
  error: string | null;
}

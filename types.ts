import { Vector3 } from 'three';

export type Section = 'home' | 'about' | 'projects' | 'contact';

export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ProjectData {
  id: number;
  title: string;
  tech: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIState {
  isLoading: boolean;
  response: string | null;
  error: string | null;
}

export type Section = 'home' | 'about' | 'projects' | 'library' | 'contact';

export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ProjectData {
  id: number;
  title: string;
  tech: string;
  description: string;
  link?: string;
}

export interface LibraryItem {
  id: number;
  title: string;
  author: string;
  category: string;
  tag: string;
  year?: string;
  description: string;
  takeaway: string;
  link?: string;
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

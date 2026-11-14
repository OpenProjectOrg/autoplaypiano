export type Difficulty = "Easy" | "Normal" | "Hard";

export interface PianoSheet {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  bpm: number;
  content: string;
  isPremium: boolean;
  authorId?: string;
  description?: string;
  tags?: string[];
}

export interface NoteEvent {
  display: string;
  keys: string[];
  is_chord: boolean;
  delay_after_ms: number;
  line_number?: number;
}

export interface SheetParseResult {
  events: NoteEvent[];
  total_notes: number;
  estimated_duration_sec: number;
}

export type UserRole = "admin" | "user";
export type SubscriptionPlan = "community" | "free" | "pro_lifetime";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSubscribed: boolean;
  plan: SubscriptionPlan;
  mfaEnabled: boolean;
  mfaMethod?: "authenticator" | "sms";
  avatarUrl?: string;
  createdAt?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isCountdown: boolean;
  countdownSec: number;
  currentIndex: number;
  totalEvents: number;
  currentNoteDisplay: string;
  startIndex: number;
  startLine: number;
  statusMessage?: string;
}

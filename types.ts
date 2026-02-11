export interface Player {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  name: string;
  cost: number;
}

// Map of sessionId -> { playerId: weight }
export type ParticipationRecord = Record<string, Record<string, number>>;

// Renamed from AppData to EventData and added 'id'
export interface EventData {
  id: string; 
  eventName: string;
  date: string;
  defaultCost: number;
  sessions: Session[];
  players: Player[];
  participation: ParticipationRecord;
}

// Alias for components that might still reference it
export type AppData = EventData;

export type ViewMode = 'setup' | 'matrix';

export interface Payment {
  id: string;
  playerName: string; // Linking by name for simplicity across events
  amount: number;
  date: string;
}

export interface GlobalDefaults {
  cost: number;
  playerNames: string[];
  sessionNames: string[];
}

export interface GlobalState {
  events: EventData[];
  payments: Payment[];
  defaults: GlobalDefaults;
}

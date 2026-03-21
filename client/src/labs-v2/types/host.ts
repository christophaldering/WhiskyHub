export interface TastingConfig {
  name: string;
  date: string;
  time: string;
  location: string;
  blindMode: boolean;
  revealOrder: string[];
  ratingScale: "0-100" | "0-20" | "0-10";
}

export interface WhiskyEntry {
  id?: string;
  localId: string;
  name: string;
  region: string;
  caskInfluence: string;
  age: string;
}

export interface TastingData {
  id: string;
  code: string;
  status: string;
  hostId: string;
  blindMode: boolean;
  guidedWhiskyIndex?: number;
  guidedRevealStep?: number;
  title: string;
  date: string;
  location: string;
}

export interface ParticipantData {
  id: string;
  name: string;
  participantId: string;
  ratingCount?: number;
}

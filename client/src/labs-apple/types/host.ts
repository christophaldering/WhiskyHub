// CaskSense Apple — Host Types

export interface TastingConfig {
  name:        string
  date:        string
  time:        string
  location:    string
  format:      'blind' | 'open'
  scale:       '100' | '20' | '10'
  revealOrder: 'classic' | 'photo-first' | 'details-first' | 'one-by-one'
}

export interface WhiskyEntry {
  id?:           string
  name:          string
  distillery?:   string
  region?:       string
  cask?:         string
  age?:          number
  abv?:          number
  flavorProfile?: string
}

export interface TastingData {
  id:                 string
  code:               string
  name:               string
  status:             'draft' | 'open' | 'closed' | 'reveal' | 'archived'
  format:             'blind' | 'open'
  guidedWhiskyIndex:  number
  guidedRevealStep?:  number
  revealOrder?:       string
  aiNarrative?:       string
  presentationSlide?: number
  ratingScale?:       number
  createdAt:          string
  date?:              string
  time?:              string
  location?:          string
}

export interface ParticipantData {
  id:           string
  name:         string
  ratingStatus: 'all' | 'partial' | 'none'
  source?:      'app' | 'paper'
  isHost?:      boolean
  avatarUrl?:   string
  online?:      boolean
}

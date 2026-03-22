// CaskSense Apple — Rating Types

export type PhaseId = 'nose' | 'palate' | 'finish' | 'overall'

export interface PhaseScores {
  nose:    number
  palate:  number
  finish:  number
  overall: number
}

export interface PhaseTags {
  nose:    string[]
  palate:  string[]
  finish:  string[]
  overall: string[]
}

export interface PhaseNotes {
  nose:    string
  palate:  string
  finish:  string
  overall: string
}

export interface RatingData {
  scores: PhaseScores
  tags:   PhaseTags
  notes:  PhaseNotes
}

export interface WhiskyData {
  id?:            string
  name?:          string
  distillery?:    string
  region?:        string
  cask?:          string
  age?:           number
  abv?:           number
  blind:          boolean
  flavorProfile?: string
  photoUrl?:      string
}

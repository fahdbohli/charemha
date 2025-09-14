export interface MatchInfo {
  home_team: string
  away_team: string
  date: string
  time: string
  all_sources: string[]
  country: string
  [key: string]: any // For dynamic tournament properties
}

export interface OddInfo {
  value: number
  source: string
}

export interface Opportunity {
  complementary_set: string
  best_odds: Record<string, OddInfo>
  arbitrage_percentage: number
  arbitrage_sources: string
  unique_id: string
  created_at?: string // ISO timestamp when opportunity was first detected
  misvalue_source?: string // NEW: Source that has misvalued odds
  [key: string]: any // For dynamic match/tournament IDs and URLs
}

export interface MatchGroup {
  group_id: string
  home_team: string
  away_team: string
  date: string
  time: string
  country: string
  all_sources: string[]
  opportunities: Opportunity[]
}

export type Mode = "live" | "prematch"
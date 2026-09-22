export type HrfSection = Record<string, string>

export type HrfData = {
  sections: Record<string, HrfSection>
}

export type SeniorPlayer = {
  id: string
  name: string
  firstName: string
  lastName: string
  age: number
  ageDays: number
  form: number
  stamina: number
  keeper: number
  defending: number
  playmaking: number
  winger: number
  passing: number
  scoring: number
  setPieces: number
  experience: number
  leadership: number
  loyalty: number
  salary: number
  tsi: number
  rating: number
  playerNumber: number
  speciality: string
  gentleness: string
  honesty: string
  aggressiveness: string
  transferListed: boolean
  homegrown: boolean
  warnings: number
  lastMatchRating: number
  lastMatchPositionCode: number
  matchesCurrentTeam: number
  goalsCurrentTeam: number
}

export type YouthPlayer = {
  id: string
  name: string
  age: number
  ageDays: number
  canBePromotedIn: number
  specialty: number | null
  skills: Record<string, number | null>
  maxSkills: Record<string, number | null>
  scoutComments: string[]
  rating: number | null
}

export type TeamSnapshot = {
  basics: HrfSection
  league: HrfSection
  club: HrfSection
  team: HrfSection
  lineup: HrfSection
  economy: HrfSection
  arena: HrfSection
  seniorPlayers: SeniorPlayer[]
  youthPlayers: YouthPlayer[]
}

import type { HrfData, HrfSection, SeniorPlayer, TeamSnapshot, YouthPlayer } from './types'

const toNumber = (value?: string) => {
  if (!value || value.trim() === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const toNullableNumber = (value?: string) => {
  if (!value || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const toBoolean = (value?: string) => value?.toLowerCase() === 'true'

const getFullName = (section: HrfSection, firstKey: string, lastKey: string) => {
  const first = section[firstKey] ?? ''
  const last = section[lastKey] ?? ''
  return `${first} ${last}`.trim() || section.name || 'Sconosciuto'
}

export function parseHrf(text: string): HrfData {
  const sections: Record<string, HrfSection> = {}
  let currentSection = ''

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const sectionMatch = line.match(/^\[(.+)]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      sections[currentSection] = {}
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1 || !currentSection) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    sections[currentSection][key] = value
  }

  return { sections }
}

function mapSeniorPlayer(id: string, section: HrfSection): SeniorPlayer {
  return {
    id,
    name: section.name || getFullName(section, 'firstname', 'lastname'),
    firstName: section.firstname ?? '',
    lastName: section.lastname ?? '',
    age: toNumber(section.ald),
    ageDays: toNumber(section.agedays),
    form: toNumber(section.for),
    stamina: toNumber(section.uth),
    keeper: toNumber(section.mlv),
    defending: toNumber(section.bac),
    playmaking: toNumber(section.spe),
    winger: toNumber(section.ytt),
    passing: toNumber(section.fra),
    scoring: toNumber(section.mal),
    setPieces: toNumber(section.fas),
    experience: toNumber(section.rut),
    leadership: toNumber(section.led),
    loyalty: toNumber(section.loy),
    salary: toNumber(section.sal),
    tsi: toNumber(section.mkt),
    rating: toNumber(section.rating),
    playerNumber: toNumber(section.PlayerNumber),
    speciality: section.specialityLabel || section.speciality || '-',
    gentleness: section.gentlenessLabel || '-',
    honesty: section.honestyLabel || '-',
    aggressiveness: section.AggressivenessLabel || '-',
    transferListed: toBoolean(section.TransferListed),
    homegrown: toBoolean(section.homegr),
    warnings: toNumber(section.warnings),
    lastMatchRating: toNumber(section.LastMatch_RatingEndOfGame || section.LastMatch_Rating),
    lastMatchPositionCode: toNumber(section.LastMatch_PositionCode),
    matchesCurrentTeam: toNumber(section.MatchesCurrentTeam),
    goalsCurrentTeam: toNumber(section.GoalsCurrentTeam),
  }
}

function mapYouthPlayer(id: string, section: HrfSection): YouthPlayer {
  return {
    id,
    name: getFullName(section, 'FirstName', 'LastName'),
    age: toNumber(section.Age),
    ageDays: toNumber(section.AgeDays),
    canBePromotedIn: toNumber(section.CanBePromotedIn),
    specialty: toNullableNumber(section.Specialty),
    skills: {
      keeper: toNullableNumber(section.KeeperSkill),
      defending: toNullableNumber(section.DefenderSkill),
      playmaking: toNullableNumber(section.PlaymakerSkill),
      winger: toNullableNumber(section.WingerSkill),
      passing: toNullableNumber(section.PassingSkill),
      scoring: toNullableNumber(section.ScorerSkill),
      setPieces: toNullableNumber(section.SetPiecesSkill),
    },
    maxSkills: {
      keeper: toNullableNumber(section.KeeperSkillMax),
      defending: toNullableNumber(section.DefenderSkillMax),
      playmaking: toNullableNumber(section.PlaymakerSkillMax),
      winger: toNullableNumber(section.WingerSkillMax),
      passing: toNullableNumber(section.PassingSkillMax),
      scoring: toNullableNumber(section.ScorerSkillMax),
      setPieces: toNullableNumber(section.SetPiecesSkillMax),
    },
    scoutComments: Object.keys(section)
      .filter((key) => key.startsWith('ScoutComment') && key.endsWith('Text'))
      .sort()
      .map((key) => section[key]),
    rating: toNullableNumber(section.Rating),
  }
}

export function toTeamSnapshot(data: HrfData): TeamSnapshot {
  const seniorPlayers = Object.entries(data.sections)
    .filter(([name]) => /^player\d+$/.test(name))
    .map(([name, section]) => mapSeniorPlayer(name.replace('player', ''), section))

  const youthPlayers = Object.entries(data.sections)
    .filter(([name]) => /^youthplayer\d+$/.test(name))
    .map(([name, section]) => mapYouthPlayer(name.replace('youthplayer', ''), section))

  return {
    basics: data.sections.basics ?? {},
    league: data.sections.league ?? {},
    club: data.sections.club ?? {},
    team: data.sections.team ?? {},
    lineup: data.sections.lineup ?? {},
    economy: data.sections.economy ?? {},
    arena: data.sections.arena ?? {},
    seniorPlayers,
    youthPlayers,
  }
}

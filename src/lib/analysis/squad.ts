import type { SeniorPlayer, TeamSnapshot, YouthPlayer } from '../hrf/types'

export type RoleKey = 'POR' | 'DC' | 'CC' | 'ALA' | 'ATT'
export type Priority = 'Urgente' | 'Medio termine' | 'Coperto'
export type FormationKey = '3-5-2' | '4-4-2' | '5-3-2' | '3-4-3'

export type PlayerWithRole = SeniorPlayer & {
  bestRole: RoleKey
  secondaryRole: RoleKey
  roleScore: number
  roleBreakdown: Record<RoleKey, number>
  action: 'Titolare' | 'Rotazione' | 'Allenare' | 'Vendibile'
}

export type YouthPlayerRanked = YouthPlayer & {
  score: number
  bestRole: RoleKey
  secondaryRole: RoleKey
  roleBreakdown: Record<RoleKey, number>
  recommendation: 'Promuovere appena possibile' | 'Monitorare con priorità' | 'Progetto interessante' | 'Bassa priorità'
}

export type RoleAnalysis = {
  role: RoleKey
  label: string
  depth: number
  qualityScore: number
  ageAverage: number
  salaryLoad: number
  priority: Priority
  summary: string
  bestPlayers: PlayerWithRole[]
}

export type LineupSlot = {
  role: RoleKey
  label: string
  player: PlayerWithRole | null
  score: number
}

export type LineupSuggestion = {
  formation: FormationKey
  starters: LineupSlot[]
  bench: PlayerWithRole[]
  excluded: PlayerWithRole[]
  strengths: string[]
  warnings: string[]
  totalScore: number
}

export type TransferAdvice = {
  player: PlayerWithRole
  type: 'Vendi' | 'Tieni' | 'Allena'
  reason: string
}

export type MarketNeed = {
  role: RoleKey
  label: string
  priority: Priority
  targetAge: string
  targetSkills: string
  budgetHint: string
}

export const roleLabels: Record<RoleKey, string> = {
  POR: 'Portiere',
  DC: 'Difensore centrale',
  CC: 'Centrocampista centrale',
  ALA: 'Ala',
  ATT: 'Attaccante',
}

export const formations: Record<FormationKey, RoleKey[]> = {
  '3-5-2': ['POR', 'DC', 'DC', 'DC', 'ALA', 'ALA', 'CC', 'CC', 'CC', 'ATT', 'ATT'],
  '4-4-2': ['POR', 'DC', 'DC', 'DC', 'DC', 'ALA', 'ALA', 'CC', 'CC', 'ATT', 'ATT'],
  '5-3-2': ['POR', 'DC', 'DC', 'DC', 'DC', 'DC', 'ALA', 'ALA', 'CC', 'ATT', 'ATT'],
  '3-4-3': ['POR', 'DC', 'DC', 'DC', 'ALA', 'ALA', 'CC', 'CC', 'ATT', 'ATT', 'ATT'],
}

const roleScores = (player: SeniorPlayer): Record<RoleKey, number> => ({
  POR: player.keeper * 5 + player.form + player.experience + player.stamina,
  DC: player.defending * 4 + player.passing * 1.5 + player.playmaking + player.form + player.experience,
  CC: player.playmaking * 4 + player.passing * 2 + player.defending + player.stamina + player.form,
  ALA: player.winger * 4 + player.passing * 2 + player.playmaking + player.form + player.stamina,
  ATT: player.scoring * 4 + player.passing * 2 + player.winger + player.form + player.setPieces * 0.5,
})

const youthRoleScores = (player: YouthPlayer): Record<RoleKey, number> => {
  const s = player.skills
  const m = player.maxSkills
  const blend = (key: keyof YouthPlayer['skills']) => (s[key] ?? 0) * 2 + (m[key] ?? 0)

  return {
    POR: blend('keeper') * 4 + (player.rating ?? 0),
    DC: blend('defending') * 4 + blend('passing') + blend('playmaking') * 0.5,
    CC: blend('playmaking') * 4 + blend('passing') * 2 + blend('defending') * 0.5,
    ALA: blend('winger') * 4 + blend('passing') * 2 + blend('playmaking'),
    ATT: blend('scoring') * 4 + blend('passing') * 2 + blend('winger'),
  }
}

export function evaluateSeniorPlayers(players: SeniorPlayer[]): PlayerWithRole[] {
  const sortedByValue = [...players].sort((a, b) => b.tsi - a.tsi)
  const highValueIds = new Set(sortedByValue.slice(0, Math.max(5, Math.ceil(players.length / 4))).map((p) => p.id))

  return players
    .map((player) => {
      const scores = roleScores(player)
      const rankedRoles = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [RoleKey, number][]
      const best = rankedRoles[0]
      const secondary = rankedRoles[1] ?? rankedRoles[0]

      let action: PlayerWithRole['action'] = 'Rotazione'
      if (player.age <= 22 && (player.playmaking >= 6 || player.defending >= 7 || player.scoring >= 6 || player.keeper >= 7)) {
        action = 'Allenare'
      }
      if (player.age >= 29 && !highValueIds.has(player.id) && player.salary >= 6000) action = 'Vendibile'
      if (highValueIds.has(player.id) || player.rating >= 9) action = 'Titolare'

      return {
        ...player,
        bestRole: best[0],
        secondaryRole: secondary[0],
        roleScore: best[1],
        roleBreakdown: scores,
        action,
      }
    })
    .sort((a, b) => b.roleScore - a.roleScore)
}

export function topByRole(players: PlayerWithRole[]) {
  return ['POR', 'DC', 'CC', 'ALA', 'ATT'].map((role) => ({
    role: role as RoleKey,
    players: players.filter((player) => player.bestRole === role).slice(0, 3),
  }))
}

export function squadWarnings(players: PlayerWithRole[]) {
  const warnings: string[] = []
  const byRole = topByRole(players)

  for (const group of byRole) {
    if (group.players.length === 0) warnings.push(`Nessun giocatore naturale per il ruolo ${group.role}.`)
    else if (group.players.length === 1) warnings.push(`Poca profondità nel ruolo ${group.role}.`)
  }

  const over30 = players.filter((player) => player.age >= 30).length
  if (over30 >= 5) warnings.push('Rosa piuttosto anziana: valuta un ricambio graduale.')

  const lowStamina = players.filter((player) => player.stamina <= 4).length
  if (lowStamina >= 5) warnings.push('Molti giocatori con resistenza bassa.')

  return warnings
}

export function youthRanking(players: YouthPlayer[]): YouthPlayerRanked[] {
  return [...players]
    .map((player) => {
      const visible = Object.values(player.skills).filter((value): value is number => value !== null)
      const maxima = Object.values(player.maxSkills).filter((value): value is number => value !== null)
      const current = visible.reduce((sum, value) => sum + value, 0)
      const potential = maxima.reduce((sum, value) => sum + value, 0)
      const roleBreakdown = youthRoleScores(player)
      const rankedRoles = Object.entries(roleBreakdown).sort((a, b) => b[1] - a[1]) as [RoleKey, number][]
      const bestRole = rankedRoles[0][0]
      const secondaryRole = (rankedRoles[1] ?? rankedRoles[0])[0]
      const score = current * 2 + potential + (player.rating ?? 0) * 3 - Math.max(player.canBePromotedIn, 0) / 20

      let recommendation: YouthPlayerRanked['recommendation'] = 'Bassa priorità'
      if (player.canBePromotedIn <= 0 && score >= 55) recommendation = 'Promuovere appena possibile'
      else if (score >= 60) recommendation = 'Monitorare con priorità'
      else if (score >= 42) recommendation = 'Progetto interessante'

      return { ...player, score, bestRole, secondaryRole, roleBreakdown, recommendation }
    })
    .sort((a, b) => b.score - a.score)
}

export function analyzeRoles(players: PlayerWithRole[]): RoleAnalysis[] {
  return (['POR', 'DC', 'CC', 'ALA', 'ATT'] as RoleKey[]).map((role) => {
    const bestPlayers = [...players].sort((a, b) => b.roleBreakdown[role] - a.roleBreakdown[role]).slice(0, 4)
    const depth = bestPlayers.filter((player) => player.roleBreakdown[role] >= 20).length
    const qualityScore = bestPlayers.slice(0, 2).reduce((sum, player) => sum + player.roleBreakdown[role], 0) / Math.max(Math.min(bestPlayers.length, 2), 1)
    const ageAverage = bestPlayers.reduce((sum, player) => sum + player.age, 0) / Math.max(bestPlayers.length, 1)
    const salaryLoad = bestPlayers.reduce((sum, player) => sum + player.salary, 0)

    let priority: Priority = 'Coperto'
    if (depth <= 1 || qualityScore < 24) priority = 'Urgente'
    else if (depth <= 2 || qualityScore < 32 || ageAverage >= 28.5) priority = 'Medio termine'

    const summaryParts: string[] = []
    if (depth <= 1) summaryParts.push('copertura corta')
    else if (depth >= 3) summaryParts.push('buona profondità')
    if (qualityScore < 24) summaryParts.push('qualità sotto la media della rosa')
    else if (qualityScore >= 34) summaryParts.push('buon livello dei titolari')
    if (ageAverage >= 29) summaryParts.push('reparto maturo')
    else if (ageAverage <= 23) summaryParts.push('reparto giovane')

    return {
      role,
      label: roleLabels[role],
      depth,
      qualityScore,
      ageAverage,
      salaryLoad,
      priority,
      summary: summaryParts.join(', ') || 'situazione equilibrata',
      bestPlayers,
    }
  })
}

export function suggestLineup(players: PlayerWithRole[], formation: FormationKey): LineupSuggestion {
  const pool = [...players]
  const starters: LineupSlot[] = []
  const used = new Set<string>()

  formations[formation].forEach((role, index) => {
    const player = pool
      .filter((candidate) => !used.has(candidate.id))
      .sort((a, b) => b.roleBreakdown[role] - a.roleBreakdown[role])[0] ?? null

    if (player) used.add(player.id)

    starters.push({
      role,
      label: `${roleLabels[role]} ${index + 1}`,
      player,
      score: player?.roleBreakdown[role] ?? 0,
    })
  })

  const bench = pool.filter((player) => !used.has(player.id)).slice(0, 7)
  const excluded = pool.filter((player) => !used.has(player.id)).slice(7)
  const totalScore = starters.reduce((sum, slot) => sum + slot.score, 0)

  const warnings = starters.filter((slot) => slot.score < 24).map((slot) => `${slot.label}: copertura non ottimale`)
  const strengths: string[] = []
  const roleCounts = formations[formation].reduce<Record<RoleKey, number>>((acc, role) => {
    acc[role] = (acc[role] ?? 0) + 1
    return acc
  }, { POR: 0, DC: 0, CC: 0, ALA: 0, ATT: 0 })

  ;(['POR', 'DC', 'CC', 'ALA', 'ATT'] as RoleKey[]).forEach((role) => {
    const slots = starters.filter((slot) => slot.role === role)
    if (roleCounts[role] > 0) {
      const avg = slots.reduce((sum, slot) => sum + slot.score, 0) / slots.length
      if (avg >= 35) strengths.push(`${roleLabels[role]} di alto livello per questo modulo`)
    }
  })

  if (strengths.length === 0) strengths.push('Modulo equilibrato, senza reparti nettamente dominanti')

  return { formation, starters, bench, excluded, strengths, warnings, totalScore }
}

export function transferAdvice(players: PlayerWithRole[]): TransferAdvice[] {
  return players
    .map((player) => {
      if (player.age >= 29 && player.salary >= 6000 && player.action !== 'Titolare') {
        return { player, type: 'Vendi' as const, reason: 'Età alta e costo rilevante rispetto all’impatto previsto.' }
      }
      if (player.age <= 22 && player.action === 'Allenare') {
        return { player, type: 'Allena' as const, reason: 'Profilo giovane con skill centrali per crescita e plusvalenza.' }
      }
      return { player, type: 'Tieni' as const, reason: 'Utile per titolarità o rotazioni della rosa.' }
    })
    .sort((a, b) => {
      const order = { Vendi: 0, Allena: 1, Tieni: 2 }
      return order[a.type] - order[b.type]
    })
}

export function marketNeeds(roleAnalysis: RoleAnalysis[]): MarketNeed[] {
  return roleAnalysis
    .filter((role) => role.priority !== 'Coperto')
    .map((role) => ({
      role: role.role,
      label: role.label,
      priority: role.priority,
      targetAge: role.priority === 'Urgente' ? '24-28 anni' : '21-26 anni',
      targetSkills:
        role.role === 'POR'
          ? 'Parate alte, forma solida, esperienza discreta'
          : role.role === 'DC'
            ? 'Difesa alta, passaggi utili, buona forma'
            : role.role === 'CC'
              ? 'Regia alta, passaggi buoni, resistenza affidabile'
              : role.role === 'ALA'
                ? 'Ala alta, passaggi buoni, regia accessoria'
                : 'Attacco alto, passaggi utili, forma buona',
      budgetHint: role.priority === 'Urgente' ? 'Investimento prioritario' : 'Opportunità sostenibile',
    }))
}

export function getOverview(snapshot: TeamSnapshot) {
  const senior = evaluateSeniorPlayers(snapshot.seniorPlayers)
  const youth = youthRanking(snapshot.youthPlayers)
  const roleAnalysis = analyzeRoles(senior).sort((a, b) => {
    const order: Record<Priority, number> = { Urgente: 0, 'Medio termine': 1, Coperto: 2 }
    return order[a.priority] - order[b.priority]
  })

  return {
    senior,
    youth,
    warnings: squadWarnings(senior),
    roles: topByRole(senior),
    roleAnalysis,
    transferAdvice: transferAdvice(senior),
    marketNeeds: marketNeeds(roleAnalysis),
  }
}

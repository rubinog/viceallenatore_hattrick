import { useEffect, useMemo, useState } from 'react'
import {
  formations,
  getOverview,
  roleLabels,
  suggestLineup,
  type FormationKey,
  type LineupSlot,
  type RoleKey,
} from './lib/analysis/squad'
import { parseHrf, toTeamSnapshot } from './lib/hrf/parseHrf'
import type { TeamSnapshot } from './lib/hrf/types'

const currency = new Intl.NumberFormat('it-IT')
const HISTORY_KEY = 'vice-allenatore:history'

type SeniorSortKey = 'name' | 'age' | 'bestRole' | 'action' | 'form' | 'stamina' | 'tsi' | 'salary'
type YouthSortKey = 'name' | 'age' | 'bestRole' | 'recommendation' | 'promotion' | 'score'
type SortDirection = 'asc' | 'desc'

type SavedImport = {
  id: string
  fileName: string
  importedAt: string
  teamName: string
  series: string
  raw: string
}

function App() {
  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [selectedYouthId, setSelectedYouthId] = useState<string>('')
  const [formation, setFormation] = useState<FormationKey>('3-5-2')
  const [excludedPlayerIds, setExcludedPlayerIds] = useState<string[]>([])
  const [importHistory, setImportHistory] = useState<SavedImport[]>([])
  const [comparisonImportId, setComparisonImportId] = useState('')
  const [seniorSearch, setSeniorSearch] = useState('')
  const [seniorRoleFilter, setSeniorRoleFilter] = useState<'ALL' | RoleKey>('ALL')
  const [seniorActionFilter, setSeniorActionFilter] = useState<'ALL' | 'Titolare' | 'Rotazione' | 'Allenare' | 'Vendibile'>('ALL')
  const [seniorSortKey, setSeniorSortKey] = useState<SeniorSortKey>('tsi')
  const [seniorSortDirection, setSeniorSortDirection] = useState<SortDirection>('desc')
  const [youthSearch, setYouthSearch] = useState('')
  const [youthRoleFilter, setYouthRoleFilter] = useState<'ALL' | RoleKey>('ALL')
  const [youthPriorityFilter, setYouthPriorityFilter] = useState<'ALL' | 'Promuovere appena possibile' | 'Monitorare con priorità' | 'Progetto interessante' | 'Bassa priorità'>('ALL')
  const [onlyPromotable, setOnlyPromotable] = useState(false)
  const [youthSortKey, setYouthSortKey] = useState<YouthSortKey>('score')
  const [youthSortDirection, setYouthSortDirection] = useState<SortDirection>('desc')

  const overview = useMemo(() => (snapshot ? getOverview(snapshot) : null), [snapshot])

  const activeSeniorPool = useMemo(
    () => overview?.senior.filter((player) => !excludedPlayerIds.includes(player.id)) ?? [],
    [excludedPlayerIds, overview],
  )

  const lineup = useMemo(
    () => (overview ? suggestLineup(activeSeniorPool, formation) : null),
    [activeSeniorPool, formation, overview],
  )

  const comparisonSnapshot = useMemo(() => {
    const match = importHistory.find((item) => item.id === comparisonImportId)
    if (!match) return null
    return toTeamSnapshot(parseHrf(match.raw))
  }, [comparisonImportId, importHistory])

  const comparisonOverview = useMemo(
    () => (comparisonSnapshot ? getOverview(comparisonSnapshot) : null),
    [comparisonSnapshot],
  )

  const filteredSenior = useMemo(() => {
    if (!overview) return []
    const query = seniorSearch.trim().toLowerCase()

    const list = overview.senior.filter((player) => {
      const matchesSearch =
        query.length === 0 ||
        player.name.toLowerCase().includes(query) ||
        player.bestRole.toLowerCase().includes(query) ||
        player.secondaryRole.toLowerCase().includes(query)
      const matchesRole = seniorRoleFilter === 'ALL' || player.bestRole === seniorRoleFilter || player.secondaryRole === seniorRoleFilter
      const matchesAction = seniorActionFilter === 'ALL' || player.action === seniorActionFilter
      return matchesSearch && matchesRole && matchesAction
    })

    return [...list].sort((a, b) => {
      const direction = seniorSortDirection === 'asc' ? 1 : -1
      const aValue = seniorSortKey === 'name' || seniorSortKey === 'bestRole' || seniorSortKey === 'action' ? String(a[seniorSortKey]) : Number(a[seniorSortKey])
      const bValue = seniorSortKey === 'name' || seniorSortKey === 'bestRole' || seniorSortKey === 'action' ? String(b[seniorSortKey]) : Number(b[seniorSortKey])
      if (aValue < bValue) return -1 * direction
      if (aValue > bValue) return 1 * direction
      return 0
    })
  }, [overview, seniorActionFilter, seniorRoleFilter, seniorSearch, seniorSortDirection, seniorSortKey])

  const filteredYouth = useMemo(() => {
    if (!overview) return []
    const query = youthSearch.trim().toLowerCase()

    const list = overview.youth.filter((player) => {
      const matchesSearch =
        query.length === 0 ||
        player.name.toLowerCase().includes(query) ||
        player.bestRole.toLowerCase().includes(query) ||
        player.secondaryRole.toLowerCase().includes(query)
      const matchesRole = youthRoleFilter === 'ALL' || player.bestRole === youthRoleFilter || player.secondaryRole === youthRoleFilter
      const matchesPriority = youthPriorityFilter === 'ALL' || player.recommendation === youthPriorityFilter
      const matchesPromotable = !onlyPromotable || player.canBePromotedIn <= 0
      return matchesSearch && matchesRole && matchesPriority && matchesPromotable
    })

    return [...list].sort((a, b) => {
      const direction = youthSortDirection === 'asc' ? 1 : -1
      const aValue =
        youthSortKey === 'name' || youthSortKey === 'bestRole' || youthSortKey === 'recommendation'
          ? String(a[youthSortKey])
          : youthSortKey === 'promotion'
            ? a.canBePromotedIn
            : Number(a[youthSortKey])
      const bValue =
        youthSortKey === 'name' || youthSortKey === 'bestRole' || youthSortKey === 'recommendation'
          ? String(b[youthSortKey])
          : youthSortKey === 'promotion'
            ? b.canBePromotedIn
            : Number(b[youthSortKey])
      if (aValue < bValue) return -1 * direction
      if (aValue > bValue) return 1 * direction
      return 0
    })
  }, [onlyPromotable, overview, youthPriorityFilter, youthRoleFilter, youthSearch, youthSortDirection, youthSortKey])

  const selectedPlayer =
    filteredSenior.find((player) => player.id === selectedPlayerId) ??
    overview?.senior.find((player) => player.id === selectedPlayerId) ??
    filteredSenior[0] ??
    overview?.senior[0] ??
    null

  const selectedYouth =
    filteredYouth.find((player) => player.id === selectedYouthId) ??
    overview?.youth.find((player) => player.id === selectedYouthId) ??
    filteredYouth[0] ??
    overview?.youth[0] ??
    null

  const saveHistory = (team: TeamSnapshot, activeFileName: string, raw: string) => {
    const next: SavedImport = {
      id: `${Date.now()}`,
      fileName: activeFileName,
      importedAt: new Date().toISOString(),
      teamName: team.basics.teamName ?? '-',
      series: team.league.serie ?? '-',
      raw,
    }

    const current = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as SavedImport[]
    const updated = [next, ...current].slice(0, 8)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setImportHistory(updated)
  }

  const applySnapshot = (team: TeamSnapshot, activeFileName: string) => {
    setSnapshot(team)
    setFileName(activeFileName)
    setSelectedPlayerId(team.seniorPlayers[0]?.id ?? '')
    setSelectedYouthId(team.youthPlayers[0]?.id ?? '')
    setExcludedPlayerIds([])
  }

  const handleFile = async (file: File) => {
    try {
      setError('')
      const text = await file.text()
      const parsed = parseHrf(text)
      const team = toTeamSnapshot(parsed)
      applySnapshot(team, file.name)
      localStorage.setItem('vice-allenatore:last-hrf', text)
      localStorage.setItem('vice-allenatore:last-file-name', file.name)
      saveHistory(team, file.name, text)
    } catch (err) {
      console.error(err)
      setError('Impossibile leggere il file HRF.')
    }
  }

  const loadSaved = () => {
    const saved = localStorage.getItem('vice-allenatore:last-hrf')
    const savedName = localStorage.getItem('vice-allenatore:last-file-name')
    if (!saved) return
    const parsed = parseHrf(saved)
    applySnapshot(toTeamSnapshot(parsed), savedName ?? 'ultimo-file.hrf')
  }

  const toggleExcludedPlayer = (playerId: string) => {
    setExcludedPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    )
  }

  useEffect(() => {
    setImportHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'))
    loadSaved()
  }, [])

  const compareDelta = (current: number, previous: number) => {
    const delta = current - previous
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta}`
  }

  const groupedLineup = useMemo<Record<RoleKey, LineupSlot[]>>(() => {
    if (!lineup) {
      return { POR: [], DC: [], CC: [], ALA: [], ATT: [] }
    }
    return {
      POR: lineup.starters.filter((slot) => slot.role === 'POR'),
      DC: lineup.starters.filter((slot) => slot.role === 'DC'),
      CC: lineup.starters.filter((slot) => slot.role === 'CC'),
      ALA: lineup.starters.filter((slot) => slot.role === 'ALA'),
      ATT: lineup.starters.filter((slot) => slot.role === 'ATT'),
    }
  }, [lineup])

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Hattrick companion</p>
          <h1>Vice Allenatore</h1>
          <p className="subtitle">
            Carica un file .hrf di Hattrick Organizer e ottieni una prima analisi di rosa,
            giovanili, mercato e formazione consigliata.
          </p>
        </div>
        <div className="card upload-card">
          <label className="upload-box">
            <input
              type="file"
              accept=".hrf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <span>Carica file .hrf</span>
          </label>
          <button className="secondary" onClick={loadSaved} type="button">
            Carica ultimo import
          </button>
          {fileName ? <p className="muted">File attivo: {fileName}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </header>

      {!snapshot || !overview ? (
        <section className="card empty-state">
          <h2>Pronto per l’import</h2>
          <p>Il progetto è già configurato per GitHub Pages e parsing locale del file HRF.</p>
        </section>
      ) : (
        <main className="dashboard">
          <section className="grid two">
            <article className="card">
              <h2>{snapshot.basics.teamName}</h2>
              <ul className="stats-list">
                <li><strong>Serie:</strong> {snapshot.league.serie ?? '-'}</li>
                <li><strong>Posizione:</strong> {snapshot.league.placering ?? '-'}</li>
                <li><strong>Punti:</strong> {snapshot.league.poang ?? '-'}</li>
              </ul>
              <div className="pill-row">
                <span className="pill">Allenamento: {snapshot.team.trType ?? '-'}</span>
                <span className="pill">Resistenza: {snapshot.team.staminaTrainingPart ?? '-'}%</span>
                <span className="pill">Stadio: {snapshot.arena.arenaname ?? '-'}</span>
              </div>
            </article>
            <article className="card">
              <h2>Economia</h2>
              <div className="kpi-grid">
                <div><span className="kpi-label">Cassa</span><strong>{currency.format(Number(snapshot.economy.Cash ?? 0))}</strong></div>
                <div><span className="kpi-label">Saldo previsto</span><strong>{currency.format(Number(snapshot.economy.ExpectedWeeksTotal ?? 0))}</strong></div>
                <div><span className="kpi-label">Fanclub</span><strong>{currency.format(Number(snapshot.club.fanclub ?? 0))}</strong></div>
                <div><span className="kpi-label">Power rating</span><strong>{snapshot.club.PowerRating ?? '-'}</strong></div>
              </div>
            </article>
          </section>

          <section className="card">
            <h2>Storico import e confronto</h2>
            <div className="filters-bar">
              <select className="select-box" value={comparisonImportId} onChange={(e) => setComparisonImportId(e.target.value)}>
                <option value="">Seleziona un import precedente</option>
                {importHistory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fileName} · {new Date(item.importedAt).toLocaleString('it-IT')}
                  </option>
                ))}
              </select>
            </div>
            {comparisonSnapshot && comparisonOverview ? (
              <div className="comparison-grid">
                <div className="subcard">
                  <h3>Confronto rapido</h3>
                  <div className="skills-grid">
                    <div><span>Cassa</span><strong>{compareDelta(Number(snapshot.economy.Cash ?? 0), Number(comparisonSnapshot.economy.Cash ?? 0))}</strong></div>
                    <div><span>Fanclub</span><strong>{compareDelta(Number(snapshot.club.fanclub ?? 0), Number(comparisonSnapshot.club.fanclub ?? 0))}</strong></div>
                    <div><span>Senior</span><strong>{compareDelta(snapshot.seniorPlayers.length, comparisonSnapshot.seniorPlayers.length)}</strong></div>
                    <div><span>Giovanili</span><strong>{compareDelta(snapshot.youthPlayers.length, comparisonSnapshot.youthPlayers.length)}</strong></div>
                    <div><span>Power rating</span><strong>{compareDelta(Number(snapshot.club.PowerRating ?? 0), Number(comparisonSnapshot.club.PowerRating ?? 0))}</strong></div>
                    <div><span>Punti</span><strong>{compareDelta(Number(snapshot.league.poang ?? 0), Number(comparisonSnapshot.league.poang ?? 0))}</strong></div>
                  </div>
                </div>
                <div className="subcard">
                  <h3>Import selezionato</h3>
                  <p className="muted">{comparisonSnapshot.basics.teamName} · {comparisonSnapshot.league.serie}</p>
                  <p className="muted">Senior: {comparisonSnapshot.seniorPlayers.length}</p>
                  <p className="muted">Giovanili: {comparisonSnapshot.youthPlayers.length}</p>
                  <p className="muted">Cassa: {currency.format(Number(comparisonSnapshot.economy.Cash ?? 0))}</p>
                </div>
              </div>
            ) : (
              <p className="muted">Gli ultimi import vengono salvati nel browser. Selezionane uno per confrontarlo con la situazione attuale.</p>
            )}
          </section>

          <section className="card">
            <h2>Alert rosa</h2>
            <ul className="bullet-list">
              {overview.warnings.length > 0 ? overview.warnings.map((warning) => <li key={warning}>{warning}</li>) : <li>Nessun alert evidente nella prima analisi.</li>}
            </ul>
          </section>

          <section className="card">
            <div className="section-header compact-header">
              <div>
                <h2>Formazione consigliata</h2>
                <p className="muted detail-subtitle">Escludi giocatori per simulare indisponibili, infortunati o scelte tecniche.</p>
              </div>
              <select className="select-box" value={formation} onChange={(e) => setFormation(e.target.value as FormationKey)}>
                {Object.keys(formations).map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
            </div>
            <div className="filters-bar">
              <span className="muted">Esclusi dalla formazione: {excludedPlayerIds.length}</span>
              {excludedPlayerIds.length > 0 ? (
                <button className="secondary" type="button" onClick={() => setExcludedPlayerIds([])}>
                  Reset esclusioni
                </button>
              ) : null}
            </div>
            {lineup ? (
              <div className="lineup-layout">
                <div className="subcard full-width">
                  <h3>Vista campo</h3>
                  <div className="pitch">
                    <div className="pitch-line attackers">
                      {groupedLineup.ATT.map((slot, index) => <button key={`att-${index}`} className="pitch-player" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>{slot.player?.name ?? '-'}<small>{slot.score.toFixed(1)}</small></button>)}
                    </div>
                    <div className="pitch-line wide-mid">
                      {groupedLineup.ALA.map((slot, index) => <button key={`ala-${index}`} className="pitch-player" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>{slot.player?.name ?? '-'}<small>{slot.score.toFixed(1)}</small></button>)}
                    </div>
                    <div className="pitch-line midfielders">
                      {groupedLineup.CC.map((slot, index) => <button key={`cc-${index}`} className="pitch-player" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>{slot.player?.name ?? '-'}<small>{slot.score.toFixed(1)}</small></button>)}
                    </div>
                    <div className="pitch-line defenders">
                      {groupedLineup.DC.map((slot, index) => <button key={`dc-${index}`} className="pitch-player" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>{slot.player?.name ?? '-'}<small>{slot.score.toFixed(1)}</small></button>)}
                    </div>
                    <div className="pitch-line keeper">
                      {groupedLineup.POR.map((slot, index) => <button key={`por-${index}`} className="pitch-player" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>{slot.player?.name ?? '-'}<small>{slot.score.toFixed(1)}</small></button>)}
                    </div>
                  </div>
                </div>
                <div className="subcard">
                  <h3>Titolari · score totale {lineup.totalScore.toFixed(1)}</h3>
                  <div className="mini-list">
                    {lineup.starters.map((slot, index) => (
                      <button key={`${slot.role}-${index}`} className="player-row compact button-row" type="button" onClick={() => slot.player && setSelectedPlayerId(slot.player.id)}>
                        <span>{slot.label}: {slot.player?.name ?? 'Nessuno'}</span>
                        <span>{slot.score.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="subcard">
                  <h3>Panchina</h3>
                  <div className="mini-list">
                    {lineup.bench.map((player) => (
                      <button key={player.id} className="player-row compact button-row" type="button" onClick={() => setSelectedPlayerId(player.id)}>
                        <span>{player.name}</span>
                        <span>{roleLabels[player.bestRole]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="subcard">
                  <h3>Punti di forza</h3>
                  <ul className="bullet-list scout-comments">
                    {lineup.strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="subcard">
                  <h3>Warning modulo</h3>
                  <ul className="bullet-list scout-comments">
                    {lineup.warnings.length > 0 ? lineup.warnings.map((item) => <li key={item}>{item}</li>) : <li>Nessuna criticità evidente per questo modulo.</li>}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>

          <section className="card">
            <h2>Ruoli da rinforzare</h2>
            <div className="role-analysis-grid">
              {overview.roleAnalysis.map((role) => (
                <div key={role.role} className="subcard role-analysis-card">
                  <div className="section-header compact-header">
                    <div><h3>{role.label}</h3><p className="muted detail-subtitle">{role.summary}</p></div>
                    <span className={`pill priority-pill ${role.priority === 'Urgente' ? 'priority-urgent' : role.priority === 'Medio termine' ? 'priority-medium' : 'priority-covered'}`}>{role.priority}</span>
                  </div>
                  <div className="skills-grid">
                    <div><span>Profondità</span><strong>{role.depth}</strong></div>
                    <div><span>Qualità</span><strong>{role.qualityScore.toFixed(1)}</strong></div>
                    <div><span>Età media</span><strong>{role.ageAverage.toFixed(1)}</strong></div>
                    <div><span>Monte stipendi</span><strong>{currency.format(role.salaryLoad)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid two">
            <article className="card">
              <h2>Mercato: compra/vendi/tieni</h2>
              <div className="mini-list">
                {overview.transferAdvice.slice(0, 10).map((item) => (
                  <button key={`${item.type}-${item.player.id}`} className="player-row button-row" type="button" onClick={() => setSelectedPlayerId(item.player.id)}>
                    <div>
                      <strong>{item.player.name}</strong>
                      <p className="muted">{item.reason}</p>
                    </div>
                    <span className={`pill ${item.type === 'Vendi' ? 'priority-urgent' : item.type === 'Allena' ? 'priority-medium' : 'priority-covered'}`}>{item.type}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="card">
              <h2>Profili da cercare</h2>
              <div className="mini-list">
                {overview.marketNeeds.length > 0 ? overview.marketNeeds.map((need) => (
                  <div key={need.role} className="subcard compact-card">
                    <div className="section-header compact-header">
                      <strong>{need.label}</strong>
                      <span className={`pill ${need.priority === 'Urgente' ? 'priority-urgent' : 'priority-medium'}`}>{need.priority}</span>
                    </div>
                    <p className="muted">Età target: {need.targetAge}</p>
                    <p className="muted">Skill chiave: {need.targetSkills}</p>
                    <p className="muted">Budget: {need.budgetHint}</p>
                  </div>
                )) : <p className="muted">Nessun acquisto prioritario emerso da questa analisi.</p>}
              </div>
            </article>
          </section>

          <section className="grid two">
            <article className="card">
              <h2>Selezione attuale senior</h2>
              {selectedPlayer ? (
                <div className="skills-grid">
                  <div><span>Giocatore</span><strong>{selectedPlayer.name}</strong></div>
                  <div><span>Ruolo</span><strong>{roleLabels[selectedPlayer.bestRole]}</strong></div>
                  <div><span>TSI</span><strong>{currency.format(selectedPlayer.tsi)}</strong></div>
                  <div><span>Azione</span><strong>{selectedPlayer.action}</strong></div>
                </div>
              ) : <p className="muted">Nessun senior selezionato.</p>}
            </article>

            <article className="card">
              <h2>Selezione attuale giovanile</h2>
              {selectedYouth ? (
                <div className="skills-grid">
                  <div><span>Prospetto</span><strong>{selectedYouth.name}</strong></div>
                  <div><span>Ruolo</span><strong>{roleLabels[selectedYouth.bestRole]}</strong></div>
                  <div><span>Score</span><strong>{selectedYouth.score.toFixed(1)}</strong></div>
                  <div><span>Priorità</span><strong>{selectedYouth.recommendation}</strong></div>
                </div>
              ) : <p className="muted">Nessun giovane selezionato.</p>}
            </article>
          </section>

          <section className="grid two">
            <article className="card">
              <h2>Top per ruolo</h2>
              <div className="role-groups">
                {overview.roles.map((group) => (
                  <div key={group.role} className="role-group">
                    <h3>{roleLabels[group.role]}</h3>
                    {group.players.length === 0 ? <p className="muted">Nessun profilo trovato</p> : group.players.map((player) => (
                      <button key={player.id} className={`player-row compact button-row ${selectedPlayerId === player.id ? 'selected' : ''}`} onClick={() => setSelectedPlayerId(player.id)} type="button">
                        <span>{player.name}</span>
                        <span>{player.roleScore.toFixed(0)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <h2>Top giovanili</h2>
              <div className="youth-list">
                {overview.youth.slice(0, 5).map((player) => (
                  <button key={player.id} className={`player-row button-row ${selectedYouthId === player.id ? 'selected' : ''}`} onClick={() => setSelectedYouthId(player.id)} type="button">
                    <div>
                      <strong>{player.name}</strong>
                      <p className="muted">{player.age} anni, promuovibile tra {player.canBePromotedIn} giorni</p>
                    </div>
                    <span className="pill score">{player.score.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="card">
            <div className="section-header compact-header">
              <div>
                <h2>Rosa senior</h2>
                <p className="muted detail-subtitle">{filteredSenior.length} giocatori mostrati su {overview.senior.length}</p>
              </div>
            </div>
            <div className="filters-bar">
              <input className="input-box" placeholder="Cerca giocatore o ruolo" value={seniorSearch} onChange={(e) => setSeniorSearch(e.target.value)} />
              <select className="select-box" value={seniorRoleFilter} onChange={(e) => setSeniorRoleFilter(e.target.value as 'ALL' | RoleKey)}>
                <option value="ALL">Tutti i ruoli</option>
                {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select className="select-box" value={seniorActionFilter} onChange={(e) => setSeniorActionFilter(e.target.value as typeof seniorActionFilter)}>
                <option value="ALL">Tutte le azioni</option>
                <option value="Titolare">Titolare</option>
                <option value="Rotazione">Rotazione</option>
                <option value="Allenare">Allenare</option>
                <option value="Vendibile">Vendibile</option>
              </select>
              <select className="select-box" value={seniorSortKey} onChange={(e) => setSeniorSortKey(e.target.value as SeniorSortKey)}>
                <option value="name">Ordina per nome</option>
                <option value="age">Ordina per età</option>
                <option value="bestRole">Ordina per ruolo</option>
                <option value="action">Ordina per azione</option>
                <option value="form">Ordina per forma</option>
                <option value="stamina">Ordina per resistenza</option>
                <option value="tsi">Ordina per TSI</option>
                <option value="salary">Ordina per stipendio</option>
              </select>
              <select className="select-box" value={seniorSortDirection} onChange={(e) => setSeniorSortDirection(e.target.value as SortDirection)}>
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </div>
            <div className="table-wrap"><table><thead><tr><th>Escludi</th><th>Giocatore</th><th>Età</th><th>Ruolo</th><th>Ruolo 2</th><th>Suggerimento</th><th>Forma</th><th>Resistenza</th><th>TSI</th><th>Stipendio</th></tr></thead><tbody>
              {filteredSenior.map((player) => <tr key={player.id} className={selectedPlayerId === player.id ? 'selected-row' : ''}><td><input type="checkbox" checked={excludedPlayerIds.includes(player.id)} onChange={() => toggleExcludedPlayer(player.id)} onClick={(e) => e.stopPropagation()} /></td><td onClick={() => setSelectedPlayerId(player.id)}>{player.name}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.age}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.bestRole}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.secondaryRole}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.action}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.form}</td><td onClick={() => setSelectedPlayerId(player.id)}>{player.stamina}</td><td onClick={() => setSelectedPlayerId(player.id)}>{currency.format(player.tsi)}</td><td onClick={() => setSelectedPlayerId(player.id)}>{currency.format(player.salary)}</td></tr>)}
            </tbody></table></div>
          </section>

          <section className="card">
            <div className="section-header compact-header">
              <div>
                <h2>Giovanili</h2>
                <p className="muted detail-subtitle">{filteredYouth.length} prospetti mostrati su {overview.youth.length}</p>
              </div>
            </div>
            <div className="filters-bar">
              <input className="input-box" placeholder="Cerca prospetto o ruolo" value={youthSearch} onChange={(e) => setYouthSearch(e.target.value)} />
              <select className="select-box" value={youthRoleFilter} onChange={(e) => setYouthRoleFilter(e.target.value as 'ALL' | RoleKey)}>
                <option value="ALL">Tutti i ruoli</option>
                {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select className="select-box" value={youthPriorityFilter} onChange={(e) => setYouthPriorityFilter(e.target.value as typeof youthPriorityFilter)}>
                <option value="ALL">Tutte le priorità</option>
                <option value="Promuovere appena possibile">Promuovere appena possibile</option>
                <option value="Monitorare con priorità">Monitorare con priorità</option>
                <option value="Progetto interessante">Progetto interessante</option>
                <option value="Bassa priorità">Bassa priorità</option>
              </select>
              <select className="select-box" value={youthSortKey} onChange={(e) => setYouthSortKey(e.target.value as YouthSortKey)}>
                <option value="name">Ordina per nome</option>
                <option value="age">Ordina per età</option>
                <option value="bestRole">Ordina per ruolo</option>
                <option value="recommendation">Ordina per priorità</option>
                <option value="promotion">Ordina per promozione</option>
                <option value="score">Ordina per score</option>
              </select>
              <select className="select-box" value={youthSortDirection} onChange={(e) => setYouthSortDirection(e.target.value as SortDirection)}>
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
              <label className="checkbox-pill">
                <input type="checkbox" checked={onlyPromotable} onChange={(e) => setOnlyPromotable(e.target.checked)} />
                <span>Solo promuovibili</span>
              </label>
            </div>
            <div className="table-wrap"><table><thead><tr><th>Giocatore</th><th>Età</th><th>Ruolo</th><th>Ruolo 2</th><th>Priorità</th><th>Promozione</th><th>Score</th></tr></thead><tbody>
              {filteredYouth.map((player) => <tr key={player.id} className={selectedYouthId === player.id ? 'selected-row' : ''} onClick={() => setSelectedYouthId(player.id)}><td>{player.name}</td><td>{player.age}</td><td>{player.bestRole}</td><td>{player.secondaryRole}</td><td>{player.recommendation}</td><td>{player.canBePromotedIn <= 0 ? 'Ora' : `${player.canBePromotedIn} gg`}</td><td>{player.score.toFixed(1)}</td></tr>)}
            </tbody></table></div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App

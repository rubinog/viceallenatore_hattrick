# Vice Allenatore

Webapp companion per Hattrick che importa file `.hrf` di Hattrick Organizer e analizza:

- rosa senior
- giovanili
- reparti da rinforzare
- formazione consigliata
- suggerimenti mercato
- storico import con confronto rapido

## Stack

- Vite
- React
- TypeScript
- hosting statico compatibile con GitHub Pages

## Avvio locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Note tecniche

- il parsing del file `.hrf` avviene interamente nel browser
- nessun backend richiesto
- l'ultimo import e lo storico vengono salvati in `localStorage`
- `vite.config.ts` usa `base: './'` per semplificare il deploy statico

## Deploy su GitHub Pages

Il workflow è già pronto in:

- `.github/workflows/deploy.yml`

### Passi

1. crea un repository GitHub e pubblica il contenuto di `vice-allenatore`
2. assicurati che il branch principale sia `main`
3. su GitHub vai in **Settings > Pages**
4. come source seleziona **GitHub Actions**
5. fai push su `main`
6. attendi il completamento del workflow **Deploy to GitHub Pages**

## Funzioni attuali

- upload HRF
- storico import
- confronto con import precedente
- analisi senior e giovanili
- filtri e ordinamenti
- esclusione giocatori per simulare indisponibili
- vista formazione su campo
- suggerimenti mercato

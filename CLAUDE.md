# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Interactive UAP/UFO sighting data explorer — portfolio project for **cristiancuda.com** (Cristian Cuda, Senior Systems Engineer, LA). Combines the full NUFORC dataset (~147k sightings) with mapping, charting, and an embedded Claude AI chat assistant.

## Dev commands

```bash
npm run dev       # Vite frontend dev server — port 3000
npm run server    # Express backend — port 3001
npm run process   # One-time: convert raw NUFORC CSV → server/data/nuforc-cleaned.json
npm run build     # Production build
```

Frontend and backend must run concurrently during development.

## Architecture

**Frontend** (`/src`) — React + Vite + Tailwind CSS
**Backend** (`/server`) — Node.js + Express; proxies Claude API calls and serves NUFORC JSON with filtering

### Key data flow

1. `scripts/process-nuforc.js` converts the raw Kaggle CSV into `server/data/nuforc-cleaned.json`
2. Express (`server/routes/sightings.js`) serves sightings with query-param filtering (shape, decade, country)
3. `src/hooks/useSightings.js` fetches from the Express API and manages filter state
4. Filter state is passed to `ChatSidebar` and injected into the Claude system prompt at request time
5. Claude API calls are proxied through `server/routes/chat.js` (keeps the API key server-side)

### Tab structure

The app has four main tabs rendered in `App.jsx`:
- **Map** (`MapView.jsx`) — Leaflet + markercluster; color-coded by shape or decade; military base overlay layer
- **Timeline** (`TimelineView.jsx`) — key UAP events 1947–2025 + Recharts annual sighting bar
- **Shapes** (`ShapesView.jsx`) — Chart.js animated bar + trend line
- **Insights** (`InsightsView.jsx`) — data finding cards, each with "Ask Claude ↗" that seeds `ChatSidebar`

`ChatSidebar.jsx` is a persistent slide-out panel, available on all tabs.

### Static data files

- `src/data/timeline-events.json` — hardcoded key UAP events
- `src/data/military-bases.json` — USAF/Navy base coordinates for map overlay
- `src/data/aaro-cases.json` — manually curated AARO public disclosure cases (6 unresolved cases power the "Classified" easter egg)

## Environment variables

```env
ANTHROPIC_API_KEY=sk-ant-...         # Server-side only, never exposed to frontend
VITE_API_BASE_URL=http://localhost:3001
```

## Design tokens

All UI must use these exact values — the aesthetic must match cristiancuda.com:

```
Background:   #0a0d1a    Surface:    #0d1120
Cyan (CTA):   #22d3ee    Amber:      #fbbf24
Coral:        #f87171    Purple:     #a78bfa
Text:         #e2e8f0    Secondary:  #94a3b8
Muted:        #475569    Border:     rgba(255,255,255,0.07)
```

- Glowing pulse animation on map markers for recent sightings (post-2020)
- Subtle star-field CSS background on the map container

## Claude chat system prompt

Inject filter state at request time — do not hardcode:

```
You are a UAP/UFO data analyst assistant embedded in an interactive sighting explorer.
You have access to the NUFORC database (~147,000 sightings from 1906–2024) and AARO public records.

Current filter state: {INJECT_FILTER_STATE}
Visible sightings count: {INJECT_COUNT}

Answer questions about UAP sightings, trends, patterns, and notable cases.
Be factual, reference specific data where possible, and maintain a tone that's curious
and analytical — not sensationalist, but not dismissive either.
Keep responses concise (2–4 sentences) unless the user asks for detail.
```

Model: `claude-sonnet-4-6`

## Stats bar reference values

Displayed in `StatsBar.jsx` (sourced from dataset metadata, not computed live):
- 147,832 total sightings · 1,063 AARO cases · 6 unresolved · 78-year data span

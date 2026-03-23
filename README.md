# UAP Explorer

An interactive data explorer for 80,000+ UFO/UAP sighting reports, built as a portfolio project for [cristiancuda.com](https://cristiancuda.com).

**Live demo:** [cristiancuda.com](https://cristiancuda.com)

![UAP Explorer screenshot](screenshot.png)

---

## What it is

A full-stack web application that plots 80,332 real sighting reports from the NUFORC database on an interactive world map — with clustering, filtering, a historical timeline with annual volume chart, shape breakdowns, AI-powered insights, and a chat assistant that answers questions about the data in context.

---

## Features

### Map
- 80,000+ clustered sighting markers on an interactive world map
- Filter by shape, decade, or country — map updates instantly
- Hover any marker for a quick tooltip (date, location, shape, duration)
- Click a marker to open the full report drawer with the complete description
- Military base overlay — toggle USAF/Navy base locations alongside sighting clusters
- Color-coded markers: by shape or by decade, with glowing pulse animation on post-2020 sightings

### Timeline
- Annual sighting volume bar chart from 1906 to 2014 (real NUFORC data)
- Historical milestone events overlaid as clickable markers (Roswell, Phoenix Lights, AATIP disclosure, etc.)
- Click any bar to filter the map to that year's sightings
- Sighting count per year displayed next to each event for context

### Shapes
- Animated bar chart breaking down all 80k+ sightings by reported shape
- Trend line overlay
- Most-reported shapes ranked

### Insights
- Curated data findings: military proximity analysis, decade surge factor, orb dominance trends
- Each insight card has an "Ask AI" button that seeds the chat with a relevant question

### AI Chat Sidebar
- Context-aware assistant embedded in the explorer
- Knows your active filters and the number of visible sightings
- Ask anything: "What shapes are most common in California?", "Why did reports spike in 2012?", "Tell me about the most credible cases"
- Available on every tab (requires Anthropic API key)

---

## Stack

### Frontend
| Tool | Why |
|------|-----|
| **React** | Component architecture — map, filters, drawer, chat, and chart panels all compose cleanly |
| **Tailwind CSS** | Utility-first styling; design tokens wired via CSS variables for a consistent dark aesthetic |
| **Leaflet.js + markercluster** | Best-in-class open-source mapping; handles 80k+ markers via clustering without performance issues |
| **Recharts** | Declarative chart library built for React; used for the timeline bar chart |
| **Chart.js** | Canvas-based rendering for the shape breakdown with animation and trend overlay |
| **Vite** | Fast dev server with HMR and ES module build pipeline |

### Backend
| Tool | Why |
|------|-----|
| **Node.js + Express** | Lightweight API server; loads the full 80k dataset into memory once and filters in-process — no database needed at this scale |
| **nodemon** | Auto-reloads the server on source changes during development |

### Data
| Source | Details |
|--------|---------|
| **NUFORC** | National UFO Reporting Center — 80,332 sightings from 1906 to 2014, downloaded programmatically via the Kaggle Hub API |
| **AARO** | All-domain Anomaly Resolution Office — official U.S. government UAP case data from aaro.mil, manually curated (6 unresolved highlighted cases) |

---

## Data pipeline

```
Kaggle Hub API
     │
     ▼
scripts/download-data.py       # pulls camnugent/ufo-sightings-around-the-world
     │
     ▼
server/data/raw/scrubbed.csv   # ~13 MB raw CSV (gitignored)
     │
     ▼
scripts/process-nuforc.js      # normalises columns, dates, coordinates → JSON
     │
     ▼
server/data/nuforc-cleaned.json  # 80,332 records, ~21 MB (gitignored)
     │
     ▼
Express API (/api/sightings, /api/yearly-counts, /api/stats, …)
     │
     ▼
React frontend
```

The processing step normalises column names (handles both Kaggle CSV variants), converts `MM/DD/YYYY` dates to ISO format, validates coordinates, and strips invalid records. Output is loaded once into memory on server start.

Live data updates are available via weekly scrapers:
- `npm run scrape:nuforc` — fetches recent reports from nuforc.org, geocodes via Nominatim, deduplicates, and appends
- `npm run scrape:aaro` — checks aaro.mil for new public case entries

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.9+ with pip
- A free [Kaggle account](https://www.kaggle.com) (for dataset download)
- An [Anthropic API key](https://console.anthropic.com) (for the AI chat feature)

### Install

```bash
git clone https://github.com/yourusername/uap-explorer.git
cd uap-explorer
npm install
pip install kagglehub
```

### Environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
VITE_API_BASE_URL=http://localhost:3001
```

### Download and process the dataset

```bash
# Requires ~/.kaggle/kaggle.json (download from kaggle.com/settings → API → Create New Token)
npm run download    # pulls CSV via Kaggle Hub, copies to server/data/raw/
npm run process     # converts CSV → server/data/nuforc-cleaned.json
```

### Run

Open two terminals:

```bash
# Terminal 1 — backend API
npm run server      # http://localhost:3001

# Terminal 2 — frontend
npm run dev         # http://localhost:3000
```

Or run both together:

```bash
npm run dev:all
```

---

## Project structure

```
uap-explorer/
├── scripts/
│   ├── download-data.py        # Kaggle Hub dataset download
│   ├── process-nuforc.js       # CSV → JSON processing pipeline
│   ├── scrape-nuforc.js        # weekly live data scraper
│   └── scrape-aaro.js          # AARO public case sync
├── server/
│   ├── index.js                # Express app entry point
│   ├── lib/dataset.js          # lazy-loads nuforc-cleaned.json into memory
│   ├── routes/
│   │   ├── sightings.js        # GET /api/sightings (shape/decade/year/country filters)
│   │   ├── yearlyCounts.js     # GET /api/yearly-counts (aggregated for timeline chart)
│   │   ├── stats.js            # GET /api/stats
│   │   ├── insights.js         # GET /api/insights (military proximity, surge factor)
│   │   ├── chat.js             # POST /api/chat (AI proxy)
│   │   └── …
│   └── data/
│       ├── aaro-cases.json     # curated AARO cases (committed)
│       ├── military-bases.json # USAF/Navy base coordinates (committed)
│       └── timeline-events.json
└── src/
    ├── components/
    │   ├── MapView.jsx
    │   ├── TimelineView.jsx
    │   ├── ShapesView.jsx
    │   ├── InsightsView.jsx
    │   ├── ChatSidebar.jsx
    │   ├── StatsBar.jsx
    │   └── …
    └── hooks/
        ├── useSightings.js
        ├── useStats.js
        └── useInsights.js
```

---

## Author

**Cristian Cuda** — Senior Systems Engineer
[cristiancuda.com](https://cristiancuda.com)

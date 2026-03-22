# UAP / UFO Explorer

An interactive data explorer for UAP/UFO sighting reports built as a portfolio project for [cristiancuda.com](https://cristiancuda.com). Combines real NUFORC database records with AARO public disclosures and a Claude AI-powered chat sidebar.

## What it is

A full-stack web app that plots 147,000+ UFO sighting reports on an interactive world map with filtering, clustering, a historical timeline, shape breakdowns, and an AI assistant that answers questions about the data.

## How to use it

### Map tab
- **Filter by shape, decade, or country** using the dropdowns in the top bar — the map and stats update instantly
- **Hover** over any cluster or marker for a quick tooltip summary
- **Click** a marker to open the full report drawer (date, location, duration, description)
- **Military base overlay** — toggle the layer to see USAF/Navy base locations alongside sighting clusters
- **Near me** button — zooms the map to your current location and highlights nearby sightings

### AI chat sidebar
- Click the chat icon (any tab) to open the Claude-powered assistant
- Ask questions like "What shapes are most common in California?" or "Show me trends after 2015"
- The assistant is aware of your active filters and visible sighting count

### Other tabs
- **Timeline** — key UAP events 1947–2025 alongside an annual sighting bar chart
- **Shapes** — animated breakdown of reported shapes with trend line
- **Insights** — curated data findings; each card has an "Ask Claude" button that seeds the chat

## Tech stack

- **Frontend:** React, Tailwind CSS, Leaflet.js + markercluster, Recharts, Chart.js
- **Backend:** Node.js, Express
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)

## Data sources

- [NUFORC](https://nuforc.org) (National UFO Reporting Center) — ~147,000 sightings 1906–2024, via Kaggle dataset
- [AARO](https://aaro.mil) — public disclosure cases from the All-domain Anomaly Resolution Office

## Setup

```bash
# 1. Clone and install
git clone https://github.com/yourusername/uap-explorer.git
cd uap-explorer
npm install

# 2. Environment variables
cp .env.example .env
# Add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...
# VITE_API_BASE_URL=http://localhost:3001

# 3. Download the NUFORC dataset from Kaggle
#    Place the CSV at: server/data/raw/scrubbed.csv

# 4. Process the raw data (one-time)
npm run process

# 5. Run frontend + backend concurrently (two terminals)
npm run dev      # Vite frontend — http://localhost:3000
npm run server   # Express backend — http://localhost:3001
```

## Built with

Scaffolded and built using [Claude Code](https://claude.ai/code) by Anthropic — AI-assisted development from architecture through implementation.

## Author

**Cristian Cuda** — [cristiancuda.com](https://cristiancuda.com)

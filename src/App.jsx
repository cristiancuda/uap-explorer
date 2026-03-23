import { useState } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import TabNav from './components/TabNav';
import MapView from './components/MapView';
import TimelineView from './components/TimelineView';
import ShapesView from './components/ShapesView';
import InsightsView from './components/InsightsView';
import ChatSidebar from './components/ChatSidebar';
import SightingDrawer from './components/SightingDrawer';
import { useSightings } from './hooks/useSightings';
import { useStats } from './hooks/useStats';

const TABS = ['map', 'timeline', 'shapes', 'insights'];

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [filters, setFilters] = useState({ shape: '', decade: '', country: '', year: '' });
  const [selectedSighting, setSelectedSighting] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState('');

  const { sightings, loading, error } = useSightings(filters);
  const { stats } = useStats();

  function openChat(seedPrompt = '') {
    setChatSeed(seedPrompt);
    setIsChatOpen(true);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header onChatToggle={() => setIsChatOpen((o) => !o)} isChatOpen={isChatOpen} />
      <StatsBar stats={stats} />
      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {activeTab === 'map' && (
            <MapView
              sightings={sightings}
              loading={loading}
              error={error}
              filters={filters}
              onFiltersChange={setFilters}
              onSightingSelect={setSelectedSighting}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineView
              filters={filters}
              onFiltersChange={setFilters}
              onSwitchToMap={() => setActiveTab('map')}
            />
          )}
          {activeTab === 'shapes' && <ShapesView sightings={sightings} />}
          {activeTab === 'insights' && <InsightsView sightings={sightings} onAskClaude={openChat} />}
        </main>

        {/* Sighting detail drawer — inline flex panel, pushes map left */}
        <SightingDrawer
          sighting={selectedSighting}
          onClose={() => setSelectedSighting(null)}
          allSightings={sightings}
        />

        {/* Chat sidebar */}
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          seedPrompt={chatSeed}
          filters={filters}
          visibleCount={sightings.length}
        />
      </div>
    </div>
  );
}

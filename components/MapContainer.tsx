
import React, { useState } from 'react';
import TerminalPanel from './TerminalPanel';
import MapPanel from './MapPanel';
import { Entity, LlmTranscript } from '../types';

interface MapContainerProps {
  location: string;
  mapAscii: string;
  entities: Entity[];
  interactables: string[];
  lightMode: boolean;
  onEntityClick: (name: string) => void;
  onObjectClick: (name: string) => void;
  onExitClick?: (label?: string) => void;
  onContainerClick?: (x: number, y: number) => void;
  playerName?: string;
  debugTranscripts: LlmTranscript[];
  immediateLocation?: string;
}

const MapContainer: React.FC<MapContainerProps> = ({ location, mapAscii, entities, interactables, lightMode, onEntityClick, onObjectClick, onExitClick, onContainerClick, playerName, debugTranscripts, immediateLocation }) => {
  const [activeTab, setActiveTab] = useState('MAP');
  const [showTranscript, setShowTranscript] = useState(false);

  const recentTurns = debugTranscripts
    .filter(t => t.type === 'turn')
    .slice(-5)
    .reverse();

  const renderContent = () => {
    if (showTranscript) {
      return (
        <div className="space-y-3 text-xs leading-5 p-2">
          <div className="flex justify-between items-center">
            <div className="font-bold uppercase tracking-widest text-[10px]">LLM Transcript (Last 5 Turns)</div>
            <button 
              className={`text-[10px] px-2 py-[2px] border ${lightMode ? 'border-[#5d4037]/40 hover:bg-[#5d4037]/10' : 'border-green-800 hover:bg-green-900/40'}`}
              onClick={() => setShowTranscript(false)}
            >
              Close
            </button>
          </div>
          {recentTurns.length === 0 ? (
            <div className="italic opacity-60">No recent turns to display.</div>
          ) : recentTurns.map(t => (
            <div key={t.id} className={`border ${lightMode ? 'border-[#5d4037]/40 bg-[#5d4037]/5' : 'border-green-900 bg-black/30'} rounded p-2 space-y-2`}>
              <div className="flex justify-between text-[10px] uppercase opacity-70">
                <span>Turn {t.turn}</span>
                <span>Type: {t.type}</span>
              </div>
              <div>
                <div className="font-bold mb-1 text-[10px] tracking-widest">Prompt</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-5">{t.prompt || 'N/A'}</pre>
              </div>
              <div>
                <div className="font-bold mb-1 text-[10px] tracking-widest">Response</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-5">{t.response || 'N/A'}</pre>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'MAP') {
      return (
        <MapPanel
          location={location}
          mapAscii={mapAscii}
          entities={entities}
          interactables={interactables}
          onExitClick={onExitClick}
          onContainerClick={onContainerClick}
          playerName={playerName}
          immediateLocation={immediateLocation}
        />
      );
    }
    
    if (activeTab === 'ENTITIES') {
      return (
        <div className="space-y-2 text-sm p-2">
          {entities.length === 0 ? (
            <div className="opacity-50 italic">No souls nearby...</div>
          ) : (
            entities.map((e, i) => (
              <div 
                key={i} 
                className="flex justify-between border-b border-current pb-1 border-opacity-30 cursor-pointer hover:bg-green-500/10 p-1 rounded transition-colors group"
                onClick={() => onEntityClick(e.name)}
              >
                <span className="font-bold underline decoration-dotted underline-offset-4 decoration-current/30">{e.name}</span>
                <span className="opacity-70 text-xs group-hover:opacity-100 transition-opacity">[{e.status}]</span>
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === 'OBJECTS') {
      return (
        <ul className="list-square pl-4 space-y-1 text-sm p-2">
          {interactables.length === 0 ? (
            <li className="opacity-50 italic">Nothing of note.</li>
          ) : (
            interactables.map((item, i) => (
                <li 
                    key={i} 
                    className="cursor-pointer hover:bg-green-500/10 p-1 rounded transition-colors underline decoration-dotted underline-offset-4 decoration-current/30"
                    onClick={() => onObjectClick(item)}
                >
                    {item}
                </li>
            ))
          )}
        </ul>
      );
    }
  };

  return (
    <TerminalPanel 
      title="SECTOR DATA" 
      onTitleClick={() => setShowTranscript(true)}
      tabs={['MAP', 'ENTITIES', 'OBJECTS']}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className="h-full"
      lightMode={lightMode}
      variant="crt"
    >
      {renderContent()}
    </TerminalPanel>
  );
};

export default MapContainer;

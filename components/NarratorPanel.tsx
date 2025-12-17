
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogEntry } from '../types';

interface NarratorPanelProps {
  history: LogEntry[];
  onEntityClick: (name: string) => void;
  onObjectClick: (name: string) => void;
  lightMode: boolean;
  loading?: boolean;
}

const TypewriterText: React.FC<{ text: string; onComplete?: () => void; renderRich?: (text: string) => React.ReactNode }> = ({ text, onComplete, renderRich }) => {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const completedTextRef = useRef<string | null>(null);
  
  // Keep track of the latest callback without triggering effect re-runs
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
      onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // If we've already typed this text fully in this component instance, just show it.
    if (completedTextRef.current === text) {
        setDisplayed(text);
        setIsTyping(false);
        return;
    }

    setIsTyping(true);
    setDisplayed('');
    
    let charIndex = 0;
    const speed = 15; 
    
    const interval = setInterval(() => {
      charIndex++;
      setDisplayed(text.slice(0, charIndex));

      if (charIndex >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        completedTextRef.current = text;
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text]); // Only restart if text changes

  const content = renderRich ? renderRich(displayed) : displayed;

  return (
    <span>
      {content}
      {isTyping && <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse align-middle"></span>}
    </span>
  );
};

const NarratorPanel: React.FC<NarratorPanelProps> = ({ history, onEntityClick, onObjectClick, lightMode, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, loading, scrollToBottom]);

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => ({
        ...prev,
        [id]: !prev[id]
    }));
  };

  // Improved Metadata Colors
  const metaColor = lightMode ? "text-[#8d6e63]" : "text-teal-600";
  const linkColor = lightMode ? "text-[#b71c1c] font-bold hover:underline" : "text-green-300 hover:text-white";
  const narrativeLink = lightMode
    ? "font-semibold underline decoration-dotted underline-offset-4 text-[#2c1810] hover:text-[#b71c1c]"
    : "font-semibold underline decoration-dotted underline-offset-4 text-green-300 hover:text-white";
  const systemTextColor = lightMode ? "text-[#2c1810]" : "text-green-400";
  const userBoxBg = lightMode ? "bg-[#efebe0] border-[#5d4037]/30 text-[#4e342e]" : "bg-green-900/30 text-green-300 border-green-800/50";

  const renderRichText = (entry: LogEntry) => (text: string) => {
    const entities = entry.entities || [];
    if (!entities.length) return text;
    let nodes: React.ReactNode[] = [];
    let cursor = 0;
    const lowerText = text.toLowerCase();

    // Build a list of matches to replace
    const matches: { start: number; end: number; name: string }[] = [];
    entities.forEach(e => {
      const name = e.name;
      if (!name) return;
      const lowerName = name.toLowerCase();
      let idx = lowerText.indexOf(lowerName);
      while (idx !== -1) {
        matches.push({ start: idx, end: idx + lowerName.length, name });
        idx = lowerText.indexOf(lowerName, idx + lowerName.length);
      }
    });

    matches.sort((a, b) => a.start - b.start);

    matches.forEach((m, i) => {
      if (m.start > cursor) {
        nodes.push(text.slice(cursor, m.start));
      }
      nodes.push(
        <button
          key={`${entry.id}-ent-${i}-${m.start}`}
          className={narrativeLink}
          onClick={() => onEntityClick(m.name)}
        >
          {text.slice(m.start, m.end)}
        </button>
      );
      cursor = m.end;
    });

    if (cursor < text.length) {
      nodes.push(text.slice(cursor));
    }

    return <>{nodes}</>;
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pr-2 pb-4 scroll-smooth">
      <div className="flex flex-col gap-6">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          const isUser = entry.role === 'user';
          const hasMetadata = !isUser && entry.turnNumber !== undefined;
          
          return (
            <div key={entry.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              
              {/* Metadata Header for System Entries */}
              {hasMetadata && (
                  <div 
                    className={`text-[10px] font-bold tracking-widest mb-1 ml-2 ${metaColor} w-[98%] md:w-[95%] border-b border-current border-opacity-20 pb-0.5 flex justify-between`}
                    style={{ textShadow: 'none' }}
                  >
                     <span className={lightMode ? 'font-header' : ''}>TURN {entry.turnNumber} </span>
                     <span className={lightMode ? 'font-header' : ''}> DAY {entry.day} • {entry.location?.toUpperCase()}</span>
                  </div>
              )}

              <div 
                className={`max-w-[98%] md:max-w-[95%] rounded p-3 md:p-3 text-base md:text-lg leading-relaxed whitespace-pre-wrap terminal-text relative group border
                  ${isUser 
                    ? `${userBoxBg}` 
                    : `${systemTextColor} border-transparent`
                  }`}
              >
                {isUser && <span className={`block text-xs mb-1 opacity-70 ${lightMode ? 'text-[#8d6e63]' : 'text-green-600'}`}>COMMAND LOG:</span>}
                
                {isLast && !isUser ? (
                  <TypewriterText text={entry.text} onComplete={scrollToBottom} renderRich={renderRichText(entry)} />
                ) : (
                  <span>{renderRichText(entry)(entry.text)}</span>
                )}
              </div>

              {/* Tell Me More Section */}
              {hasMetadata && (
                  <div className="w-[95%] md:w-[85%] mt-1 ml-5">
                      <button 
                        onClick={() => toggleExpand(entry.id)}
                        className={`text-[10px] uppercase font-bold tracking-wider hover:opacity-100 opacity-60 transition-opacity flex items-center gap-1 ${lightMode ? 'text-[#5d4037]' : 'text-green-500'}`}
                      >
                         [{expandedEntries[entry.id] ? '-' : '+'}] TELL ME MORE
                      </button>
                      
                      {expandedEntries[entry.id] && (
                          <div className={`mt-2 p-2 border-l-2 ${lightMode ? 'border-[#5d4037]/30 bg-[#5d4037]/5' : 'border-green-800 bg-green-900/10'} text-sm`}>
                             
                             {/* Entities */}
                             <div className="mb-2">
                                <span className={`text-[10px] uppercase opacity-50 block mb-1 ${lightMode ? 'text-[#3e2723]' : 'text-green-400'}`}>Beings Present:</span>
                                {(!entry.entities || entry.entities.length === 0) ? (
                                    <span className="italic opacity-50 text-xs">None visible.</span>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {entry.entities.map((e, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => onEntityClick(e.name)}
                                                className={`underline decoration-dotted underline-offset-2 ${linkColor}`}
                                            >
                                                {e.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                             </div>

                             {/* Objects */}
                             <div>
                                <span className={`text-[10px] uppercase opacity-50 block mb-1 ${lightMode ? 'text-[#3e2723]' : 'text-green-400'}`}>Visible Objects:</span>
                                {(!entry.interactables || entry.interactables.length === 0) ? (
                                    <span className="italic opacity-50 text-xs">None visible.</span>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {entry.interactables.map((item, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => onObjectClick(item)}
                                                className={`underline decoration-dotted underline-offset-2 ${linkColor}`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                )}
                             </div>

                          </div>
                      )}
                  </div>
              )}

            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
            <div className="flex flex-col items-start mt-2 pl-2 animate-pulse w-[90%] md:w-[85%]">
                <div
                    className={`text-xs font-bold tracking-widest mb-1 ${metaColor}`}
                    style={{ textShadow: 'none' }}
                >
                    {'>'} GENERATING OUTCOME...
                </div>
                <div className={`text-[10px] opacity-60 ${lightMode ? 'text-[#5d4037]' : 'text-teal-800'}`}>
                   // Consulting historical archives...
                </div>
            </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default NarratorPanel;

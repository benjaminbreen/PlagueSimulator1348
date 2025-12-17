import React from 'react';
import { Container, ItemMetadata } from '../types';

interface ContainerModalProps {
  container: Container;
  lightMode: boolean;
  onClose: () => void;
  onTakeItem: (itemName: string) => void;
  onTakeAll: () => void;
}

const ContainerModal: React.FC<ContainerModalProps> = ({
  container,
  lightMode,
  onClose,
  onTakeItem,
  onTakeAll
}) => {
  const bgColor = lightMode ? 'bg-[#e6dfcf]' : 'bg-black';
  const borderColor = lightMode ? 'border-[#5d4037]' : 'border-green-700';
  const textColor = lightMode ? 'text-[#2c1810]' : 'text-green-400';
  const accentColor = lightMode ? 'text-[#b71c1c]' : 'text-green-500';
  const btnBg = lightMode
    ? "bg-[#5d4037]/10 border-[#5d4037]/30 hover:bg-[#5d4037]/20 text-[#3e2723]"
    : "bg-green-900/10 border-green-700 hover:bg-green-700/30 text-green-400";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-[90%] max-w-md border-2 ${borderColor} ${bgColor} ${textColor} font-mono shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`border-b-2 ${borderColor} p-4 flex justify-between items-center`}>
          <div>
            <div className="text-[10px] opacity-60 uppercase tracking-widest">Container</div>
            <div className={`text-lg font-bold ${accentColor}`}>
              {container.symbol} {container.name.toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl opacity-60 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>

        {/* Contents */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {container.searched && (!container.contents || container.contents.length === 0) ? (
            <div className="text-center italic opacity-60 py-8">
              Empty. Nothing but dust and cobwebs.
            </div>
          ) : (!container.contents || container.contents.length === 0) ? (
            <div className="text-center italic opacity-60 py-8">
              The container appears empty.
            </div>
          ) : (
            <div className="space-y-2">
              {container.contents.map((item, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center border ${borderColor} border-opacity-30 p-3 rounded transition-colors hover:bg-opacity-5 ${lightMode ? 'hover:bg-[#5d4037]' : 'hover:bg-green-500'}`}
                >
                  <span className="font-bold">{item}</span>
                  <button
                    onClick={() => onTakeItem(item)}
                    className={`border px-3 py-1 text-xs font-bold uppercase transition-all ${btnBg}`}
                  >
                    Take
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {container.contents && container.contents.length > 0 && (
          <div className={`border-t-2 ${borderColor} p-4 flex gap-2 justify-end`}>
            <button
              onClick={onTakeAll}
              className={`border px-4 py-2 text-sm font-bold uppercase transition-all ${btnBg}`}
            >
              Take All ({container.contents.length})
            </button>
            <button
              onClick={onClose}
              className={`border px-4 py-2 text-sm font-bold uppercase transition-all ${btnBg}`}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContainerModal;

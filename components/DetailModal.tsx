
import React from 'react';
import { ItemMetadata, EntityMetadata } from '../types';

interface DetailModalProps {
  title: string;
  type: 'item' | 'entity';
  data: ItemMetadata | EntityMetadata;
  lightMode: boolean;
  onClose: () => void;
  onAction?: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ title, type, data, lightMode, onClose, onAction }) => {
  // Styles
  const bg = lightMode ? "bg-[#fdf6e3]" : "bg-[#050505]";
  const border = lightMode ? "border-[#3e3832]" : "border-green-500";
  const text = lightMode ? "text-[#3e3832]" : "text-green-400";
  const highlight = lightMode ? "text-black" : "text-green-300";
  
  const isItem = type === 'item';
  const itemData = isItem ? (data as ItemMetadata) : null;
  const entityData = !isItem ? (data as EntityMetadata) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`relative w-[90%] max-w-md p-4 border-2 ${border} ${bg} ${text} shadow-[0_0_20px_rgba(0,0,0,0.5)] font-mono`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`border-b ${border} pb-2 mb-4 flex justify-between items-center`}>
          <h2 className={`text-xl font-bold uppercase tracking-wider ${highlight}`}>{title}</h2>
          <button onClick={onClose} className="hover:opacity-70 font-bold">[X]</button>
        </div>

        <div className="flex gap-4">
          {/* Portrait Box & Basic Info */}
          <div className="flex flex-col gap-2 shrink-0 w-[80px]">
              <div className={`w-[80px] h-[80px] border ${border} flex items-center justify-center text-5xl bg-black/10`}>
                {data.emoji}
              </div>
              
              {/* Entity Demographics below portrait */}
              {entityData && (
                  <div className="text-[10px] space-y-1 opacity-80 leading-tight">
                      <div className="flex justify-between"><span>AGE:</span> <span className="font-bold">{entityData.age || 'N/A'}</span></div>
                      <div className="flex justify-between"><span>SEX:</span> <span className="font-bold">{entityData.gender || 'N/A'}</span></div>
                      <div className="border-t border-current opacity-50 my-1"></div>
                      <div className="font-bold uppercase text-center">{entityData.profession || 'Unknown'}</div>
                      <div className="text-center italic text-[9px]">{entityData.relationship || 'Stranger'}</div>
                  </div>
              )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <p className="text-sm leading-relaxed italic opacity-90 border-l-2 border-current pl-3">
              "{data.description}"
            </p>
            
            {/* Stats Grid for Items */}
            {isItem && itemData && (
               <div className={`grid grid-cols-2 gap-2 text-xs mt-3 pt-2 border-t ${border} border-opacity-30 opacity-80`}>
                  <div>VAL: {itemData.value} Dinar</div>
                  <div>WGT: {itemData.weight}</div>
                  <div>TYPE: {itemData.isWearable ? 'Wearable' : 'Object'}</div>
                  <div>CRAFT: {itemData.craftable ? 'Yes' : 'No'}</div>
               </div>
            )}
            
            {/* Temperament for Entities */}
            {entityData && (
                <div className={`mt-3 pt-2 border-t ${border} border-opacity-30 opacity-80 text-xs`}>
                    <span className="font-bold">DISPOSITION:</span> {entityData.temperament}
                </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end gap-2">
           <button 
             onClick={onClose}
             className={`px-4 py-1 text-xs border ${border} opacity-70 hover:opacity-100 transition-opacity`}
           >
             CLOSE
           </button>
           {onAction && (
             <button 
                onClick={() => { onAction(); onClose(); }}
                className={`px-6 py-1 text-sm font-bold border ${border} ${lightMode ? 'bg-black text-white' : 'bg-green-700 text-black'} hover:opacity-80 transition-all`}
             >
                {isItem ? (itemData?.isWearable ? 'EQUIP' : 'INSPECT') : 'TALK'}
             </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default DetailModal;


import React from 'react';

interface AboutModalProps {
  onClose: () => void;
  lightMode: boolean;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, lightMode }) => {
  const bg = lightMode ? "bg-[#fdf6e3]" : "bg-[#0a0a0a]";
  const text = lightMode ? "text-[#2c1810]" : "text-gray-300";
  const border = lightMode ? "border-[#5d4037]" : "border-gray-800";
  const accent = lightMode ? "text-[#b71c1c]" : "text-green-500";
  const overlay = lightMode ? "bg-[#2c1810]/20" : "bg-black/80";

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center ${overlay} backdrop-blur-sm p-4`} onClick={onClose}>
      <div 
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto ${bg} ${text} border ${border} shadow-2xl p-8 md:p-12`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity p-2"
        >
            ✕
        </button>

        <div className="flex flex-col items-center mb-8">
            <h1 className={`text-4xl md:text-5xl font-bold tracking-tight mb-2 ${lightMode ? 'font-header' : 'font-sans-safe'}`}>
                PLAGUE: 1348
            </h1>
            <div className={`text-xs tracking-[0.3em] uppercase opacity-60`}>Damascus Survival Simulation</div>
        </div>

        <div className="space-y-8 font-serif leading-relaxed text-lg">
            
            <section>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 opacity-70 ${lightMode ? 'font-sans' : 'font-mono'}`}>About This Project</h3>
                <p>
                    <span className="italic">Plague: 1348</span> is an experimental historical survival RPG powered by Google Gemini 2.5. 
                    Set during the height of the Black Death in Damascus, it combines historical rigor with procedural storytelling.
                </p>
                <p className="mt-4">
                    Every narrative description, dialogue exchange, and map layout is generated in real-time based on your choices and a simulation of medieval humoral medicine.
                </p>
            </section>

            <section>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 opacity-70 ${lightMode ? 'font-sans' : 'font-mono'}`}>How to Play</h3>
                <ul className="list-disc pl-5 space-y-2 text-base">
                    <li><strong className={accent}>Survive.</strong> Your goal is to live through the outbreak or flee the city.</li>
                    <li><strong className={accent}>Mind your Humors.</strong> Balance your Blood, Phlegm, and Bile. Imbalance leads to sickness.</li>
                    <li><strong className={accent}>Think Historically.</strong> Modern solutions may fail. Use the tools and knowledge of the 14th century (Vinegar, Prayer, Isolation).</li>
                    <li><strong className={accent}>Input Commands.</strong> Use options 1-3 for standard actions, or Option 4 to type your own creative solution.</li>
                </ul>
            </section>

            <section>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 opacity-70 ${lightMode ? 'font-sans' : 'font-mono'}`}>Technology</h3>
                <p className="text-sm opacity-80">
                    Built with React, TypeScript, Tailwind CSS, and the Google GenAI SDK.
                    Map generation uses a dynamic ASCII tiling system interpreted from LLM outputs.
                </p>
            </section>

        </div>

        <div className="mt-12 pt-6 border-t border-current border-opacity-20 text-center text-sm opacity-50">
            A simulation by the Archives. Est 2025.
        </div>

      </div>
    </div>
  );
};

export default AboutModal;

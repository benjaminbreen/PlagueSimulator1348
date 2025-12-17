import React from 'react';

interface SymptomsPanelProps {
  health: number;
  symptoms: string[];
}

const SymptomsPanel: React.FC<SymptomsPanelProps> = ({ health, symptoms }) => {
  const hasSymptom = (key: string) => symptoms.some(s => s.toLowerCase().includes(key));

  // ASCII Components
  const head = hasSymptom('hallucination') ? '( @ o )' : '( - - )';
  const neck = hasSymptom('bubo_neck') ? '(BUBO)' : ' ||| ';
  const chest = hasSymptom('cough') ? '/COUGH\\' : '/  |  \\';
  const stomach = hasSymptom('vomiting') ? '[~~~~]' : '[    ]';
  const rArm = hasSymptom('bleeding') ? '/...\\' : '/ | \\';
  const lArm = hasSymptom('bubo_armpit') ? '/(O)\\' : '/ | \\';
  const groin = hasSymptom('bubo_groin') ? '(BUBO)' : '  ^  ';

  // Determine health color
  let healthColor = "text-green-500";
  if (health < 60) healthColor = "text-yellow-500";
  if (health < 30) healthColor = "text-red-500";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      
      {/* Ragdoll */}
      <pre className={`font-mono text-sm md:text-base leading-tight ${healthColor} transition-colors duration-500`}>
{`
    ${head}  <-- Head
      ${neck}   <-- Neck
    ${chest}
   ${lArm}${rArm}
    ${stomach}
      ${groin}   <-- Groin
     /  |  \\
    /   |   \\
   ==   ==
`}
      </pre>

      {/* Text List */}
      <div className="w-full text-xs md:text-sm border-t border-green-800/50 pt-2 mt-2">
        <div className="flex justify-between mb-1">
          <span className="text-green-400">VITALS:</span>
          <span className={`${healthColor} font-bold`}>{health}%</span>
        </div>
        <div className="text-green-600 mb-1">DETECTED PATHOGENS:</div>
        <ul className="list-disc pl-4 space-y-1">
          {symptoms.length === 0 ? (
            <li className="text-green-800 italic">None detected... yet.</li>
          ) : (
            symptoms.map((s, i) => (
              <li key={i} className="text-red-400 animate-pulse">{s.toUpperCase()}</li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default SymptomsPanel;

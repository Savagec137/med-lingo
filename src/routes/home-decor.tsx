// ============================================
// DÉCOR SAMU — EN ARRIÈRE-PLAN
// ============================================

// Styles pour le décor (injectés une seule fois)
const decorStyles = `
@keyframes float-particle {
  0%, 100% { transform: translateY(0px) scale(1); opacity: 0.15; }
  50% { transform: translateY(-40px) scale(1.5); opacity: 0.4; }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.15); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.1; }
}
@keyframes float-ambulance {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}
.float-particle { animation: float-particle 10s ease-in-out infinite; }
.pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.blink { animation: blink 1.8s ease-in-out infinite; }
.float-ambulance { animation: float-ambulance 3.5s ease-in-out infinite; }
`;

// Injecter les styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = decorStyles;
  document.head.appendChild(style);
}

// ============================================
// COMPOSANT DÉCOR — EXPORTÉ
// ============================================
export function SamuDecor() {
  return (
    <>
      {/* 1. Fond nuit */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      </div>

      {/* 2. Bâtiments (ville) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-4" style={{ height: '180px', alignItems: 'flex-end' }}>
          {[50, 65, 40, 85, 55, 75, 45, 95, 60, 80, 42, 70, 52, 88, 38, 92].map((height, i) => (
            <div
              key={i}
              className="bg-slate-700/70"
              style={{
                width: 20 + Math.random() * 30,
                height: height + 30,
                borderRadius: '3px 3px 0 0',
                opacity: 0.15 + Math.random() * 0.2,
              }}
            />
          ))}
        </div>
        
        {/* Fenêtres allumées */}
        {Array.from({ length: 35 }).map((_, i) => {
          const x = 2 + Math.random() * 96;
          const y = 30 + Math.random() * 120;
          const delay = Math.random() * 5;
          const size = 1.5 + Math.random() * 2;
          return (
            <div
              key={`window-${i}`}
              className="absolute bg-amber-200/60 rounded-sm blink"
              style={{
                left: `${x}%`,
                bottom: `${y}px`,
                width: size,
                height: size * 1.8,
                animationDelay: `${delay}s`,
                opacity: 0.2 + Math.random() * 0.5,
              }}
            />
          );
        })}
      </div>

      {/* 3. Lueurs de la ville */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-96 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-56 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* 4. Poste de régulation SAMU */}
      <div className="fixed z-0 pointer-events-none" style={{ top: '20px', right: '20px' }}>
        <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-3 min-w-[170px] shadow-[0_0_60px_rgba(6,182,212,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full blink" />
            <span className="text-[9px] font-mono text-cyan-400/70 font-bold tracking-wider">SAMU • EN LIGNE</span>
          </div>
          <div className="space-y-1.5 text-[9px] font-mono">
            <div className="flex justify-between text-cyan-400/50">
              <span>● Appels</span>
              <span className="text-cyan-400 font-bold">3</span>
            </div>
            <div className="flex justify-between text-cyan-400/50">
              <span>● Unités</span>
              <span className="text-green-400 font-bold">2</span>
            </div>
            <div className="h-px bg-cyan-500/10 my-1" />
            <div className="flex justify-between text-cyan-400/50">
              <span>ECG</span>
              <span className="text-cyan-400 font-bold tabular-nums">72 bpm</span>
            </div>
            <div className="flex justify-between text-cyan-400/50">
              <span>GPS</span>
              <span className="text-cyan-400/60">48.8566°N</span>
            </div>
          </div>
          <div className="mt-2 h-8 overflow-hidden rounded bg-cyan-950/20 border border-cyan-500/10 p-0.5">
            <svg viewBox="0 0 100 20" className="w-full h-full opacity-60">
              <polyline
                points="0,10 10,10 15,2 20,18 25,10 35,10 40,4 45,16 50,10 60,10 65,6 70,14 75,10 85,10 90,3 95,17 100,10"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 5. Ambulance */}
      <div className="fixed z-0 pointer-events-none float-ambulance" style={{ bottom: '110px', left: '5%' }}>
        <div className="relative">
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-2 bg-black/50 rounded-full blur-md" />
          <svg width="150" height="75" viewBox="0 0 150 75" className="drop-shadow-2xl">
            <rect x="18" y="20" width="100" height="36" rx="6" fill="white" stroke="#1e293b" strokeWidth="2.5" />
            <rect x="28" y="10" width="45" height="16" rx="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="2.5" />
            <rect x="56" y="28" width="12" height="20" fill="#ef4444" rx="2" />
            <rect x="44" y="36" width="36" height="12" fill="#ef4444" rx="2" />
            <circle cx="38" cy="60" r="10" fill="#1e293b" />
            <circle cx="38" cy="60" r="6" fill="#334155" />
            <circle cx="98" cy="60" r="10" fill="#1e293b" />
            <circle cx="98" cy="60" r="6" fill="#334155" />
            <circle cx="60" cy="5" r="6" fill="#22d3ee" className="pulse-glow" />
            <circle cx="60" cy="5" r="14" fill="#22d3ee/20" className="pulse-glow" />
            <circle cx="46" cy="5" r="4" fill="#ef4444" className="blink" style={{ animationDelay: '0.5s' }} />
            <circle cx="46" cy="5" r="10" fill="#ef4444/15" className="blink" style={{ animationDelay: '0.5s' }} />
            <circle cx="122" cy="32" r="4" fill="#fef08a" className="blink" style={{ animationDelay: '0.3s' }} />
            <circle cx="122" cy="42" r="4" fill="#fef08a" className="blink" style={{ animationDelay: '0.7s' }} />
          </svg>
        </div>
      </div>

      {/* 6. Particules */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => {
          const size = 1 + Math.random() * 3;
          const duration = 8 + Math.random() * 14;
          const delay = Math.random() * 10;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-cyan-400/20 float-particle"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* 7. Lueurs d'ambiance */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '3s' }} />
      </div>
    </>
  );
}
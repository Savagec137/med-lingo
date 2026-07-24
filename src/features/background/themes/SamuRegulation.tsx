// ============================================
// STYLES DES ANIMATIONS
// ============================================
const styles = `
@keyframes pulse-glow-samu {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
@keyframes blink-samu {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
@keyframes float-samu {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}
@keyframes scanline-samu {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes rain-samu {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes ecg-pulse-samu {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.15); }
}
.pulse-glow-samu { animation: pulse-glow-samu 2.5s ease-in-out infinite; }
.blink-samu { animation: blink-samu 1.8s ease-in-out infinite; }
.float-samu { animation: float-samu 3.5s ease-in-out infinite; }
.scanline-samu { animation: scanline-samu 4s linear infinite; }
.rain-samu { animation: rain-samu 6s linear infinite; }
.ecg-pulse-samu { animation: ecg-pulse-samu 1.5s ease-in-out infinite; }
`;

// Injecter les styles (les ajouter au HTML)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);
}// ============================================
// COUCHES DU DÉCOR
// ============================================

// 1. Arrière-plan : Ville nocturne
function CityLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Ciel nocturne */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#07111F] via-[#0A1A2E] to-[#0F2440]" />
      
      {/* Bâtiments */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around px-4" style={{ height: '180px', alignItems: 'flex-end' }}>
        {[55, 70, 42, 90, 60, 80, 48, 100, 65, 85, 45, 75, 52, 88, 40, 95].map((height, i) => {
          const width = 18 + Math.random() * 30;
          const opacity = 0.12 + Math.random() * 0.15;
          return (
            <div
              key={i}
              className="bg-slate-700/60"
              style={{
                width,
                height,
                borderRadius: '2px 2px 0 0',
                opacity,
              }}
            />
          );
        })}
      </div>

      {/* Fenêtres allumées */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = 2 + Math.random() * 96;
        const y = 30 + Math.random() * 120;
        const delay = Math.random() * 5;
        return (
          <div
            key={`window-${i}`}
            className="absolute w-1.5 h-2 bg-amber-200/40 rounded-sm blink-samu"
            style={{
              left: `${x}%`,
              bottom: `${y}px`,
              animationDelay: `${delay}s`,
              opacity: 0.15 + Math.random() * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}// 2. Plan intermédiaire : Écrans et données
function ScreensLayer() {
  // Statistiques
  const stats = {
    calls: 630,
    sorties: 750,
    tauxReponse: 98,
    attente: 12,
    enCours: 24,
    disponibles: 18,
  };

  return (
    <div className="absolute inset-0 pointer-events-none opacity-70">
      {/* Grand écran principal */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[80%] max-w-[800px] h-[140px] bg-black/60 backdrop-blur-sm border border-cyan-500/10 rounded-xl shadow-[0_0_80px_rgba(6,182,212,0.05)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent scanline-samu" />
        
        <div className="flex items-center justify-around h-full px-6">
          <div className="text-center">
            <div className="text-[10px] font-mono text-cyan-400/40 tracking-wider">APPELS</div>
            <div className="text-2xl font-mono text-cyan-400 font-bold">{stats.calls}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-cyan-400/40 tracking-wider">SORTIES</div>
            <div className="text-2xl font-mono text-cyan-400 font-bold">{stats.sorties}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-cyan-400/40 tracking-wider">TAUX RÉPONSE</div>
            <div className="text-2xl font-mono text-emerald-400 font-bold">{stats.tauxReponse}%</div>
          </div>
          <div className="h-10 w-px bg-cyan-500/20" />
          <div className="text-center">
            <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider">EN ATTENTE</div>
            <div className="text-xl font-mono text-amber-400 font-bold">{stats.attente}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider">EN COURS</div>
            <div className="text-xl font-mono text-cyan-400 font-bold">{stats.enCours}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider">DISPONIBLES</div>
            <div className="text-xl font-mono text-emerald-400 font-bold">{stats.disponibles}</div>
          </div>
        </div>
      </div>

      {/* Écran secondaire gauche : activité par heure */}
      <div className="absolute top-44 left-6 w-48 h-28 bg-black/60 backdrop-blur-sm border border-cyan-500/10 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider">ACTIVITÉ PAR HEURE</div>
            <div className="mt-2 flex items-end gap-1.5 h-12">
              {[40, 60, 45, 70, 55, 80, 65, 90, 75, 60, 50, 35].map((h, i) => (
                <div
                  key={i}
                  className="w-2.5 bg-cyan-400/30 rounded-t"
                  style={{ height: `${(h / 100) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Écran secondaire droit : constantes vitales */}
      <div className="absolute top-44 right-6 w-48 h-28 bg-black/60 backdrop-blur-sm border border-cyan-500/10 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider">CONSTANTES VITALES</div>
            <div className="mt-1 h-10 overflow-hidden">
              <svg viewBox="0 0 120 25" className="w-full h-full opacity-60">
                <polyline
                  points="0,12 10,12 15,3 20,21 25,12 35,12 40,5 45,19 50,12 60,12 65,7 70,17 75,12 85,12 90,4 95,20 100,12 110,12 115,6 120,18"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ecg-pulse-samu"
                />
              </svg>
            </div>
            <div className="text-[7px] font-mono text-cyan-400/20">● 72 bpm ● SpO₂ 98%</div>
          </div>
        </div>
      </div>

      {/* Écran des interventions */}
      <div className="absolute top-44 left-1/2 -translate-x-1/2 w-64 h-28 bg-black/60 backdrop-blur-sm border border-cyan-500/10 rounded-lg overflow-hidden">
        <div className="absolute inset-0 p-3">
          <div className="text-[8px] font-mono text-cyan-400/30 tracking-wider text-center">INTERVENTIONS EN COURS</div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-cyan-400/50">
              <span>● AVC - 08:32</span>
              <span className="text-emerald-400/60">En cours</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-cyan-400/50">
              <span>● IDM - 08:28</span>
              <span className="text-emerald-400/60">En cours</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-cyan-400/50">
              <span>● TRAUMA - 08:31</span>
              <span className="text-emerald-400/60">En cours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}// 3. Premier plan : Ambiance de la salle
function ControlRoomLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Reflets sur le sol */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/5 to-transparent" />
      <div className="absolute bottom-0 left-1/4 w-1/2 h-20 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-2xl" />
      
      {/* Lignes de sol */}
      <div className="absolute bottom-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      
      {/* Éclairage LED */}
      <div className="absolute bottom-10 left-10 w-12 h-1 bg-cyan-500/20 rounded-full blur-sm" />
      <div className="absolute bottom-10 right-10 w-12 h-1 bg-cyan-500/20 rounded-full blur-sm" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-24 h-1 bg-cyan-500/20 rounded-full blur-sm" />
    </div>
  );
}

// 4. Ambulances
function AmbulanceLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Ambulance 1 */}
      <div className="absolute bottom-28 left-[8%] float-samu">
        <div className="relative">
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-black/40 rounded-full blur-sm" />
          <svg width="130" height="60" viewBox="0 0 130 60" className="opacity-60 drop-shadow-lg">
            <rect x="12" y="15" width="85" height="30" rx="5" fill="white" stroke="#1e293b" strokeWidth="2" />
            <rect x="22" y="7" width="35" height="14" rx="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="2" />
            <rect x="46" y="22" width="9" height="16" fill="#ef4444" rx="2" />
            <rect x="37" y="28" width="27" height="9" fill="#ef4444" rx="2" />
            <circle cx="32" cy="48" r="8" fill="#1e293b" />
            <circle cx="32" cy="48" r="5" fill="#334155" />
            <circle cx="78" cy="48" r="8" fill="#1e293b" />
            <circle cx="78" cy="48" r="5" fill="#334155" />
            <circle cx="48" cy="3" r="5" fill="#22d3ee" className="pulse-glow-samu" />
            <circle cx="48" cy="3" r="10" fill="#22d3ee/15" className="pulse-glow-samu" />
            <circle cx="100" cy="24" r="3" fill="#fef08a" className="blink-samu" />
          </svg>
        </div>
      </div>

      {/* Ambulance 2 */}
      <div className="absolute bottom-24 right-[12%] float-samu" style={{ animationDelay: '1.5s' }}>
        <div className="relative opacity-40">
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-black/40 rounded-full blur-sm" />
          <svg width="100" height="50" viewBox="0 0 100 50" className="drop-shadow-lg">
            <rect x="10" y="12" width="65" height="24" rx="4" fill="white" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="18" y="6" width="28" height="11" rx="2" fill="#22d3ee" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="36" y="18" width="7" height="12" fill="#ef4444" rx="1.5" />
            <rect x="29" y="22" width="21" height="7" fill="#ef4444" rx="1.5" />
            <circle cx="25" cy="38" r="6" fill="#1e293b" />
            <circle cx="25" cy="38" r="4" fill="#334155" />
            <circle cx="60" cy="38" r="6" fill="#1e293b" />
            <circle cx="60" cy="38" r="4" fill="#334155" />
            <circle cx="38" cy="3" r="4" fill="#22d3ee" className="pulse-glow-samu" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// 5. Pluie
function RainLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
      {Array.from({ length: 60 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 4;
        const duration = 3 + Math.random() * 4;
        const height = 15 + Math.random() * 30;
        return (
          <div
            key={i}
            className="absolute w-px bg-cyan-400/30 rain-samu"
            style={{
              left: `${left}%`,
              top: `${-height}px`,
              height: `${height}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// 6. Lumières et effets
function LightsLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Gyrophares */}
      <div className="absolute bottom-32 left-[6%] w-20 h-20 bg-red-500/10 rounded-full blur-2xl pulse-glow-samu" />
      <div className="absolute bottom-32 left-[10%] w-20 h-20 bg-blue-500/10 rounded-full blur-2xl pulse-glow-samu" style={{ animationDelay: '1.2s' }} />
      
      {/* Lueurs des écrans */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[70%] h-36 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-44 left-6 w-56 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
      <div className="absolute top-44 right-6 w-56 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
      
      {/* Lueur d'ambiance */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
    </div>
  );
}

// ============================================
// EXPORT DU THÈME COMPLET
// ============================================

export function SamuRegulationTheme() {
  return (
    <>
      <CityLayer />
      <ScreensLayer />
      <ControlRoomLayer />
      <AmbulanceLayer />
      <RainLayer />
      <LightsLayer />
    </>
  );
}
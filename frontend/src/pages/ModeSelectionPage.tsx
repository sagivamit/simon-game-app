/**
 * Mode Selection Page
 * 
 * Epic 3: Allows users to choose between Solo Training and Competitive modes
 */

import { useNavigate } from 'react-router-dom';

export function ModeSelectionPage() {
  const navigate = useNavigate();

  const handleTrainingMode = () => {
    // Navigate to solo training (no server needed)
    navigate('/training');
  };

  const handleCompetitiveMode = () => {
    // Navigate to entry page for multiplayer
    navigate('/play');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-3 sm:p-4">
      <div className="bg-dark-card border border-neon-blue/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-neon-green drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]">🎮 Simon Says</h1>
        <p className="text-gray-300 text-center mb-6 sm:mb-8 text-sm sm:text-base">Choose Your Mode</p>
        
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={handleTrainingMode}
            className="w-full bg-neon-yellow/20 hover:bg-neon-yellow/30 active:bg-neon-yellow/40 border border-neon-yellow active:scale-98 text-neon-yellow font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-yellow"
            style={{ touchAction: 'manipulation' }}
          >
            🎯 Training Mode
            <div className="text-sm font-normal mt-1 opacity-90">
              Solo Play • 10 Cycles • Track Speed
            </div>
          </button>
          
          <button
            onClick={handleCompetitiveMode}
            className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 active:bg-neon-blue/40 border border-neon-blue active:scale-98 text-neon-blue font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-blue"
            style={{ touchAction: 'manipulation' }}
          >
            🏆 Competition Mode
            <div className="text-sm font-normal mt-1 opacity-90">
              Multiplayer • 5 Cycles • Invite Friends
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}


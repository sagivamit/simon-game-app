/**
 * Link Expired Page
 * 
 * Epic 2: Screen 20 - Shows when invite link has expired (5 minutes)
 */

import { useNavigate } from 'react-router-dom';

export function LinkExpiredPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-3 sm:p-4">
      <div className="bg-dark-card border border-neon-red/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neon-red mb-4 drop-shadow-[0_0_15px_rgba(255,0,64,0.8)]">
          LINK EXPIRED
        </h1>
        <p className="text-gray-300 mb-6">
          This invite link has expired. Invite links are valid for 5 minutes.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 active:bg-neon-blue/40 border border-neon-blue text-neon-blue font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-blue"
          style={{ touchAction: 'manipulation' }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}


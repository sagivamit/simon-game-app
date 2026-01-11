/**
 * Entry Page (Competition Flow)
 * 
 * Create or Join game selection.
 * Profile is already set from ProfileSetupPage.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinGame } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';

// SVG Icons
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export function EntryPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setSession } = useAuthStore();
  const { displayName, avatarId, avatarEmoji, isProfileComplete } = useProfileStore();
  const navigate = useNavigate();
  
  // Redirect to profile setup if no profile
  useEffect(() => {
    if (!isProfileComplete()) {
      navigate('/');
    }
  }, [isProfileComplete, navigate]);
  
  // Handle invite link with game code in URL
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setGameCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const handleCreateGame = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await createSession(displayName, avatarId);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await joinGame(displayName, avatarId, gameCode);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      
      // Epic 2: Check if error is "Link expired" and navigate to expired page
      if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('410')) {
        setTimeout(() => {
          navigate('/expired');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Mode Selection Screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 pt-16 sm:pt-20">
        {/* User Profile */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center">
            {avatarEmoji}
          </span>
          <span className="text-white text-lg font-medium">
            {displayName}
          </span>
        </div>
        
        {/* Title */}
        <h1 className="text-white text-2xl font-bold mb-8 tracking-wide">
          COMPETITION
        </h1>
        
        {/* Mode Cards Container */}
        <div className="w-full max-w-sm space-y-4">
          {/* Create Game Card */}
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left transition-all duration-150 hover:border-green-500/50 hover:bg-slate-800/80 active:scale-98 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <PlusIcon className="text-green-500" />
              </div>
              <div>
                <span className="text-green-500 font-bold text-xl block">
                  CREATE GAME
                </span>
                <span className="text-gray-400 text-sm">
                  Start a new room and invite friends
                </span>
              </div>
            </div>
          </button>
          
          {/* Join Game Card */}
          <button
            onClick={() => setMode('join')}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left transition-all duration-150 hover:border-blue-500/50 hover:bg-slate-800/80 active:scale-98"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <UsersIcon className="text-blue-500" />
              </div>
              <div>
                <span className="text-blue-500 font-bold text-xl block">
                  JOIN GAME
                </span>
                <span className="text-gray-400 text-sm">
                  Enter a game code to join
                </span>
              </div>
            </div>
          </button>
        </div>
        
        {/* Back to Mode Selection */}
        <button
          onClick={() => navigate('/mode')}
          className="mt-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <ArrowLeftIcon />
          <span>Back to Mode Selection</span>
        </button>
        
        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm max-w-sm w-full text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Join Game Form Screen
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 pt-16 sm:pt-20">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center">
          {avatarEmoji}
        </span>
        <span className="text-white text-lg font-medium">
          {displayName}
        </span>
      </div>
      
      {/* Title */}
      <h1 className="text-white text-2xl font-bold mb-8 tracking-wide">
        JOIN GAME
      </h1>
      
      {/* Join Form */}
      <form onSubmit={handleJoinGame} className="w-full max-w-sm">
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">
            Game Code
            {searchParams.get('join') && (
              <span className="ml-2 text-green-400 text-xs">
                ✓ From invite link
              </span>
            )}
          </label>
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF"
            maxLength={6}
            required
            className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors uppercase"
          />
        </div>
        
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || gameCode.length < 6}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-150 ${
            !loading && gameCode.length >= 6
              ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white active:scale-98'
              : 'bg-slate-800 text-gray-500 cursor-not-allowed'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? 'JOINING...' : 'JOIN GAME'}
        </button>
      </form>
      
      {/* Back Button */}
      <button
        onClick={() => setMode(null)}
        className="mt-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        style={{ touchAction: 'manipulation' }}
      >
        <ArrowLeftIcon />
        <span>Back</span>
      </button>
    </div>
  );
}

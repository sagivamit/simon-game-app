/**
 * Entry Page
 * 
 * Name + avatar selection page.
 * First screen players see.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinGame } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function EntryPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [avatarId, setAvatarId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setSession } = useAuthStore();
  const navigate = useNavigate();
  
  // Handle invite link with game code in URL
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setGameCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
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

  if (!mode) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-3 sm:p-4">
        <div className="bg-dark-card border border-neon-blue/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-neon-green drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]">🎮 Simon Says</h1>
          <p className="text-gray-300 text-center mb-6 sm:mb-8 text-sm sm:text-base">Multiplayer Edition</p>
          
          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-neon-green/20 hover:bg-neon-green/30 active:bg-neon-green/40 border border-neon-green active:scale-98 text-neon-green font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-green"
              style={{ touchAction: 'manipulation' }}
            >
              Create Game
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 active:bg-neon-blue/40 border border-neon-blue active:scale-98 text-neon-blue font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-blue"
              style={{ touchAction: 'manipulation' }}
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-3 sm:p-4">
      <div className="bg-dark-card border border-neon-blue/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <button
          onClick={() => setMode(null)}
          className="text-gray-600 hover:text-gray-800 active:text-gray-900 mb-4 text-sm sm:text-base"
        >
          ← Back
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-neon-blue drop-shadow-[0_0_10px_rgba(0,217,255,0.6)]">
          {mode === 'create' ? 'Create Game' : 'Join Game'}
        </h2>
        
        <form onSubmit={mode === 'create' ? handleCreateGame : handleJoinGame} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              minLength={3}
              maxLength={12}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          
          {mode === 'join' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Game Code
                {searchParams.get('join') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    ✅ Pre-filled from invite link
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
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent uppercase text-sm sm:text-base"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Avatar
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarId(id)}
                  className={`p-2.5 sm:p-4 rounded-lg border-2 transition-all duration-75 active:scale-95 min-h-[56px] min-w-[56px] ${
                    avatarId === id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="text-2xl sm:text-3xl">{['😀', '🎮', '🚀', '⚡', '🎨', '🎯', '🏆', '🌟'][parseInt(id) - 1]}</span>
                </button>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-98 disabled:bg-gray-400 text-white font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px]"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'Loading...' : mode === 'create' ? 'Create Game' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}

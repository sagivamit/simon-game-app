/**
 * Game Over Screen Component
 * 
 * Displays the end game results with:
 * - Winner celebration with crown
 * - Final scoreboard with medals
 * - Game stats
 * - Play Again / Home buttons
 * - Share score functionality
 */

import { useEffect, useState } from 'react';
import { soundService } from '../../services/soundService';
import { VictoryExplosion } from './VictoryExplosion';

// =============================================================================
// TYPES
// =============================================================================

interface GameOverScreenProps {
  winner: {
    playerId: string;
    name: string;
    score: number;
  } | null;
  finalScores: Array<{
    playerId: string;
    name: string;
    score: number;
    isEliminated?: boolean;
  }>;
  currentPlayerId: string;
  roundsPlayed: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
  gameCode: string;
}

// =============================================================================
// CONFETTI COMPONENT
// =============================================================================

const Confetti: React.FC = () => {
  const colors = ['#ff4136', '#ffdc00', '#2ecc40', '#0074d9', '#ff6b6b', '#ffd93d'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
};

// =============================================================================
// GAME OVER SCREEN COMPONENT
// =============================================================================

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  winner,
  finalScores,
  currentPlayerId,
  roundsPlayed,
  onPlayAgain,
  onGoHome,
  gameCode,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const isWinner = winner?.playerId === currentPlayerId;
  const isSoloGame = finalScores.length === 1;

  // Animate score count-up
  useEffect(() => {
    if (!winner) return;
    
    const targetScore = winner.score;
    const duration = 1500; // 1.5 seconds
    const steps = 30;
    const increment = targetScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [winner]);

  // Play victory sound on mount
  useEffect(() => {
    soundService.playVictory();
    
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Get medal emoji based on rank
  const getMedal = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  // Share score functionality
  const handleShare = async () => {
    const myScore = finalScores.find(s => s.playerId === currentPlayerId)?.score || 0;
    const rank = finalScores.findIndex(s => s.playerId === currentPlayerId) + 1;
    
    const shareText = isSoloGame
      ? `🎮 I reached Round ${roundsPlayed} in Simon Says with ${myScore} points! Can you beat my score?`
      : `🏆 I finished #${rank} in Simon Says with ${myScore} points! ${isWinner ? '👑 WINNER!' : ''}`;
    
    const shareUrl = `${window.location.origin}/?join=${gameCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Simon Says Score',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error - fallback to copy
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText + '\n' + shareUrl);
        }
      }
    } else {
      copyToClipboard(shareText + '\n' + shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Epic 8: Get top 3 for podium
  const topThree = finalScores.slice(0, 3);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Epic 14: Victory Explosion (neon particles) */}
      {isWinner && <VictoryExplosion trigger={showConfetti} />}
      
      {/* Epic 14: Confetti (fallback) */}
      {showConfetti && !isWinner && <Confetti />}
      
      <div className="relative z-10 w-full max-w-md">
        {/* Epic 11: Game Over Title with neon styling */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-neon-green mb-2 drop-shadow-[0_0_20px_rgba(0,255,65,0.8)]">
            🎉 FINAL RESULTS 🎉
          </h1>
        </div>

        {/* Epic 8: 3-Tier Podium (Multiplayer only) */}
        {!isSoloGame && topThree.length > 0 && (
          <div className="mb-6">
            <div className="flex items-end justify-center gap-2 mb-4" style={{ height: '200px' }}>
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center" style={{ order: 0 }}>
                  <div className="text-3xl mb-2">🥈</div>
                  <div className="bg-dark-card border border-neon-blue/50 rounded-t-xl p-3 text-center w-20 shadow-neon-blue">
                    <div className="text-neon-blue text-sm font-bold drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]">
                      {topThree[1].name}
                    </div>
                    <div className="text-neon-blue text-xs mt-1">{topThree[1].score} pts</div>
                  </div>
                  <div className="bg-neon-blue/30 h-16 w-20 rounded-b-xl"></div>
                </div>
              )}
              
              {/* 1st Place (Tallest) */}
              {topThree[0] && (
                <div className="flex flex-col items-center" style={{ order: 1 }}>
                  <div className="text-4xl mb-2 animate-bounce">👑</div>
                  <div className="bg-dark-card border-2 border-neon-green rounded-t-xl p-4 text-center w-24 shadow-neon-green">
                    <div className="text-neon-green text-base font-bold drop-shadow-[0_0_10px_rgba(0,255,65,0.8)]">
                      {topThree[0].name}
                    </div>
                    <div className="text-neon-green text-sm mt-1">{topThree[0].score} pts</div>
                  </div>
                  <div className="bg-neon-green/40 h-24 w-24 rounded-b-xl"></div>
                </div>
              )}
              
              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center" style={{ order: 2 }}>
                  <div className="text-3xl mb-2">🥉</div>
                  <div className="bg-dark-card border border-neon-yellow/50 rounded-t-xl p-3 text-center w-20 shadow-neon-yellow">
                    <div className="text-neon-yellow text-sm font-bold drop-shadow-[0_0_8px_rgba(255,235,0,0.6)]">
                      {topThree[2].name}
                    </div>
                    <div className="text-neon-yellow text-xs mt-1">{topThree[2].score} pts</div>
                  </div>
                  <div className="bg-neon-yellow/30 h-12 w-20 rounded-b-xl"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Epic 11: Winner Section (Solo or if no podium) */}
        {winner && (isSoloGame || finalScores.length < 3) && (
          <div className="bg-dark-card border-2 border-neon-green rounded-2xl p-6 mb-4 text-center relative overflow-hidden shadow-neon-green">
            <div className="relative z-10">
              <div className="text-5xl mb-2 animate-bounce">👑</div>
              <h2 className="text-2xl font-bold text-neon-green mb-2 drop-shadow-[0_0_10px_rgba(0,255,65,0.8)]">
                {isSoloGame ? 'GREAT JOB!' : 'WINNER!'}
              </h2>
              <div className="text-gray-200 text-xl font-semibold mb-1">
                {winner.name}
              </div>
              <div className="text-4xl font-bold text-neon-green drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]">
                {animatedScore} <span className="text-lg">points</span>
              </div>
            </div>
          </div>
        )}

        {/* Epic 11: Full Scoreboard with neon styling */}
        {!isSoloGame && finalScores.length > 0 && (
          <div className="bg-dark-card border border-neon-blue/30 rounded-2xl p-4 mb-4">
            <h3 className="text-neon-blue font-bold text-center mb-3 text-sm uppercase tracking-wide drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]">
              Final Standings
            </h3>
            
            <div className="space-y-2">
              {finalScores.map((player, index) => {
                const isCurrentPlayer = player.playerId === currentPlayerId;
                const rank = index + 1;
                
                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      isCurrentPlayer
                        ? 'bg-neon-blue/20 border border-neon-blue scale-105'
                        : rank <= 3
                          ? 'bg-dark-surface border border-gray-800'
                          : 'bg-dark-surface/50 border border-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center">
                        {getMedal(rank)}
                      </span>
                      <span className="text-gray-200 font-medium">
                        {player.name}
                        {isCurrentPlayer && <span className="text-xs ml-1 text-neon-blue">(you)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neon-green font-bold drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]">
                        {player.score} pts
                      </span>
                      {player.isEliminated && (
                        <span className="text-neon-red text-xs">💀</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Epic 11: Game Stats with neon styling */}
        <div className="bg-dark-card border border-neon-blue/20 rounded-xl p-4 mb-6">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-neon-blue drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]">{roundsPlayed}</div>
              <div className="text-gray-400 text-xs">Rounds</div>
            </div>
            <div className="border-l border-gray-700" />
            <div>
              <div className="text-2xl font-bold text-neon-green drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]">
                {finalScores.find(s => s.playerId === currentPlayerId)?.score || 0}
              </div>
              <div className="text-gray-400 text-xs">Your Score</div>
            </div>
            {!isSoloGame && (
              <>
                <div className="border-l border-gray-700" />
                <div>
                  <div className="text-2xl font-bold text-neon-yellow drop-shadow-[0_0_8px_rgba(255,235,0,0.6)]">
                    #{finalScores.findIndex(s => s.playerId === currentPlayerId) + 1}
                  </div>
                  <div className="text-gray-400 text-xs">Your Rank</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Epic 11: Action Buttons with neon styling */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full bg-neon-green/20 hover:bg-neon-green/30 active:bg-neon-green/40 border border-neon-green text-neon-green font-bold py-4 px-6 rounded-xl transition-all duration-100 active:scale-95 text-lg flex items-center justify-center gap-2 shadow-neon-green"
            style={{ touchAction: 'manipulation' }}
          >
            🔄 PLAY AGAIN
          </button>

          <button
            onClick={onGoHome}
            className="w-full bg-dark-surface hover:bg-gray-800 active:bg-gray-700 border border-gray-700 text-gray-300 font-bold py-4 px-6 rounded-xl transition-all duration-100 active:scale-95 text-lg flex items-center justify-center gap-2"
            style={{ touchAction: 'manipulation' }}
          >
            🏠 HOME
          </button>

          <button
            onClick={handleShare}
            className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 active:bg-neon-blue/40 border border-neon-blue text-neon-blue font-bold py-3 px-6 rounded-xl transition-all duration-100 active:scale-95 flex items-center justify-center gap-2 shadow-neon-blue"
            style={{ touchAction: 'manipulation' }}
          >
            📤 SHARE SCORE
          </button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GameOverScreen;

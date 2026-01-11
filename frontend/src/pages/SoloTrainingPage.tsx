/**
 * Solo Training Page
 * 
 * Epic 3: 10-cycle solo training mode with local speed metrics
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSoloTrainingStore } from '../store/soloTrainingStore';
import { CircularSimonBoard } from '../components/game/CircularSimonBoard';
import { soundService } from '../services/soundService';

export function SoloTrainingPage() {
  const navigate = useNavigate();
  const {
    isActive,
    round,
    maxCycles,
    sequence,
    playerSequence,
    isShowingSequence,
    isInputPhase,
    isInputLocked,
    cycleTimes,
    averageTime,
    fastestTime,
    isComplete,
    startTraining,
    resetTraining,
    handleColorTap,
  } = useSoloTrainingStore();

  // Initialize on mount
  useEffect(() => {
    if (!isActive && !isComplete) {
      startTraining();
    }
  }, []);

  // Handle color click
  const handleColorClick = (color: typeof sequence[0]) => {
    handleColorTap(color);
  };

  // Handle back to menu
  const handleBackToMenu = () => {
    resetTraining();
    navigate('/mode');
  };

  // Handle retrain
  const handleRetrain = () => {
    resetTraining();
    startTraining();
  };

  // Epic 11: Render training complete screen (Neon Dark Mode)
  if (isComplete) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-3 sm:p-4">
        <div className="bg-dark-card border border-neon-green/30 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-neon-green drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]">🎯 TRAINING DONE</h1>
          
          <div className="space-y-4 mb-6">
            <div className="bg-dark-surface border border-neon-blue/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Cycles Completed</div>
              <div className="text-2xl font-bold text-neon-blue">{maxCycles}/{maxCycles}</div>
            </div>
            
            <div className="bg-dark-surface border border-neon-yellow/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Average Time</div>
              <div className="text-2xl font-bold text-neon-yellow drop-shadow-[0_0_8px_rgba(255,235,0,0.6)]">
                {averageTime > 0 ? (averageTime / 1000).toFixed(2) : '0.00'}s
              </div>
            </div>
            
            <div className="bg-dark-surface border border-neon-green/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Fastest Time</div>
              <div className="text-2xl font-bold text-neon-green drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]">
                {fastestTime !== Infinity ? (fastestTime / 1000).toFixed(2) : 'N/A'}s
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleRetrain}
              className="w-full bg-neon-green/20 hover:bg-neon-green/30 active:bg-neon-green/40 border border-neon-green active:scale-98 text-neon-green font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px] shadow-neon-green"
              style={{ touchAction: 'manipulation' }}
            >
              🔄 RE-TRAIN
            </button>
            
            <button
              onClick={handleBackToMenu}
              className="w-full bg-dark-surface hover:bg-gray-800 active:bg-gray-700 border border-gray-700 active:scale-98 text-gray-300 font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px]"
              style={{ touchAction: 'manipulation' }}
            >
              🏠 MAIN MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Epic 11: Render game board (Neon Dark Mode)
  if (isActive) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-2 sm:p-4">
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Epic 11: Cycle counter with neon styling */}
          <div className="bg-dark-card border border-neon-blue/30 rounded-xl sm:rounded-2xl p-3 mb-3 w-full text-center">
            <div className="text-neon-blue text-sm mb-1 drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]">Cycle {round}/{maxCycles}</div>
            {averageTime > 0 && (
              <div className="text-gray-400 text-xs">
                Avg: {(averageTime / 1000).toFixed(2)}s | Fastest: {fastestTime !== Infinity ? (fastestTime / 1000).toFixed(2) : 'N/A'}s
              </div>
            )}
          </div>
          
          <CircularSimonBoard
            sequence={sequence}
            round={round}
            isShowingSequence={isShowingSequence}
            isInputPhase={isInputPhase}
            playerSequence={playerSequence}
            canSubmit={isInputLocked}
            lastResult={null}
            onColorClick={handleColorClick}
            onSubmit={() => {}} // Not used in implicit submission
            disabled={false}
            secondsRemaining={0}
            timerColor="green"
            isTimerPulsing={false}
            isInputLocked={isInputLocked}
          />
          
          {/* Epic 11: Back button with neon styling */}
          <button
            onClick={handleBackToMenu}
            className="mt-6 bg-dark-surface hover:bg-gray-800 active:bg-gray-700 border border-gray-700 active:scale-95 text-gray-300 font-medium py-2 px-4 rounded-lg transition-all duration-75 text-sm min-h-[44px]"
            style={{ touchAction: 'manipulation' }}
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Epic 11: Loading/initializing (Neon Dark Mode)
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-neon-blue text-xl drop-shadow-[0_0_10px_rgba(0,217,255,0.6)]">Initializing training...</div>
    </div>
  );
}


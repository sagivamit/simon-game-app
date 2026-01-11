/**
 * Solo Training Store
 * 
 * Epic 3: Manages solo training mode state (client-only, no server)
 */

import { create } from 'zustand';
import type { Color } from '../shared/types';
import { soundService } from '../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface SoloTrainingStore {
  // Game state
  isActive: boolean;
  round: number;
  maxCycles: number;
  sequence: Color[];
  currentInputIndex: number;
  playerSequence: Color[];
  isShowingSequence: boolean;
  isInputPhase: boolean;
  isInputLocked: boolean;
  
  // Metrics (Epic 3: Track speed)
  cycleTimes: number[]; // Finish time for each cycle (in ms)
  averageTime: number; // Average time across all cycles
  fastestTime: number; // Fastest cycle time
  
  // Current cycle timing
  cycleStartTime: number | null; // performance.now() when input phase started
  cycleFinishTime: number | null; // performance.now() when sequence completed
  
  // Game over
  isComplete: boolean;
  
  // Actions
  startTraining: () => void;
  resetTraining: () => void;
  handleColorTap: (color: Color) => void;
  nextCycle: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useSoloTrainingStore = create<SoloTrainingStore>((set, get) => ({
  // Initial state
  isActive: false,
  round: 1,
  maxCycles: 10,
  sequence: [],
  currentInputIndex: 0,
  playerSequence: [],
  isShowingSequence: false,
  isInputPhase: false,
  isInputLocked: false,
  cycleTimes: [],
  averageTime: 0,
  fastestTime: Infinity,
  cycleStartTime: null,
  cycleFinishTime: null,
  isComplete: false,
  
  /**
   * Start training session
   */
  startTraining: () => {
    // Initialize audio
    soundService.init();
    
    // Generate first sequence
    const firstSequence = generateSequence(1);
    
    set({
      isActive: true,
      round: 1,
      sequence: firstSequence,
      currentInputIndex: 0,
      playerSequence: [],
      isShowingSequence: true,
      isInputPhase: false,
      isInputLocked: false,
      cycleTimes: [],
      averageTime: 0,
      fastestTime: Infinity,
      cycleStartTime: null,
      cycleFinishTime: null,
      isComplete: false,
    });
    
    // Sequence showing will be handled by component
    // The component will emit sequence_complete, then we start input phase
  },
  
  /**
   * Reset training session
   */
  resetTraining: () => {
    set({
      isActive: false,
      round: 1,
      sequence: [],
      currentInputIndex: 0,
      playerSequence: [],
      isShowingSequence: false,
      isInputPhase: false,
      isInputLocked: false,
      cycleTimes: [],
      averageTime: 0,
      fastestTime: Infinity,
      cycleStartTime: null,
      cycleFinishTime: null,
      isComplete: false,
    });
  },
  
  /**
   * Handle color tap (Epic 5: Implicit Submission)
   */
  handleColorTap: (color: Color) => {
    const state = get();
    
    if (!state.isInputPhase || state.isInputLocked || state.isShowingSequence) {
      return;
    }
    
    // Validate tap
    const expectedColor = state.sequence[state.currentInputIndex];
    const isCorrect = color === expectedColor;
    
    if (!isCorrect) {
      // Epic 9: Wrong tap - trigger Razz (harsh buzz)
      soundService.playRazz();
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Strong vibration
      }
      
      set({
        isInputLocked: true,
      });
      
      // Reset after showing error
      setTimeout(() => {
        get().resetTraining();
      }, 2000);
      return;
    }
    
    // Correct tap
    soundService.playColorClick(color);
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    const newPlayerSequence = [...state.playerSequence, color];
    const newInputIndex = state.currentInputIndex + 1;
    const isComplete = newInputIndex >= state.sequence.length;
    
    if (isComplete) {
      // Epic 3: Record finish time
      const finishTime = performance.now();
      const cycleTime = state.cycleStartTime 
        ? finishTime - state.cycleStartTime 
        : 0;
      
      const newCycleTimes = [...state.cycleTimes, cycleTime];
      const newAverageTime = newCycleTimes.reduce((a, b) => a + b, 0) / newCycleTimes.length;
      const newFastestTime = Math.min(state.fastestTime, cycleTime);
      
      set({
        isInputLocked: true,
        playerSequence: newPlayerSequence,
        currentInputIndex: newInputIndex,
        cycleFinishTime: finishTime,
        cycleTimes: newCycleTimes,
        averageTime: newAverageTime,
        fastestTime: newFastestTime === Infinity ? cycleTime : newFastestTime,
      });
      
      // Check if training is complete (10 cycles)
      if (state.round >= state.maxCycles) {
        set({ isComplete: true });
      } else {
        // Move to next cycle after delay
        setTimeout(() => {
          get().nextCycle();
        }, 2000);
      }
    } else {
      set({
        playerSequence: newPlayerSequence,
        currentInputIndex: newInputIndex,
      });
    }
  },
  
  /**
   * Advance to next cycle
   */
  nextCycle: () => {
    const state = get();
    
    if (state.round >= state.maxCycles) {
      set({ isComplete: true });
      return;
    }
    
    // Generate longer sequence
    const newSequence = generateSequence(state.round + 1);
    
    set({
      round: state.round + 1,
      sequence: newSequence,
      currentInputIndex: 0,
      playerSequence: [],
      isShowingSequence: true,
      isInputPhase: false,
      isInputLocked: false,
      cycleStartTime: null,
      cycleFinishTime: null,
    });
    
    // Start showing sequence
    setTimeout(() => {
      const currentState = get();
      if (currentState.isActive) {
        setTimeout(() => {
          set({
            isShowingSequence: false,
            isInputPhase: true,
            cycleStartTime: performance.now(),
          });
        }, calculateSequenceDisplayTime(currentState.sequence) + 500);
      }
    }, 500);
  },
}));

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate random sequence
 */
function generateSequence(length: number): Color[] {
  const colors: Color[] = ['red', 'blue', 'yellow', 'green'];
  const sequence: Color[] = [];
  
  for (let i = 0; i < length; i++) {
    sequence.push(colors[Math.floor(Math.random() * colors.length)]);
  }
  
  return sequence;
}

/**
 * Calculate total time to display sequence
 */
function calculateSequenceDisplayTime(sequence: Color[]): number {
  const SHOW_DURATION = 600;
  const SHOW_GAP = 200;
  return sequence.length * (SHOW_DURATION + SHOW_GAP);
}


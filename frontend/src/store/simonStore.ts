/**
 * Simon Game Store
 * 
 * Manages Simon game state and WebSocket event handling.
 */

import { create } from 'zustand';
import type { Color, SimonGameState } from '../shared/types';
import { socketService } from '../services/socketService';
import { soundService } from '../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface SimonStore {
  // Game state
  gameState: SimonGameState | null;
  isShowingSequence: boolean;
  currentSequence: Color[];
  currentRound: number;
  currentPlayerId: string | null; // Track current player for event filtering
  
  // Input phase state
  isInputPhase: boolean;
  playerSequence: Color[];
  canSubmit: boolean;
  currentInputIndex: number; // Track which position in sequence we're at
  isInputLocked: boolean; // Lock input after completion or error
  
  // Timer state (Step 3)
  timeoutAt: number | null;
  timeoutSeconds: number;
  secondsRemaining: number;
  timerColor: 'green' | 'yellow' | 'red';
  isTimerPulsing: boolean;
  
  // Step 4: Competitive Multiplayer
  scores: Record<string, number>;
  playerStatuses: Record<string, 'playing' | 'eliminated' | 'spectating'>;
  submittedPlayers: string[]; // Players who submitted this round
  isEliminated: boolean;
  roundResult: {
    roundWinner: { playerId: string; name: string } | null;
    eliminations: Array<{ playerId: string; name: string; reason: string }>;
  } | null;
  
  // Game Over state
  isGameOver: boolean;
  gameWinner: { playerId: string; name: string; score: number } | null;
  finalScores: Array<{ playerId: string; name: string; score: number; isEliminated?: boolean }>;
  
  // Result state
  lastResult: {
    isCorrect: boolean;
    playerName: string;
  } | null;
  
  // UI state
  message: string;
  isGameActive: boolean;
  showGlitch: boolean; // Epic 14: Trigger glitch effect on error
  
  // Epic 12: Tempo scaling
  showDuration: number; // Current show duration (ms)
  showGap: number;      // Current gap duration (ms)
  
  // Actions
  initializeListeners: () => void;
  cleanup: () => void;
  resetGame: () => void;
  setCurrentPlayerId: (playerId: string) => void; // Set current player for event filtering
  addColorToSequence: (color: Color) => void;
  submitTap: (gameCode: string, playerId: string, color: Color) => void; // Implicit submission - validate each tap
  submitSequence: (gameCode: string, playerId: string) => void; // Keep for backward compatibility
  clearPlayerSequence: () => void;
  startTimer: (timeoutAt: number, timeoutSeconds: number) => void;
  stopTimer: () => void;
}

// =============================================================================
// STORE
// =============================================================================

// Track timer interval (Step 3)
let timerInterval: number | null = null;
let lastBeepSecond: number | null = null; // Track last beep to avoid duplicate beeps

export const useSimonStore = create<SimonStore>((set, get) => ({
  // Initial state
  gameState: null,
  isShowingSequence: false,
  currentSequence: [],
  currentRound: 1,
  currentPlayerId: null,
  isInputPhase: false,
  playerSequence: [],
  canSubmit: false,
  currentInputIndex: 0,
  isInputLocked: false,
  timeoutAt: null,
  timeoutSeconds: 0,
  secondsRemaining: 0,
  timerColor: 'green',
  isTimerPulsing: false,
  scores: {},
  playerStatuses: {},
  submittedPlayers: [],
  isEliminated: false,
  roundResult: null,
  isGameOver: false,
  gameWinner: null,
  finalScores: [],
  lastResult: null,
  message: 'Waiting for game to start...',
  isGameActive: false,
  showGlitch: false,
  showDuration: 600, // Epic 12: Base tempo
  showGap: 200,      // Epic 12: Base gap
  
  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  
  /**
   * Initialize WebSocket listeners for Simon events
   */
  initializeListeners: () => {
    console.log('🎮 Initializing Simon listeners');
    
    // Get socket (it should be connected by now)
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('❌ Socket not available');
      return;
    }
    
    if (!socket.connected) {
      console.warn('⚠️ Socket not connected yet, waiting for connection...');
      // Wait for socket to connect, then initialize
      socket.once('connect', () => {
        console.log('✅ Socket connected, now initializing Simon listeners');
        get().initializeListeners();
      });
      return;
    }
    
    console.log('✅ Socket already connected, setting up Simon listeners');
    console.log('🔍 Socket ID:', socket.id);
    
    // DEBUG: Listen for ALL events
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Received event: ${eventName}`, args);
    });
    
    // Listen for sequence display (Epic 12: Includes tempo info)
    socket.on('simon:show_sequence', (data: { round: number; sequence: Color[]; showDuration?: number; showGap?: number }) => {
      console.log('🎨🎨🎨 Received show_sequence:', data);
      
      // Epic 12: Update tempo based on cycle
      const duration = data.showDuration || 600; // Default to base tempo
      const gap = data.showGap || 200; // Default to base gap
      
      set({
        currentRound: data.round,
        currentSequence: data.sequence,
        isShowingSequence: true,
        message: `Round ${data.round} - Watch the sequence!`,
        isGameActive: true,
        showDuration: duration, // Epic 12: Store tempo
        showGap: gap,           // Epic 12: Store gap
      });
    });
    
    // Listen for sequence complete
    socket.on('simon:sequence_complete', () => {
      console.log('✅ Sequence complete');
      
      set({
        isShowingSequence: false,
        message: 'Get ready to repeat the sequence...',
      });
    });
    
    // Listen for input phase (Step 2 & Step 3)
    socket.on('simon:input_phase', (data: { round: number; timeoutAt: number; timeoutSeconds: number }) => {
      console.log('🎮 Input phase started:', data);
      
      set({
        isInputPhase: true,
        playerSequence: [],
        canSubmit: false,
        currentInputIndex: 0,
        isInputLocked: false,
        lastResult: null,
        message: 'Your turn! Click the colors in order',
      });
      
      // Step 3: Start countdown timer
      const store = get();
      store.startTimer(data.timeoutAt, data.timeoutSeconds);
    });
    
    // Listen for result (Step 2 & Step 3)
    socket.on('simon:result', (data: { playerId: string; playerName: string; isCorrect: boolean; correctSequence: Color[] }) => {
      console.log('📊 Result received:', data);
      
      // Step 3: Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play success or error sound
      if (data.isCorrect) {
        soundService.playSuccess();
      } else {
        soundService.playError();
      }
      
      set({
        isInputPhase: false,
        lastResult: {
          isCorrect: data.isCorrect,
          playerName: data.playerName,
        },
        message: data.isCorrect 
          ? `✅ ${data.playerName} got it correct! Next round coming...`
          : `❌ ${data.playerName} got it wrong. Correct: ${data.correctSequence.join(', ')}`,
      });
    });
    
    // Listen for timeout (Step 3)
    socket.on('simon:timeout', (data: { playerId: string; playerName: string; correctSequence: Color[] }) => {
      console.log('⏰ Timeout received:', data);
      
      // Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play timeout sound
      soundService.playTimeout();
      
      set({
        isInputPhase: false,
        lastResult: {
          isCorrect: false,
          playerName: data.playerName,
        },
        message: `⏰ Time's up! ${data.playerName} ran out of time. Correct: ${data.correctSequence.join(', ')}`,
      });
    });
    
    // Listen for player submitted (Step 4)
    socket.on('simon:player_submitted', (data: { playerId: string; playerName: string }) => {
      console.log('📝 Player submitted:', data.playerName);
      
      set((state) => ({
        submittedPlayers: [...state.submittedPlayers, data.playerId],
        message: `${data.playerName} submitted! ✅`,
      }));
    });
    
    // Listen for round result (Step 4)
    socket.on('simon:round_result', (data: any) => {
      console.log('🏁 Round result:', data);
      
      // Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play success sound if there's a winner
      if (data.roundWinner) {
        soundService.playSuccess();
      }
      
      set({
        isInputPhase: false,
        roundResult: {
          roundWinner: data.roundWinner,
          eliminations: data.eliminations,
        },
        scores: data.scores,
        playerStatuses: data.playerStatuses,
        submittedPlayers: [], // Clear for next round
        message: data.roundWinner 
          ? `🏆 ${data.roundWinner.name} wins the round! +1 pt`
          : '⚠️ No winner this round',
      });
      
      // Check if current player was eliminated
      const playerId = get().gameState?.playerStates ? Object.keys(get().gameState!.playerStates)[0] : null;
      if (playerId && data.playerStatuses[playerId] === 'eliminated') {
        set({ isEliminated: true });
      }
    });
    
    // Listen for game finished (Step 4)
    socket.on('simon:game_finished', (data: { winner: any; finalScores: any[] }) => {
      console.log('🏆 Game finished:', data);
      
      // Note: Victory sound is played by GameOverScreen component
      
      set({
        isShowingSequence: false,
        isGameActive: false,
        isInputPhase: false,
        isGameOver: true,
        gameWinner: data.winner ? {
          playerId: data.winner.playerId || data.winner.id,
          name: data.winner.name,
          score: data.winner.score,
        } : null,
        finalScores: data.finalScores.map((s: any) => ({
          playerId: s.playerId || s.id,
          name: s.name,
          score: s.score,
          isEliminated: s.isEliminated,
        })),
        message: `🏆 Game Over!`,
      });
    });
    
    // Listen for player eliminated (Step 4)
    socket.on('simon:player_eliminated', (data: { playerId: string; playerName: string; reason: string }) => {
      console.log('💀 Player eliminated:', data);
      
      // 🔊 Play elimination sound
      soundService.playEliminated();
      
      set({
        message: `${data.playerName} eliminated: ${data.reason}`,
      });
    });
    
    // Listen for input correct (Step 2)
    socket.on('simon:input_correct', (data: { playerId: string; index: number }) => {
      console.log('✅ Input correct:', data);
      
      set((state) => {
        const newSequence = [...state.playerSequence, state.currentSequence[data.index]];
        const isComplete = newSequence.length === state.currentSequence.length;
        
        return {
          playerSequence: newSequence,
          currentInputIndex: data.index + 1,
          canSubmit: isComplete,
          message: isComplete 
            ? '✅ Sequence complete!' 
            : `${newSequence.length} of ${state.currentSequence.length} colors`,
        };
      });
    });
    
    // Listen for input wrong (Epic 5: Implicit Submission - instant feedback)
    socket.on('simon:input_wrong', (data: { playerId: string; index: number; expectedColor: Color; actualColor: Color }) => {
      console.log('❌ Input wrong:', data);
      
      // Epic 9: Trigger "Razz" immediately (harsh buzz)
      soundService.playRazz();
      
      // Epic 9: Strong haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Strong vibration pattern
      }
      
      // Epic 14: Trigger glitch effect
      set({
        isInputLocked: true,
        showGlitch: true,
        message: `❌ Wrong! Expected ${data.expectedColor}, got ${data.actualColor}`,
      });
      
      // Reset glitch after animation
      setTimeout(() => {
        set({ showGlitch: false });
      }, 500);
    });
    
    // Listen for sequence complete (Epic 5: Auto-lock on final correct tap)
    socket.on('simon:player_sequence_complete', (data: { playerId: string; finishTime: number }) => {
      console.log('🏁 Player sequence complete:', data);
      
      const state = get();
      
      // Only lock input if it's OUR player who completed
      // Other players should continue to be able to input
      if (state.currentPlayerId && data.playerId === state.currentPlayerId) {
        if (state.isInputPhase && !state.isInputLocked) {
          set({
            isInputLocked: true,
            canSubmit: true,
            message: '✅ Sequence complete! Waiting for others...',
          });
        }
      }
    });
  },
  
  /**
   * Cleanup listeners
   */
  cleanup: () => {
    console.log('🧹 Cleaning up Simon listeners');
    
    const socket = socketService.getSocket();
    if (!socket) return;
    
    socket.off('simon:show_sequence');
    socket.off('simon:sequence_complete');
    socket.off('simon:input_phase');
    socket.off('simon:result');
    socket.off('simon:timeout');
    socket.off('simon:player_submitted');
    socket.off('simon:round_result');
    socket.off('simon:game_finished');
    socket.off('simon:player_eliminated');
    socket.off('simon:input_correct');
    socket.off('simon:input_wrong');
    socket.off('simon:player_sequence_complete');
    
    // Stop timer (Step 3)
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    // Reset state
    set({
      gameState: null,
      isShowingSequence: false,
      currentSequence: [],
      currentRound: 1,
      currentPlayerId: null,
      isInputPhase: false,
      playerSequence: [],
      canSubmit: false,
      currentInputIndex: 0,
      isInputLocked: false,
      timeoutAt: null,
      timeoutSeconds: 0,
      secondsRemaining: 0,
      timerColor: 'green',
      isTimerPulsing: false,
      scores: {},
      playerStatuses: {},
      submittedPlayers: [],
      isEliminated: false,
      roundResult: null,
      isGameOver: false,
      gameWinner: null,
      finalScores: [],
      lastResult: null,
      message: 'Waiting for game to start...',
      isGameActive: false,
    });
  },
  
  /**
   * Reset game state
   */
  resetGame: () => {
    set({
      gameState: null,
      isShowingSequence: false,
      currentSequence: [],
      currentRound: 1,
      isInputPhase: false,
      playerSequence: [],
      canSubmit: false,
      currentInputIndex: 0,
      isInputLocked: false,
      lastResult: null,
      message: 'Waiting for game to start...',
      isGameActive: false,
    });
  },
  
  /**
   * Set current player ID for event filtering
   */
  setCurrentPlayerId: (playerId: string) => {
    set({ currentPlayerId: playerId });
  },
  
  /**
   * Add a color to the player's sequence (for display only)
   * Epic 5: Actual validation happens in submitTap
   */
  addColorToSequence: (color: Color) => {
    // This is now just for visual feedback - validation happens server-side
    set((state) => {
      if (state.isInputLocked) return state; // Don't update if locked
      
      const newPlayerSequence = [...state.playerSequence, color];
      return {
        playerSequence: newPlayerSequence,
      };
    });
  },
  
  /**
   * Submit a single tap (Epic 5: Implicit Submission)
   * Validates instantly and auto-submits on final correct tap
   */
  submitTap: (gameCode: string, playerId: string, color: Color) => {
    const state = get();
    
    if (state.isInputLocked || !state.isInputPhase || state.isShowingSequence) {
      return; // Don't process if locked, not in input phase, or showing sequence
    }
    
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('No socket connection');
      return;
    }
    
    const inputIndex = state.currentInputIndex;
    const isFinalTap = inputIndex === state.currentSequence.length - 1;
    
    // Record finish time using performance.now() for millisecond accuracy
    const finishTime = isFinalTap ? performance.now() : undefined;
    
    console.log(`📤 Submitting tap ${inputIndex + 1}/${state.currentSequence.length}: ${color}`, {
      finishTime,
      isFinalTap,
    });
    
    // Emit tap to server for instant validation
    socket.emit('simon:submit_input', {
      gameCode,
      playerId,
      color,
      inputIndex,
      finishTime,
    });
  },
  
  /**
   * Submit the player's sequence to the server
   */
  submitSequence: (gameCode: string, playerId: string) => {
    const state = useSimonStore.getState();
    
    if (!state.canSubmit) {
      console.warn('Cannot submit - sequence incomplete');
      return;
    }
    
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('No socket connection');
      return;
    }
    
    console.log('📤 Submitting sequence:', state.playerSequence);
    
    socket.emit('simon:submit_sequence', {
      gameCode,
      playerId,
      sequence: state.playerSequence,
    });
    
    set({
      message: 'Checking your answer...',
      isInputPhase: false,
    });
  },
  
  /**
   * Clear the player's sequence
   */
  clearPlayerSequence: () => {
    set({
      playerSequence: [],
      canSubmit: false,
    });
  },
  
  /**
   * Start countdown timer (Step 3)
   */
  startTimer: (timeoutAt: number, timeoutSeconds: number) => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    console.log(`⏰ Starting timer: ${timeoutSeconds}s`);
    
    // Set initial state
    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeoutAt - now) / 1000));
      return remaining;
    };
    
    const updateTimerState = () => {
      const remaining = calculateTimeLeft();
      
      // Determine color and pulsing based on remaining time
      let color: 'green' | 'yellow' | 'red' = 'green';
      let isPulsing = false;
      
      if (remaining <= 3) {
        color = 'red';
        isPulsing = true;
      } else if (remaining <= 5) {
        color = 'red';
      } else if (remaining <= 10) {
        color = 'yellow';
      }
      
      // 🔊 Play timer warning beeps at 5, 3, 2, 1 seconds
      const beepSeconds = [5, 3, 2, 1];
      if (beepSeconds.includes(remaining) && lastBeepSecond !== remaining) {
        soundService.playBeep();
        lastBeepSecond = remaining;
      }
      
      set({
        timeoutAt,
        timeoutSeconds,
        secondsRemaining: remaining,
        timerColor: color,
        isTimerPulsing: isPulsing,
      });
      
      // Stop timer if time's up
      if (remaining <= 0) {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        lastBeepSecond = null; // Reset for next round
      }
    };
    
    // Update immediately
    updateTimerState();
    
    // Update every 100ms for smooth display
    timerInterval = window.setInterval(updateTimerState, 100);
  },
  
  /**
   * Stop countdown timer (Step 3)
   */
  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    lastBeepSecond = null; // Reset beep tracking
    
    set({
      timeoutAt: null,
      secondsRemaining: 0,
    });
  },
}));

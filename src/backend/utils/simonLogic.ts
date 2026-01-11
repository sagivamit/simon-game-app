/**
 * Simon Game Logic
 * 
 * Core game logic for Simon Says multiplayer game.
 * Handles sequence generation, validation, and game progression.
 */

import type { Player } from '@shared/types';
import type { 
  Color, 
  SimonGameState, 
  SimonPlayerState,
} from '@shared/types';
import { COLORS, SIMON_CONSTANTS } from '@shared/types';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize a new Simon game state
 * Epic 4: Uses seeded sequence generation for synchronization
 */
export function initializeSimonGame(players: Player[]): SimonGameState {
  const playerStates: Record<string, SimonPlayerState> = {};
  
  // Initialize state for all players
  players.forEach(player => {
    playerStates[player.id] = {
      playerId: player.id,
      status: 'playing',
      currentInputIndex: 0,
      eliminatedAtRound: null,
    };
  });
  
  // Epic 4: Set seed based on current time (all players will use same seed)
  setSequenceSeed(Date.now());
  
  // Generate first sequence (1 color for round 1) - Epic 4: Seeded
  const initialSequence = generateSequence(SIMON_CONSTANTS.INITIAL_SEQUENCE_LENGTH);
  
  // Initialize scores (Step 4)
  const scores: Record<string, number> = {};
  players.forEach(player => {
    scores[player.id] = 0;
  });
  
  return {
    gameType: 'simon',
    phase: 'showing_sequence',
    sequence: initialSequence,
    round: 1,
    playerStates,
    currentShowingIndex: 0,
    timeoutMs: SIMON_CONSTANTS.TIMEOUT_MS, // Epic 6: Fixed 20 seconds per cycle
    timeoutAt: null,        // Step 3: Set when input phase begins
    timerStartedAt: null,   // Step 3: Set when input phase begins
    scores,                 // Step 4: Player scores
    submissions: {},        // Step 4: Current round submissions
    roundWinner: null,      // Step 4: Round winner
    winnerId: null,
  };
}

// =============================================================================
// SEQUENCE GENERATION
// =============================================================================

// Epic 4: Seeded random number generator for synchronized sequences
let sequenceSeed = Date.now();

function setSequenceSeed(seed: number): void {
  sequenceSeed = seed;
}

function seededRandom(): number {
  // Simple LCG (Linear Congruential Generator)
  sequenceSeed = (sequenceSeed * 9301 + 49297) % 233280;
  return sequenceSeed / 233280;
}

/**
 * Epic 4: Generate a seeded random color sequence (all players get same pattern)
 */
export function generateSequence(length: number): Color[] {
  const sequence: Color[] = [];
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(seededRandom() * COLORS.length);
    sequence.push(COLORS[randomIndex]);
  }
  
  return sequence;
}

/**
 * Epic 4: Add one more color to existing sequence (using seeded random)
 */
export function extendSequence(currentSequence: Color[]): Color[] {
  const randomIndex = Math.floor(seededRandom() * COLORS.length);
  return [...currentSequence, COLORS[randomIndex]];
}

// =============================================================================
// TIMING (Step 3)
// =============================================================================

/**
 * Calculate timeout in seconds (Epic 6: Fixed 20 seconds)
 */
export function calculateTimeoutSeconds(_sequenceLength: number): number {
  // Epic 6: Fixed 20-second timer per cycle
  return SIMON_CONSTANTS.TIMEOUT_MS / 1000;
}

/**
 * Calculate timeout in milliseconds (Epic 6: Fixed 20 seconds)
 */
export function calculateTimeoutMs(_sequenceLength: number): number {
  // Epic 6: Fixed 20-second timer per cycle
  return SIMON_CONSTANTS.TIMEOUT_MS;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate if a player's color input is correct (used in Step 4+)
 */
export function validateInput(
  gameState: SimonGameState,
  playerId: string,
  color: Color,
  inputIndex: number
): boolean {
  // Check if input index matches expected position
  const playerState = gameState.playerStates[playerId];
  if (!playerState || playerState.currentInputIndex !== inputIndex) {
    return false;
  }
  
  // Check if color matches the sequence at this index
  const expectedColor = gameState.sequence[inputIndex];
  return color === expectedColor;
}

/**
 * Validate an entire submitted sequence (Step 2)
 */
export function validateSequence(
  gameState: SimonGameState,
  submittedSequence: Color[]
): boolean {
  // Check length matches
  if (submittedSequence.length !== gameState.sequence.length) {
    return false;
  }
  
  // Check each color in order
  for (let i = 0; i < gameState.sequence.length; i++) {
    if (submittedSequence[i] !== gameState.sequence[i]) {
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// ROUND PROCESSING (Step 4)
// =============================================================================

/**
 * Process all submissions for a round
 * Find fastest correct, eliminate wrong/timeout players, award points
 */
export function processRoundSubmissions(
  gameState: SimonGameState
): {
  gameState: SimonGameState;
  roundWinner: { playerId: string; score: number } | null;
  eliminations: Array<{ playerId: string; reason: 'wrong_sequence' | 'timeout' }>;
} {
  const submissions = Object.values(gameState.submissions);
  const eliminations: Array<{ playerId: string; reason: 'wrong_sequence' | 'timeout' }> = [];
  let updatedPlayerStates = { ...gameState.playerStates };
  let updatedScores = { ...gameState.scores };
  let roundWinner: { playerId: string; score: number } | null = null;
  
  // Filter to only correct submissions
  const correctSubmissions = submissions.filter(s => s.isCorrect);
  
  // Eliminate all wrong submissions
  submissions.forEach(submission => {
    if (!submission.isCorrect && updatedPlayerStates[submission.playerId]?.status === 'playing') {
      updatedPlayerStates[submission.playerId] = {
        ...updatedPlayerStates[submission.playerId],
        status: 'eliminated',
        eliminatedAtRound: gameState.round,
      };
      eliminations.push({
        playerId: submission.playerId,
        reason: 'wrong_sequence',
      });
    }
  });
  
  // Epic 6: Find fastest correct submission (single winner only)
  if (correctSubmissions.length > 0) {
    // Epic 5 & 6: Use finishTime (performance.now()) if available for millisecond accuracy
    // Otherwise fall back to server timestamp
    const sorted = [...correctSubmissions].sort((a, b) => {
      const timeA = a.finishTime || a.timestamp;
      const timeB = b.finishTime || b.timestamp;
      return timeA - timeB;
    });
    
    // Epic 6: Award +1 point ONLY to the single fastest (no ties)
    const fastestWinner = sorted[0];
    updatedScores[fastestWinner.playerId] = (updatedScores[fastestWinner.playerId] || 0) + 1;
    
    // Set round winner
    roundWinner = {
      playerId: fastestWinner.playerId,
      score: updatedScores[fastestWinner.playerId],
    };
  }
  
  return {
    gameState: {
      ...gameState,
      playerStates: updatedPlayerStates,
      scores: updatedScores,
      roundWinner: roundWinner?.playerId || null,
      submissions: {}, // Clear for next round
    },
    roundWinner,
    eliminations,
  };
}

/**
 * Check if all active players have submitted
 */
export function haveAllPlayersSubmitted(gameState: SimonGameState): boolean {
  const activePlayers = Object.values(gameState.playerStates).filter(
    state => state.status === 'playing'
  );
  const submissions = Object.keys(gameState.submissions);
  
  return activePlayers.length > 0 && submissions.length >= activePlayers.length;
}

// =============================================================================
// GAME PROGRESSION
// =============================================================================

/**
 * Advance to the next round
 */
export function advanceToNextRound(gameState: SimonGameState): SimonGameState {
  // Epic 4: Extend sequence by one color (using seeded generation)
  const newSequence = extendSequence(gameState.sequence);
  
  // Epic 6: Fixed 20-second timeout per cycle (no decrement)
  const newTimeout = SIMON_CONSTANTS.TIMEOUT_MS;
  
  // Reset all active players' input index for new round
  const updatedPlayerStates: Record<string, SimonPlayerState> = {};
  Object.entries(gameState.playerStates).forEach(([id, state]) => {
    updatedPlayerStates[id] = {
      ...state,
      currentInputIndex: 0,
    };
  });
  
  return {
    ...gameState,
    phase: 'showing_sequence',
    sequence: newSequence,
    round: gameState.round + 1,
    playerStates: updatedPlayerStates,
    currentShowingIndex: 0,
    timeoutMs: newTimeout,
    submissions: {},      // Step 4: Clear submissions for new round
    roundWinner: null,    // Step 4: Clear round winner
  };
}

/**
 * Eliminate a player from the game
 */
export function eliminatePlayer(
  gameState: SimonGameState,
  playerId: string,
  round: number
): SimonGameState {
  const updatedPlayerStates = { ...gameState.playerStates };
  
  if (updatedPlayerStates[playerId]) {
    updatedPlayerStates[playerId] = {
      ...updatedPlayerStates[playerId],
      status: 'eliminated',
      eliminatedAtRound: round,
    };
  }
  
  return {
    ...gameState,
    playerStates: updatedPlayerStates,
  };
}

/**
 * Check if game should end
 * 
 * Solo mode (1 total player): End only when that player is eliminated (0 active)
 * Multiplayer (2+ players): End when 1 or fewer active players remain
 */
/**
 * Check if game should end (Epic 6: After 5 cycles or only 1 player remaining)
 */
export function shouldGameEnd(gameState: SimonGameState): boolean {
  // Epic 6: End after 5 cycles
  if (gameState.round >= SIMON_CONSTANTS.MAX_CYCLES) {
    return true;
  }
  
  // Also end if only 1 or 0 players remaining
  const totalPlayers = Object.keys(gameState.playerStates).length;
  const activePlayers = Object.values(gameState.playerStates).filter(
    state => state.status === 'playing'
  );
  
  // Solo mode: only end when the player is eliminated
  if (totalPlayers === 1) {
    return activePlayers.length === 0;
  }
  
  // Multiplayer: end when 1 or fewer active players
  return activePlayers.length <= 1;
}

/**
 * Get the winner (last player standing or highest scorer)
 */
export function getWinner(gameState: SimonGameState): string | null {
  const activePlayers = Object.values(gameState.playerStates).filter(
    state => state.status === 'playing'
  );
  
  // If 1 player still active, they're the winner
  if (activePlayers.length === 1) {
    return activePlayers[0].playerId;
  }
  
  // If all eliminated, return player with highest score
  if (activePlayers.length === 0) {
    let highestScore = -1;
    let winnerId: string | null = null;
    
    Object.entries(gameState.scores).forEach(([playerId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winnerId = playerId;
      }
    });
    
    return winnerId;
  }
  
  return null;
}

/**
 * Get count of active (still playing) players
 */
export function getActivePlayerCount(gameState: SimonGameState): number {
  return Object.values(gameState.playerStates).filter(
    state => state.status === 'playing'
  ).length;
}

/**
 * Update player's current input index (progress through sequence)
 */
export function updatePlayerProgress(
  gameState: SimonGameState,
  playerId: string
): SimonGameState {
  const updatedPlayerStates = { ...gameState.playerStates };
  
  if (updatedPlayerStates[playerId]) {
    updatedPlayerStates[playerId] = {
      ...updatedPlayerStates[playerId],
      currentInputIndex: updatedPlayerStates[playerId].currentInputIndex + 1,
    };
  }
  
  return {
    ...gameState,
    playerStates: updatedPlayerStates,
  };
}

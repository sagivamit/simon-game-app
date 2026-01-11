/**
 * Game Types - Game-Specific Logic
 * 
 * These types handle WHAT players are playing.
 * Platform types belong in platform.types.ts
 */

// =============================================================================
// SHARED GAME TYPES
// =============================================================================

/**
 * Available colors in both games
 */
export type Color = 'red' | 'blue' | 'yellow' | 'green';

/**
 * All available colors
 */
export const COLORS: Color[] = ['red', 'blue', 'yellow', 'green'];

// =============================================================================
// COLOR RACE TYPES (Dummy Game)
// =============================================================================

/**
 * Color Race game phases
 */
export type ColorRacePhase = 
  | 'waiting'        // Lobby (handled by platform)
  | 'countdown'      // 3-2-1 before game (handled by platform)
  | 'showing_color'  // Displaying color to click
  | 'round_result'   // Showing who won the round
  | 'finished';      // Game over

/**
 * Color Race game state
 */
export interface ColorRaceGameState {
  gameType: 'color_race';
  phase: ColorRacePhase;
  currentColor: Color | null;     // The color players need to click
  round: number;                   // Current round (1-5)
  totalRounds: number;             // Total rounds in game
  scores: Record<string, number>;  // playerId -> score
  roundWinner: string | null;      // playerId of round winner
}

/**
 * Player answer submission
 */
export interface PlayerAnswer {
  playerId: string;
  color: Color;
  timestamp: number;  // Server timestamp for tie-breaking
}

/**
 * Color Race WebSocket events (server → client)
 */
export interface ColorRaceServerEvents {
  'color_race:new_round': (data: {
    round: number;
    color: Color;
    totalRounds: number;
  }) => void;
  
  'color_race:round_result': (data: {
    winnerId: string | null;
    winnerName: string | null;
    scores: Record<string, number>;
  }) => void;
  
  'color_race:game_finished': (data: {
    winnerId: string;
    winnerName: string;
    finalScores: Record<string, number>;
  }) => void;
}

/**
 * Color Race WebSocket events (client → server)
 */
export interface ColorRaceClientEvents {
  'color_race:submit_answer': (data: {
    gameCode: string;
    playerId: string;
    color: Color;
  }) => void;
}

/**
 * Color Race constants
 */
export const COLOR_RACE_CONSTANTS = {
  TOTAL_ROUNDS: 5,
  ROUND_RESULT_DELAY_MS: 2000,
} as const;

// =============================================================================
// SIMON SAYS TYPES (Main Game)
// =============================================================================

/**
 * Simon Says game phases
 */
export type SimonPhase = 
  | 'waiting'           // Lobby (handled by platform)
  | 'countdown'         // 3-2-1 before game (handled by platform)
  | 'showing_sequence'  // Simon showing the sequence
  | 'player_input'      // Player's turn to repeat
  | 'round_result'      // Showing who passed/failed
  | 'elimination'       // Player eliminated
  | 'finished';         // Game over, winner declared

/**
 * Player status in Simon Says
 */
export type SimonPlayerStatus = 
  | 'playing'      // Still in the game
  | 'eliminated'   // Made a mistake
  | 'spectating';  // Watching after elimination

/**
 * Simon Says player state
 */
export interface SimonPlayerState {
  playerId: string;
  status: SimonPlayerStatus;
  currentInputIndex: number;  // How far in the sequence they are
  eliminatedAtRound: number | null;
}

/**
 * Player submission (Step 4)
 */
export interface PlayerSubmission {
  playerId: string;
  sequence: Color[];
  timestamp: number; // Server timestamp
  finishTime?: number; // Client performance.now() timestamp for millisecond accuracy
  isCorrect: boolean;
}

/**
 * Simon Says game state
 */
export interface SimonGameState {
  gameType: 'simon';
  phase: SimonPhase;
  sequence: Color[];                           // The sequence to repeat
  round: number;                               // Current round
  playerStates: Record<string, SimonPlayerState>;
  currentShowingIndex: number;                 // For animation during showing
  timeoutMs: number;                           // Time limit per input
  timeoutAt: number | null;                    // Timestamp when timeout occurs (Step 3)
  timerStartedAt: number | null;               // Timestamp when input phase began (Step 3)
  scores: Record<string, number>;              // Player scores (Step 4)
  submissions: Record<string, PlayerSubmission>; // Current round submissions (Step 4)
  roundWinner: string | null;                  // Winner of current round (Step 4)
  winnerId: string | null;                     // Last player standing
}

/**
 * Simon Says WebSocket events (server → client)
 */
export interface SimonServerEvents {
  'simon:sequence_start': (data: {
    round: number;
    sequenceLength: number;
    timeoutMs: number;
  }) => void;
  
  'simon:show_sequence': (data: {
    round: number;
    sequence: Color[];
    showDuration?: number; // Epic 12: Tempo scaling
    showGap?: number;      // Epic 12: Tempo scaling
  }) => void;
  
  'simon:show_color': (data: {
    color: Color;
    index: number;
    total: number;
  }) => void;
  
  'simon:sequence_complete': () => void;
  
  'simon:input_phase': (data: {
    round: number;
    timeoutAt: number;
    timeoutSeconds: number;
  }) => void;
  
  'simon:your_turn': (data: {
    timeoutMs: number;
  }) => void;
  
  'simon:input_correct': (data: {
    playerId: string;
    index: number;
  }) => void;
  
  'simon:input_wrong': (data: {
    playerId: string;
    index: number;
    expectedColor: Color;
    actualColor: Color;
  }) => void;
  
  'simon:player_sequence_complete': (data: {
    playerId: string;
    finishTime: number; // performance.now() timestamp
  }) => void;
  
  'simon:player_submitted': (data: {
    playerId: string;
    playerName: string;
  }) => void;
  
  'simon:timeout': (data: {
    playerId: string;
    playerName: string;
    correctSequence: Color[];
  }) => void;
  
  'simon:player_eliminated': (data: {
    playerId: string;
    playerName: string;
    reason: 'wrong_sequence' | 'timeout';
  }) => void;
  
  'simon:round_result': (data: {
    roundWinner: { playerId: string; name: string; } | null;
    eliminations: Array<{ playerId: string; name: string; reason: string }>;
    scores: Record<string, number>;
    playerStatuses: Record<string, SimonPlayerStatus>;
  }) => void;
  
  'simon:round_complete': (data: {
    round: number;
    playersRemaining: number;
  }) => void;
  
  'simon:game_finished': (data: {
    winner: { playerId: string; name: string; score: number };
    finalScores: Array<{ playerId: string; name: string; score: number }>;
  }) => void;
}

/**
 * Simon Says WebSocket events (client → server)
 */
export interface SimonClientEvents {
  'simon:submit_input': (data: {
    gameCode: string;
    playerId: string;
    color: Color;
    inputIndex: number;
    finishTime?: number; // performance.now() timestamp when sequence completed
  }) => void;
  'simon:submit_sequence': (data: {
    gameCode: string;
    playerId: string;
    sequence: Color[];
  }) => void;
}

/**
 * Simon Says constants
 */
export const SIMON_CONSTANTS = {
  INITIAL_SEQUENCE_LENGTH: 1,
  SEQUENCE_INCREMENT: 1,
  MAX_CYCLES: 5,                      // Epic 6: 5 cycles for competitive mode
  TIMEOUT_MS: 20000,                  // Epic 6: 20 seconds per cycle
  SHOW_COLOR_DURATION_MS: 600,        // Base: How long each color shows
  SHOW_COLOR_GAP_MS: 200,             // Base: Gap between colors
  // Epic 12: Tempo scaling - acceleration at cycles 3 & 5
  TEMPO_CYCLE_3_DURATION_MS: 450,     // Cycle 3: Faster (450ms)
  TEMPO_CYCLE_3_GAP_MS: 150,          // Cycle 3: Faster gap (150ms)
  TEMPO_CYCLE_5_DURATION_MS: 300,     // Cycle 5: Fastest (300ms)
  TEMPO_CYCLE_5_GAP_MS: 100,          // Cycle 5: Fastest gap (100ms)
  // Legacy constants (kept for backward compatibility)
  INITIAL_TIMEOUT_MS: 20000,          // Same as TIMEOUT_MS
  TIMEOUT_DECREMENT_MS: 0,            // No decrement (fixed 20s)
  MIN_TIMEOUT_MS: 20000,              // Same as TIMEOUT_MS
} as const;

// =============================================================================
// UNION TYPES
// =============================================================================

/**
 * Any game state
 */
export type GameState = ColorRaceGameState | SimonGameState;

/**
 * All game server events
 */
export type GameServerEvents = ColorRaceServerEvents & SimonServerEvents;

/**
 * All game client events
 */
export type GameClientEvents = ColorRaceClientEvents & SimonClientEvents;

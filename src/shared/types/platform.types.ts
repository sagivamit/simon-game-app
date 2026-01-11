/**
 * Platform Types - 100% Reusable Multiplayer Infrastructure
 * 
 * These types handle WHO is playing and HOW they connect.
 * Game-specific types belong in game.types.ts
 */

// =============================================================================
// PLAYER TYPES
// =============================================================================

/**
 * Player in a game room
 */
export interface Player {
  id: string;                    // UUID
  displayName: string;           // 3-12 characters
  avatarId: string;              // "1" to "8"
  isHost: boolean;               // Host privileges
  socketId: string | null;       // Current socket ID
  connected: boolean;            // Online status
  lastActivity: Date;            // For timeout detection
}

/**
 * Player info for creating/joining games
 */
export interface PlayerInfo {
  displayName: string;
  avatarId: string;
}

// =============================================================================
// ROOM TYPES
// =============================================================================

/**
 * Room lifecycle states
 */
export type RoomStatus = 
  | 'waiting'     // Lobby, waiting for host to start
  | 'countdown'   // 3-2-1 countdown before game
  | 'active'      // Game in progress
  | 'finished';   // Game ended

/**
 * Game room container
 * Epic 1: Volatile single-session data (no persistence)
 */
export interface GameRoom {
  gameCode: string;              // 6-char uppercase alphanumeric
  sessionId: string;            // Epic 1: Unique session identifier
  players: Player[];             // Max 4 players
  status: RoomStatus;            // Lifecycle state
  createdAt: Date;               // For cleanup
  expiresAt: Date;              // Epic 2: 5-minute expiry timestamp
  gameState: unknown;            // Game-specific state (defined in game.types.ts)
}

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * Session data stored in JWT
 */
export interface SessionPayload {
  playerId: string;
  gameCode: string;
  displayName: string;
  avatarId: string;
  isHost: boolean;
}

/**
 * Client-side session (subset of SessionPayload)
 */
export interface Session {
  playerId: string;
  gameCode: string;
  displayName: string;
  avatarId: string;
  isHost: boolean;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Create session request
 */
export interface CreateSessionRequest {
  displayName: string;
  avatarId: string;
}

/**
 * Create session response
 */
export interface CreateSessionResponse {
  playerId: string;
  gameCode: string;
  session: Session;
}

/**
 * Join game request
 */
export interface JoinGameRequest {
  displayName: string;
  avatarId: string;
  gameCode: string;
}

/**
 * Join game response
 */
export interface JoinGameResponse {
  playerId: string;
  session: Session;
}

/**
 * Verify session response
 */
export interface VerifySessionResponse {
  valid: boolean;
  session?: Session;
}

// =============================================================================
// WEBSOCKET EVENT TYPES
// =============================================================================

/**
 * Platform WebSocket events (server → client)
 */
export interface PlatformServerEvents {
  player_joined: (player: Player) => void;
  player_left: (data: { playerId: string }) => void;
  player_disconnected: (data: { playerId: string }) => void;
  player_reconnected: (data: { playerId: string }) => void;
  room_closed: () => void;
  countdown: (data: { count: number }) => void;
  room_state: (room: GameRoom) => void;
  error: (data: { message: string }) => void;
}

/**
 * Platform WebSocket events (client → server)
 */
export interface PlatformClientEvents {
  join_room_socket: (data: { gameCode: string; playerId: string }) => void;
  leave_room: (data: { gameCode: string; playerId: string }) => void;
  start_game: (data: { gameCode: string; playerId: string }) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PLATFORM_CONSTANTS = {
  // Room settings
  MAX_PLAYERS: 4,
  GAME_CODE_LENGTH: 6,
  
  // Timeouts
  DISCONNECT_BUFFER_MS: 5000,      // 5 seconds before marking disconnected
  DISCONNECT_GRACE_MS: 180000,     // 3 minutes before removing player
  ROOM_CLEANUP_INTERVAL_MS: 300000, // 5 minutes
  ROOM_MAX_AGE_MS: 86400000,       // 24 hours
  
  // Validation
  MIN_DISPLAY_NAME_LENGTH: 3,
  MAX_DISPLAY_NAME_LENGTH: 12,
  VALID_AVATAR_IDS: ['1', '2', '3', '4', '5', '6', '7', '8'],
  
  // JWT
  JWT_EXPIRATION: '24h',
} as const;

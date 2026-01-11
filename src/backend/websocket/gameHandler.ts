/**
 * WebSocket Game Handler
 * 
 * Handles real-time game events via Socket.io.
 * Platform events are handled here, game-specific events are added separately.
 */

import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { verifyToken } from '../utils/auth';
import { gameService } from '../services/gameService';
import { 
  initializeColorRaceGame, 
  processRound, 
  determineWinner 
} from '../utils/colorRaceLogic';
import {
  initializeSimonGame,
  validateInput,
  validateSequence,
  eliminatePlayer,
  advanceToNextRound,
  shouldGameEnd,
  updatePlayerProgress,
  calculateTimeoutSeconds,
  calculateTimeoutMs,
  processRoundSubmissions,
  haveAllPlayersSubmitted,
} from '../utils/simonLogic';
import { PLATFORM_CONSTANTS, COLOR_RACE_CONSTANTS, SIMON_CONSTANTS } from '@shared/types';
import type { Player } from '@shared/types';
import type { ColorRaceGameState, PlayerAnswer, SimonGameState, Color } from '@shared/types';

// =============================================================================
// TYPES
// =============================================================================

interface SocketWithSession extends Socket {
  playerId?: string;
  gameCode?: string;
  displayName?: string;
}

// Track disconnect timeouts for cleanup
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

// Track Simon game timeouts (Step 3)
const simonTimeouts = new Map<string, NodeJS.Timeout>();

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize WebSocket handlers
 */
export function initializeGameHandlers(io: Server): void {
  io.on('connection', (socket: SocketWithSession) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    // Try to auto-reconnect from cookie
    handleAutoReconnect(io, socket);
    
    // Register event handlers
    registerPlatformHandlers(io, socket);
    registerGameHandlers(io, socket);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
  
  // Start room cleanup interval
  startCleanupInterval();
  
  console.log('🎮 WebSocket handlers initialized');
}

// =============================================================================
// AUTO-RECONNECTION
// =============================================================================

/**
 * Attempt to auto-reconnect player from session cookie
 */
function handleAutoReconnect(_io: Server, socket: SocketWithSession): void {
  try {
    const cookieHeader = socket.request.headers.cookie;
    if (!cookieHeader) return;
    
    const cookies = cookie.parse(cookieHeader);
    const token = cookies.session;
    if (!token) return;
    
    const payload = verifyToken(token);
    if (!payload) return;
    
    const { playerId, gameCode, displayName } = payload;
    
    // Check if room still exists
    const room = gameService.getRoom(gameCode);
    if (!room) return;
    
    // Check if player is still in room
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Update socket ID and mark connected
    gameService.updateSocketId(gameCode, playerId, socket.id);
    
    // Store session info on socket
    socket.playerId = playerId;
    socket.gameCode = gameCode;
    socket.displayName = displayName;
    
    // Join socket room
    socket.join(gameCode);
    
    // Clear any pending disconnect timeout
    const timeoutKey = `${gameCode}:${playerId}`;
    const existingTimeout = disconnectTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      disconnectTimeouts.delete(timeoutKey);
    }
    
    // Notify others that player reconnected
    socket.to(gameCode).emit('player_reconnected', { 
      playerId,
      displayName,
    });
    
    // Send current room state to reconnected player
    socket.emit('room_state', room);
    
    console.log(`✅ Auto-reconnected: ${displayName} to room ${gameCode}`);
  } catch (error) {
    console.error('❌ Auto-reconnect error:', error);
  }
}

// =============================================================================
// PLATFORM EVENT HANDLERS
// =============================================================================

/**
 * Register platform event handlers
 */
function registerPlatformHandlers(io: Server, socket: SocketWithSession): void {
  /**
   * Join room via WebSocket
   * Called after HTTP session is created
   */
  socket.on('join_room_socket', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Verify player is in room
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not in room' });
        return;
      }
      
      // Update socket ID
      gameService.updateSocketId(gameCode, playerId, socket.id);
      
      // Store session info on socket
      socket.playerId = playerId;
      socket.gameCode = gameCode;
      socket.displayName = player.displayName;
      
      // Join socket room
      socket.join(gameCode);
      
      // Send initial room state to this player
      socket.emit('room_state', room);
      
      // Broadcast updated room state to ALL players (including this one)
      io.to(gameCode).emit('room_state_update', room);
      
      // Also notify others for UI feedback (optional)
      socket.to(gameCode).emit('player_joined', player);
      
      console.log(`🏠 Socket joined: ${player.displayName} in room ${gameCode} (${room.players.length} players)`);
    } catch (error) {
      console.error('❌ join_room_socket error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  /**
   * Leave room explicitly
   */
  socket.on('leave_room', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      
      // Remove player from room
      const removed = gameService.removePlayer(gameCode, playerId);
      
      if (removed) {
        // Leave socket room
        socket.leave(gameCode);
        
        // Notify others
        io.to(gameCode).emit('player_left', { playerId });
        
        // Broadcast updated room state to remaining players
        const room = gameService.getRoom(gameCode);
        if (room) {
          io.to(gameCode).emit('room_state_update', room);
        } else {
          // Room is empty/closed
          io.to(gameCode).emit('room_closed');
        }
        
        console.log(`👋 ${socket.displayName} left room ${gameCode} (${room?.players.length || 0} players remaining)`);
      }
      
      // Clear socket session
      socket.playerId = undefined;
      socket.gameCode = undefined;
      socket.displayName = undefined;
    } catch (error) {
      console.error('❌ leave_room error:', error);
    }
  });
  
  /**
   * Host starts the game
   */
  socket.on('start_game', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      console.log(`🎮 DEBUG start_game: gameCode=${gameCode}, playerId=${playerId}`);
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      console.log(`🎮 DEBUG room exists: ${!!room}`);
      if (!room) {
        console.error(`❌ Room not found: ${gameCode}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Verify player is host
      const player = room.players.find(p => p.id === playerId);
      console.log(`🎮 DEBUG player found: ${!!player}, isHost: ${player?.isHost}`);
      if (!player?.isHost) {
        console.error(`❌ Player ${playerId} is not host`);
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }
      
      // Verify room is in waiting state
      console.log(`🎮 DEBUG room status: ${room.status}`);
      if (room.status !== 'waiting') {
        console.error(`❌ Room not in waiting state: ${room.status}`);
        socket.emit('error', { message: 'Game already started' });
        return;
      }
      
      // Start countdown
      console.log(`✅ Starting countdown for room: ${gameCode}`);
      startCountdown(io, gameCode);
      
      console.log(`⏳ Countdown started for room: ${gameCode}`);
    } catch (error) {
      console.error('❌ start_game error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  /**
   * Restart game (play again)
   */
  socket.on('restart_game', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      console.log(`🔄 restart_game: gameCode=${gameCode}, playerId=${playerId}`);
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room) {
        console.error(`❌ Room not found: ${gameCode}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Reset room to waiting state
      room.status = 'waiting';
      room.gameState = null;
      
      console.log(`✅ Room ${gameCode} reset to waiting state`);
      
      // Broadcast updated room state to all players
      io.to(gameCode).emit('room_state_update', {
        ...room,
        players: room.players.map(p => ({
          id: p.id,
          displayName: p.displayName,
          avatarId: p.avatarId,
          isHost: p.isHost,
        })),
      });
      
      // Also emit game_restarted event so clients know to reset
      io.to(gameCode).emit('game_restarted', { gameCode });
      
    } catch (error) {
      console.error('❌ restart_game error:', error);
      socket.emit('error', { message: 'Failed to restart game' });
    }
  });
}

// =============================================================================
// GAME EVENT HANDLERS (Color Race)
// =============================================================================

// Track round answers for each game
const roundAnswers = new Map<string, PlayerAnswer[]>();

/**
 * Register game-specific event handlers
 */
function registerGameHandlers(io: Server, socket: SocketWithSession): void {
  /**
   * Color Race: Submit answer
   */
  socket.on('color_race:submit_answer', (data: { gameCode: string; playerId: string; color: import('@shared/types').Color }) => {
    try {
      const { gameCode, playerId, color } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room || room.status !== 'active') {
        return;
      }
      
      // Get game state
      const gameState = room.gameState as any;
      if (!gameState || gameState.gameType !== 'color_race') {
        return;
      }
      
      // Check if player already answered this round
      const answers = roundAnswers.get(gameCode) || [];
      if (answers.some(a => a.playerId === playerId)) {
        return; // Already answered
      }
      
      // Record answer with server timestamp
      const answer = {
        playerId,
        color,
        timestamp: Date.now(),
      };
      
      answers.push(answer);
      roundAnswers.set(gameCode, answers);
      
      // Check if all connected players have answered
      const connectedPlayers = room.players.filter(p => p.connected);
      
      if (answers.length >= connectedPlayers.length) {
        // Process round
        processColorRaceRound(io, gameCode, room, gameState, answers);
        
        // Clear answers for next round
        roundAnswers.set(gameCode, []);
      }
    } catch (error) {
      console.error('❌ color_race:submit_answer error:', error);
    }
  });
  
  /**
   * Simon: Submit complete sequence (Step 2, 3 & 4 - Competitive Multiplayer)
   */
  socket.on('simon:submit_sequence', (data: { gameCode: string; playerId: string; sequence: Color[] }) => {
    try {
      const { gameCode, playerId, sequence } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room || room.status !== 'active') {
        return;
      }
      
      // Get game state
      let gameState = room.gameState as SimonGameState;
      if (!gameState || gameState.gameType !== 'simon') {
        return;
      }
      
      // Verify player is still playing (Step 4: Check status)
      const playerState = gameState.playerStates[playerId];
      if (!playerState || playerState.status !== 'playing') {
        console.log(`⚠️ Player ${playerId} tried to submit but is not active`);
        return;
      }
      
      // Check if already submitted
      if (gameState.submissions[playerId]) {
        console.log(`⚠️ Player ${playerId} already submitted`);
        return;
      }
      
      // Get player info
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.displayName || 'Unknown';
      
      // Validate sequence
      const isCorrect = validateSequence(gameState, sequence);
      const timestamp = Date.now();
      
      // Step 4: Record submission (don't reveal correctness yet)
      gameState.submissions[playerId] = {
        playerId,
        sequence,
        timestamp,
        isCorrect,
      };
      gameService.updateGameState(gameCode, gameState);
      
      console.log(`📝 ${playerName} submitted (${isCorrect ? 'correct' : 'wrong'}) at ${timestamp}`);
      
      // Broadcast that player submitted (Step 4: Don't reveal correctness)
      io.to(gameCode).emit('simon:player_submitted', {
        playerId,
        playerName,
      });
      
      // Step 4: Check if all active players have submitted
      if (haveAllPlayersSubmitted(gameState)) {
        console.log(`✅ All players submitted! Processing round ${gameState.round}...`);
        
        // Cancel timeout (Step 3)
        const existingTimeout = simonTimeouts.get(gameCode);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          simonTimeouts.delete(gameCode);
        }
        
        // Process round (Step 4)
        processSimonRound(io, gameCode);
      }
    } catch (error) {
      console.error('❌ simon:submit_sequence error:', error);
    }
  });
  
  /**
   * Simon: Submit input (single color in sequence) - Epic 5: Implicit Submission
   * Validates each tap instantly and auto-submits on final correct tap
   */
  socket.on('simon:submit_input', (data: { gameCode: string; playerId: string; color: Color; inputIndex: number; finishTime?: number }) => {
    try {
      const { gameCode, playerId, color, inputIndex, finishTime } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room || room.status !== 'active') {
        return;
      }
      
      // Get game state
      let gameState = room.gameState as SimonGameState;
      if (!gameState || gameState.gameType !== 'simon') {
        return;
      }
      
      // Verify player is still playing
      const playerState = gameState.playerStates[playerId];
      if (!playerState || playerState.status !== 'playing') {
        return;
      }
      
      // Epic 5: Check if player already submitted (input locked)
      if (gameState.submissions[playerId]) {
        console.log(`⚠️ Player ${playerId} already submitted`);
        return;
      }
      
      // Get player info
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.displayName || 'Unknown';
      
      // Validate input
      const isCorrect = validateInput(gameState, playerId, color, inputIndex);
      const expectedColor = gameState.sequence[inputIndex];
      
      if (!isCorrect) {
        // Epic 5: Wrong input - emit instant feedback (Razz)
        io.to(gameCode).emit('simon:input_wrong', {
          playerId,
          index: inputIndex,
          expectedColor,
          actualColor: color,
        });
        
        // Eliminate player
        const newState = eliminatePlayer(gameState, playerId, gameState.round);
        gameService.updateGameState(gameCode, newState);
        
        // Record wrong submission
        newState.submissions[playerId] = {
          playerId,
          sequence: [], // Empty = wrong
          timestamp: Date.now(),
          isCorrect: false,
        };
        gameService.updateGameState(gameCode, newState);
        
        // Broadcast elimination
        io.to(gameCode).emit('simon:player_eliminated', {
          playerId,
          playerName,
          reason: 'wrong_sequence',
        });
        
        // Check if all players have finished (submitted or eliminated)
        if (haveAllPlayersSubmitted(newState)) {
          processSimonRound(io, gameCode);
        } else if (shouldGameEnd(newState)) {
          finishSimonGame(io, gameCode, newState, room);
        }
        
        return;
      }
      
      // Correct input - update progress
      let newState = updatePlayerProgress(gameState, playerId);
      gameService.updateGameState(gameCode, newState);
      
      // Emit correct feedback
      io.to(gameCode).emit('simon:input_correct', {
        playerId,
        index: inputIndex,
      });
      
      // Epic 5: Check if player completed the sequence (final correct tap)
      const updatedPlayerState = newState.playerStates[playerId];
      if (updatedPlayerState.currentInputIndex >= newState.sequence.length) {
        // Player completed this round!
        console.log(`✅ Player ${playerId} completed round ${newState.round} at ${finishTime || Date.now()}`);
        
        // Epic 5: Record submission with finish time (millisecond accuracy)
        const serverTimestamp = Date.now();
        newState.submissions[playerId] = {
          playerId,
          sequence: [...newState.sequence], // Full correct sequence
          timestamp: serverTimestamp,
          finishTime: finishTime, // Client performance.now() timestamp
          isCorrect: true,
        };
        gameService.updateGameState(gameCode, newState);
        
        // Epic 5: Emit sequence complete event (auto-lock input)
        io.to(gameCode).emit('simon:player_sequence_complete', {
          playerId,
          finishTime: finishTime || serverTimestamp,
        });
        
        // Broadcast that player submitted
        io.to(gameCode).emit('simon:player_submitted', {
          playerId,
          playerName,
        });
        
        // Check if all active players have submitted
        if (haveAllPlayersSubmitted(newState)) {
          console.log(`✅ All players submitted! Processing round ${newState.round}...`);
          
          // Cancel timeout
          const existingTimeout = simonTimeouts.get(gameCode);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            simonTimeouts.delete(gameCode);
          }
          
          // Process round
          processSimonRound(io, gameCode);
        }
      }
    } catch (error) {
      console.error('❌ simon:submit_input error:', error);
    }
  });
}

// =============================================================================
// COUNTDOWN
// =============================================================================

/**
 * Start countdown before game begins
 * Epic 4: Includes ready-check to ensure all players are synced
 */
function startCountdown(io: Server, gameCode: string): void {
  const room = gameService.getRoom(gameCode);
  if (!room) return;
  
  // Epic 4: Ready-check - ensure all players are connected
  const connectedPlayers = room.players.filter(p => p.connected);
  if (connectedPlayers.length === 0) {
    console.error('❌ No connected players for countdown');
    return;
  }
  
  gameService.updateRoomStatus(gameCode, 'countdown');
  
  let count = 3;
  
  const interval = setInterval(() => {
    io.to(gameCode).emit('countdown', { count });
    
    if (count === 0) {
      clearInterval(interval);
      
      // Update status to active
      gameService.updateRoomStatus(gameCode, 'active');
      
      // TODO: Determine game type (for now, default to Simon)
      // In future: Pass game type from client or room settings
      const gameType = 'simon'; // or 'color_race'
      
      const currentRoom = gameService.getRoom(gameCode);
      if (!currentRoom) return;
      
      if (gameType === 'simon') {
        // Epic 4: Initialize Simon game with seeded sequence (all players get same pattern)
        const gameState = initializeSimonGame(currentRoom.players);
        gameService.updateGameState(gameCode, gameState);
        
        console.log(`🎮 Simon started in room: ${gameCode} (${connectedPlayers.length} players synced)`);
        
        // Start showing sequence after brief delay
        setTimeout(() => {
          showSimonSequence(io, gameCode, gameState);
        }, 500);
      } else {
        // Initialize Color Race game
        const gameState = initializeColorRaceGame(currentRoom.players);
        gameService.updateGameState(gameCode, gameState);
        
        // Start first round
        io.to(gameCode).emit('color_race:new_round', {
          round: gameState.round,
          color: gameState.currentColor,
          totalRounds: gameState.totalRounds,
        });
        
        console.log(`🎮 Color Race started in room: ${gameCode}`);
      }
    }
    
    count--;
  }, 1000);
}

// =============================================================================
// COLOR RACE GAME LOGIC
// =============================================================================

/**
 * Process a Color Race round
 */
function processColorRaceRound(
  io: Server,
  gameCode: string,
  room: any,
  gameState: ColorRaceGameState,
  answers: PlayerAnswer[]
): void {
  // Process the round
  const newState = processRound(gameState, answers);
  
  // Update game state
  gameService.updateGameState(gameCode, newState);
  
  // Get winner info for this round
  const roundWinner = room.players.find((p: Player) => p.id === newState.roundWinner);
  
  // Broadcast round result
  io.to(gameCode).emit('color_race:round_result', {
    winnerId: newState.roundWinner,
    winnerName: roundWinner?.displayName || null,
    scores: newState.scores,
  });
  
  // Check if game finished
  if (newState.phase === 'finished') {
    const winner = determineWinner(newState);
    const winnerPlayer = room.players.find((p: Player) => p.id === winner?.winnerId);
    
    io.to(gameCode).emit('color_race:game_finished', {
      winnerId: winner!.winnerId,
      winnerName: winnerPlayer!.displayName,
      finalScores: newState.scores,
    });
    
    gameService.updateRoomStatus(gameCode, 'finished');
    console.log(`🏆 Color Race finished in room ${gameCode} - Winner: ${winnerPlayer?.displayName}`);
  } else {
    // Start next round after delay
    setTimeout(() => {
      const currentRoom = gameService.getRoom(gameCode);
      if (currentRoom && currentRoom.status === 'active') {
        io.to(gameCode).emit('color_race:new_round', {
          round: newState.round,
          color: newState.currentColor,
          totalRounds: newState.totalRounds,
        });
      }
    }, COLOR_RACE_CONSTANTS.ROUND_RESULT_DELAY_MS);
  }
}

// =============================================================================
// SIMON GAME LOGIC
// =============================================================================

/**
 * Show the Simon sequence to all players
 * Epic 12: Applies tempo scaling (acceleration at cycles 3 & 5)
 */
function showSimonSequence(io: Server, gameCode: string, gameState: SimonGameState): void {
  const { sequence, round } = gameState;
  
  // Epic 12: Calculate tempo based on cycle
  let showDuration: number = SIMON_CONSTANTS.SHOW_COLOR_DURATION_MS;
  let showGap: number = SIMON_CONSTANTS.SHOW_COLOR_GAP_MS;
  
  if (round >= 5) {
    // Cycle 5+: Fastest tempo
    showDuration = SIMON_CONSTANTS.TEMPO_CYCLE_5_DURATION_MS;
    showGap = SIMON_CONSTANTS.TEMPO_CYCLE_5_GAP_MS;
  } else if (round >= 3) {
    // Cycle 3-4: Accelerated tempo
    showDuration = SIMON_CONSTANTS.TEMPO_CYCLE_3_DURATION_MS;
    showGap = SIMON_CONSTANTS.TEMPO_CYCLE_3_GAP_MS;
  }
  // Cycles 1-2: Base tempo (already set)
  
  // Emit sequence start event with tempo info
  io.to(gameCode).emit('simon:show_sequence', {
    round,
    sequence,
    showDuration, // Epic 12: Include tempo info
    showGap,
  });
  
  console.log(`🎨 Showing sequence for round ${round}: [${sequence.join(', ')}] (tempo: ${showDuration}ms/${showGap}ms)`);
  console.log(`📡 Emitted simon:show_sequence to room ${gameCode}`);
  
  // Calculate total animation time with tempo
  const totalTime = sequence.length * (showDuration + showGap);
  
  // After sequence completes, start input phase (Step 2 & Step 3)
  setTimeout(() => {
    io.to(gameCode).emit('simon:sequence_complete');
    
    // Wait 500ms, then enable input
    setTimeout(() => {
      const room = gameService.getRoom(gameCode);
      if (!room || room.status !== 'active') return;
      
      const currentState = room.gameState as SimonGameState;
      if (!currentState || currentState.gameType !== 'simon') return;
      
      // Epic 6: Fixed 20-second timeout per cycle
      const timeoutSeconds = calculateTimeoutSeconds(currentState.sequence.length);
      const timeoutMs = calculateTimeoutMs(currentState.sequence.length);
      const now = Date.now();
      const timeoutAt = now + timeoutMs;
      
      // Update game state with timeout timestamps
      const updatedState: SimonGameState = {
        ...currentState,
        phase: 'player_input',
        timeoutAt,
        timerStartedAt: now,
      };
      gameService.updateGameState(gameCode, updatedState);
      
      // Emit input phase with timeout data (Step 3)
      io.to(gameCode).emit('simon:input_phase', {
        round: currentState.round,
        timeoutAt,
        timeoutSeconds,
      });
      
      console.log(`⏰ Input phase started for round ${round} - ${timeoutSeconds}s timeout`);
      
      // Step 3: Set server-side timeout
      const timeout = setTimeout(() => {
        handleSimonTimeout(io, gameCode);
      }, timeoutMs);
      
      simonTimeouts.set(gameCode, timeout);
    }, 500);
  }, totalTime + 500);
}

/**
 * Advance to next Simon round
 */
function advanceSimonRound(io: Server, gameCode: string): void {
  const room = gameService.getRoom(gameCode);
  if (!room || room.status !== 'active') return;
  
  const gameState = room.gameState as SimonGameState;
  if (!gameState || gameState.gameType !== 'simon') return;
  
  // Advance to next round
  const newState = advanceToNextRound(gameState);
  gameService.updateGameState(gameCode, newState);
  
  console.log(`⏭️ Advancing to round ${newState.round}`);
  
  // Show new sequence
  showSimonSequence(io, gameCode, newState);
}

/**
 * Process Simon round - award points, eliminate wrong answers (Step 4)
 */
function processSimonRound(io: Server, gameCode: string): void {
  try {
    const room = gameService.getRoom(gameCode);
    if (!room || room.status !== 'active') {
      console.log(`❌ processSimonRound: Room ${gameCode} not found or inactive`);
      return;
    }
    
    let gameState = room.gameState as SimonGameState;
    if (!gameState || gameState.gameType !== 'simon') {
      console.log(`❌ processSimonRound: Invalid game state for ${gameCode}`);
      return;
    }
    
    console.log(`🏁 Processing round ${gameState.round} for room ${gameCode}...`);
    console.log(`   Submissions:`, gameState.submissions);
    console.log(`   Player states:`, gameState.playerStates);
    
    // Process submissions (find fastest, eliminate wrong)
    console.log(`📤 Calling processRoundSubmissions...`);
    const { gameState: newState, roundWinner, eliminations } = processRoundSubmissions(gameState);
    console.log(`📥 processRoundSubmissions returned:`, { roundWinner, eliminationsCount: eliminations.length });
  gameService.updateGameState(gameCode, newState);
  
  // Prepare elimination data with player names
  const eliminationData = eliminations.map(e => {
    const player = room.players.find(p => p.id === e.playerId);
    return {
      playerId: e.playerId,
      name: player?.displayName || 'Unknown',
      reason: e.reason,
    };
  });
  
  // Prepare round winner data
  const roundWinnerData = roundWinner ? {
    playerId: roundWinner.playerId,
    name: room.players.find(p => p.id === roundWinner.playerId)?.displayName || 'Unknown',
  } : null;
  
  // Broadcast eliminations
  eliminationData.forEach(elim => {
    io.to(gameCode).emit('simon:player_eliminated', {
      playerId: elim.playerId,
      playerName: elim.name,
      reason: elim.reason,
    });
  });
  
  // Broadcast round result (Step 4)
  io.to(gameCode).emit('simon:round_result', {
    roundWinner: roundWinnerData,
    eliminations: eliminationData,
    scores: newState.scores,
    playerStatuses: Object.fromEntries(
      Object.entries(newState.playerStates).map(([id, state]) => [id, state.status])
    ),
  });
  
  console.log(`🏆 Round ${newState.round} complete - Winner: ${roundWinnerData?.name || 'None'}`);
  
  // Check end conditions
  const totalPlayers = Object.keys(newState.playerStates).length;
  const activePlayers = Object.values(newState.playerStates).filter(s => s.status === 'playing').length;
  const gameEnds = shouldGameEnd(newState);
  
  console.log(`🔍 Game check: ${totalPlayers} total, ${activePlayers} active → shouldEnd=${gameEnds}`);
  
  if (gameEnds) {
    console.log(`🎯 ENDING GAME for ${gameCode}`);
    // Wait briefly, then end game
    setTimeout(() => {
      finishSimonGame(io, gameCode, newState, room);
    }, 3000);
  } else {
    console.log(`➡️ ADVANCING to next round for ${gameCode}`);
    // Wait briefly, then advance to next round
    setTimeout(() => {
      advanceSimonRound(io, gameCode);
    }, 3000);
  }
  } catch (error) {
    console.error(`❌ ERROR in processSimonRound for ${gameCode}:`, error);
    console.error(`   Stack:`, (error as Error).stack);
  }
}

/**
 * Handle Simon timeout (Step 3 & 4 - Competitive Multiplayer)
 */
function handleSimonTimeout(io: Server, gameCode: string): void {
  const room = gameService.getRoom(gameCode);
  if (!room || room.status !== 'active') return;
  
  let gameState = room.gameState as SimonGameState;
  if (!gameState || gameState.gameType !== 'simon') return;
  
  console.log(`⏰ Timeout expired for room ${gameCode}`);
  
  // Step 4: Record timeout for all players who didn't submit
  const activePlayers = Object.values(gameState.playerStates).filter(
    state => state.status === 'playing'
  );
  
  activePlayers.forEach(playerState => {
    if (!gameState.submissions[playerState.playerId]) {
      const player = room.players.find(p => p.id === playerState.playerId);
      
      // Record timeout submission (wrong)
      gameState.submissions[playerState.playerId] = {
        playerId: playerState.playerId,
        sequence: [], // Empty = timeout
        timestamp: Date.now(),
        isCorrect: false,
      };
      
      console.log(`⏰ ${player?.displayName || 'Unknown'} timed out`);
      
      // Emit timeout event
      io.to(gameCode).emit('simon:timeout', {
        playerId: playerState.playerId,
        playerName: player?.displayName || 'Unknown',
        correctSequence: gameState.sequence,
      });
    }
  });
  
  // Update game state with timeout submissions
  gameService.updateGameState(gameCode, gameState);
  
  // Clear timeout
  simonTimeouts.delete(gameCode);
  
  // Process the round (Step 4)
  processSimonRound(io, gameCode);
}

/**
 * Finish Simon game and declare winner (Epic 6 & 8: Competitive Scoring with Tie-Breakers)
 */
function finishSimonGame(io: Server, gameCode: string, gameState: SimonGameState, room: any): void {
  console.log(`🏁 finishSimonGame called for ${gameCode}`);
  
  // Epic 6 & 8: Find winner by highest score, then by lowest average time (tie-breaker)
  const playerScores = Object.entries(gameState.scores)
    .map(([playerId, score]) => {
      const player = room.players.find((p: Player) => p.id === playerId);
      // Epic 8: Calculate average time from submissions (for tie-breaker)
      // For now, we'll use a placeholder - in full implementation, track cycle times
      const averageTime = 0; // TODO: Calculate from cycle finish times
      return {
        playerId,
        name: player?.displayName || 'Unknown',
        score,
        averageTime, // Epic 8: For tie-breaking
      };
    })
    .sort((a, b) => {
      // Epic 8: Sort by score (descending), then by average time (ascending) for tie-breaker
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.averageTime - b.averageTime; // Lower average time wins
    });
  
  const winner = playerScores[0];
  
  // Emit game finished with full scoreboard
  io.to(gameCode).emit('simon:game_finished', {
    winner,
    finalScores: playerScores,
  });
  
  gameService.updateRoomStatus(gameCode, 'finished');
  console.log(`🏆 Simon finished in room ${gameCode} - Winner: ${winner?.name} with ${winner?.score} points!`);
}

// =============================================================================
// DISCONNECT HANDLING
// =============================================================================

/**
 * Handle socket disconnect
 * Epic 7: Host-drop termination logic
 */
function handleDisconnect(io: Server, socket: SocketWithSession): void {
  const { playerId, gameCode, displayName } = socket;
  
  if (!playerId || !gameCode) {
    console.log(`🔌 Socket disconnected: ${socket.id} (no session)`);
    return;
  }
  
  console.log(`⚠️ Disconnect detected: ${displayName} from room ${gameCode}`);
  
  const room = gameService.getRoom(gameCode);
  if (!room) return;
  
  // Epic 7: Check if disconnecting player is the host
  const player = room.players.find(p => p.id === playerId);
  const isHost = player?.isHost || false;
  
  // Epic 7: If host disconnects during active game, terminate session for all
  if (isHost && room.status === 'active') {
    console.log(`💥 HOST DISCONNECTED during active game - terminating session`);
    
    // Terminate game for all players
    io.to(gameCode).emit('host_disconnected', {
      message: 'THE HOST HAS LEFT THE GAME. SESSION HAS TERMINATED.',
    });
    
    // Delete room
    gameService.deleteRoom(gameCode);
    
    // Clear all disconnect timeouts for this room
    for (const [key, timeout] of disconnectTimeouts.entries()) {
      if (key.startsWith(`${gameCode}:`)) {
        clearTimeout(timeout);
        disconnectTimeouts.delete(key);
      }
    }
    
    return;
  }
  
  const timeoutKey = `${gameCode}:${playerId}`;
  
  // Set buffer timeout before marking as disconnected
  const bufferTimeout = setTimeout(() => {
    // Mark player as disconnected
    gameService.markPlayerDisconnected(gameCode, playerId);
    
    // Notify others
    io.to(gameCode).emit('player_disconnected', { 
      playerId,
      displayName,
    });
    
    console.log(`⏳ ${displayName} marked as disconnected (grace period started)`);
    
    // Epic 7: If host disconnects in waiting room, transfer host or terminate
    const currentRoom = gameService.getRoom(gameCode);
    if (currentRoom && isHost && currentRoom.status === 'waiting') {
      // Host left in waiting room - transfer to next player or close room
      if (currentRoom.players.length > 1) {
        // Transfer host to next player
        const nextHost = currentRoom.players.find(p => p.id !== playerId && p.connected);
        if (nextHost) {
          nextHost.isHost = true;
          io.to(gameCode).emit('host_transferred', {
            newHostId: nextHost.id,
            newHostName: nextHost.displayName,
          });
        }
      }
    }
    
    // Set removal timeout
    const removalTimeout = setTimeout(() => {
      const removed = gameService.removeIfStillDisconnected(gameCode, playerId);
      
      if (removed) {
        io.to(gameCode).emit('player_left', { playerId });
        console.log(`🗑️ ${displayName} removed after timeout`);
        
        // Broadcast updated room state to remaining players
        const room = gameService.getRoom(gameCode);
        if (room) {
          io.to(gameCode).emit('room_state_update', room);
        } else {
          // Room is empty/closed
          io.to(gameCode).emit('room_closed');
        }
      }
      
      disconnectTimeouts.delete(timeoutKey);
    }, PLATFORM_CONSTANTS.DISCONNECT_GRACE_MS);
    
    disconnectTimeouts.set(timeoutKey, removalTimeout);
  }, PLATFORM_CONSTANTS.DISCONNECT_BUFFER_MS);
  
  disconnectTimeouts.set(timeoutKey, bufferTimeout);
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Start interval for cleaning up dead rooms
 */
function startCleanupInterval(): void {
  setInterval(() => {
    const cleaned = gameService.cleanupDeadRooms();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} dead rooms`);
    }
  }, PLATFORM_CONSTANTS.ROOM_CLEANUP_INTERVAL_MS);
}

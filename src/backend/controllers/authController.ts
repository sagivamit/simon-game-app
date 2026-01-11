/**
 * Auth Controller
 * 
 * Handles session creation and game joining.
 * No passwords, no registration - just name + avatar.
 */

import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { gameService } from '../services/gameService';
import { generateToken, verifyToken, getSessionCookieOptions } from '../utils/auth';
import { validateCreateSession, validateJoinGame } from '../utils/validation';
import { normalizeGameCode } from '../utils/gameCode';
import type { 
  CreateSessionResponse, 
  JoinGameResponse, 
  VerifySessionResponse,
  Session,
} from '@shared/types';

// =============================================================================
// ROUTER
// =============================================================================

export const authRouter = Router();

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * POST /api/auth/create-session
 * 
 * Host creates a new game session.
 * Returns game code and sets JWT cookie.
 */
authRouter.post('/create-session', (req: Request, res: Response) => {
  try {
    console.log('🔍 CREATE SESSION - Request body:', JSON.stringify(req.body));
    
    // Validate input
    const { displayName, avatarId } = validateCreateSession(req.body);
    
    // Create room with host
    const room = gameService.createRoom({ displayName, avatarId });
    const player = room.players[0];
    
    // Create session
    const session: Session = {
      playerId: player.id,
      gameCode: room.gameCode,
      displayName: player.displayName,
      avatarId: player.avatarId,
      isHost: true,
    };
    
    // Generate JWT token
    const token = generateToken(session);
    
    // Set cookie
    res.cookie('session', token, getSessionCookieOptions());
    
    // Return response
    const response: CreateSessionResponse = {
      playerId: player.id,
      gameCode: room.gameCode,
      session,
    };
    
    console.log(`✅ Room created: ${room.gameCode} by ${displayName}`);
    
    res.status(201).json(response);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/auth/join-game
 * 
 * Player joins an existing game.
 * Returns session and sets JWT cookie.
 */
authRouter.post('/join-game', (req: Request, res: Response) => {
  try {
    // Validate input
    const { displayName, avatarId, gameCode: rawGameCode } = validateJoinGame(req.body);
    
    // Normalize game code (remove dashes, uppercase)
    const gameCode = normalizeGameCode(rawGameCode);
    
    // Epic 2: Check if room exists and hasn't expired
    const room = gameService.getRoom(gameCode);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Epic 2: Check expiry (5 minutes)
    const now = new Date();
    if (room.expiresAt && now > room.expiresAt) {
      return res.status(410).json({ error: 'Link expired' }); // 410 Gone
    }
    
    // Join room
    const joinedRoom = gameService.joinRoom(gameCode, { displayName, avatarId });
    const player = room.players[room.players.length - 1]; // Last added player
    
    // Create session
    const session: Session = {
      playerId: player.id,
      gameCode: joinedRoom.gameCode,
      displayName: player.displayName,
      avatarId: player.avatarId,
      isHost: false,
    };
    
    // Generate JWT token
    const token = generateToken(session);
    
    // Set cookie
    res.cookie('session', token, getSessionCookieOptions());
    
    // Return response
    const response: JoinGameResponse = {
      playerId: player.id,
      session,
    };
    
    console.log(`🏠 ${displayName} joined room ${gameCode} (${joinedRoom.players.length}/4 players)`);
    
    res.status(200).json(response);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/auth/verify-session
 * 
 * Verify if current session is valid.
 * Used on page refresh to restore session.
 */
authRouter.get('/verify-session', (req: Request, res: Response) => {
  try {
    const token = req.cookies.session;
    
    if (!token) {
      const response: VerifySessionResponse = { valid: false };
      return res.json(response);
    }
    
    // Verify token
    const payload = verifyToken(token);
    
    if (!payload) {
      const response: VerifySessionResponse = { valid: false };
      return res.json(response);
    }
    
    // Check if room still exists
    const room = gameService.getRoom(payload.gameCode);
    
    if (!room) {
      // Room was deleted, clear cookie
      res.clearCookie('session');
      const response: VerifySessionResponse = { valid: false };
      return res.json(response);
    }
    
    // Check if player is still in room
    const player = room.players.find(p => p.id === payload.playerId);
    
    if (!player) {
      // Player was removed, clear cookie
      res.clearCookie('session');
      const response: VerifySessionResponse = { valid: false };
      return res.json(response);
    }
    
    // Session is valid
    const session: Session = {
      playerId: player.id,
      gameCode: room.gameCode,
      displayName: player.displayName,
      avatarId: player.avatarId,
      isHost: player.isHost,
    };
    
    const response: VerifySessionResponse = { 
      valid: true, 
      session,
    };
    
    return res.json(response);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/auth/logout
 * 
 * Clear session and leave room.
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  try {
    const token = req.cookies.session;
    
    if (token) {
      const payload = verifyToken(token);
      
      if (payload) {
        // Remove player from room
        gameService.removePlayer(payload.gameCode, payload.playerId);
        console.log(`👋 ${payload.displayName} left room ${payload.gameCode}`);
      }
    }
    
    // Clear cookie
    res.clearCookie('session');
    
    res.json({ success: true });
  } catch (error) {
    handleError(error, res);
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

function handleError(error: unknown, res: Response): void {
  // Validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    console.error('❌ Validation failed:', JSON.stringify(details, null, 2));
    res.status(400).json({
      error: 'Validation failed',
      details,
    });
    return;
  }
  
  // Known game errors
  if (error instanceof Error) {
    const message = error.message;
    
    if (message === 'Room not found') {
      res.status(404).json({ error: message });
      return;
    }
    
    if (message === 'Room is full' || message === 'Game already in progress') {
      res.status(400).json({ error: message });
      return;
    }
    
    // Log unexpected errors
    console.error('❌ Controller error:', error);
  }
  
  // Generic error
  res.status(500).json({ error: 'Internal server error' });
}

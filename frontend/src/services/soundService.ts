/**
 * Sound Service for Simon Game
 * 
 * Uses Web Audio API to generate authentic Simon tones.
 * Classic Simon frequencies:
 * - GREEN: 659.25 Hz (E5)
 * - RED: 329.63 Hz (E4)
 * - YELLOW: 440.00 Hz (A4)
 * - BLUE: 277.18 Hz (C#4)
 */

import type { Color } from '../shared/types';

// =============================================================================
// TYPES
// =============================================================================

type SoundType = 'color' | 'success' | 'error' | 'eliminated' | 'timeout' | 'beep' | 'victory';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

// =============================================================================
// SOUND CONFIGURATIONS
// =============================================================================

// Epic 9: Original 1978 Simon hardware frequencies
const COLOR_FREQUENCIES: Record<Color, number> = {
  green: 659.25,  // E5 - High (original Simon)
  red: 329.63,    // E4 - Low (original Simon)
  yellow: 440.00, // A4 - Medium-high (original Simon)
  blue: 277.18,   // C#4 - Medium-low (original Simon)
};

// Sound configs for different events
const SOUND_CONFIGS: Record<SoundType, Partial<SoundConfig>> = {
  color: { duration: 0.8, type: 'sine', volume: 0.5 },
  success: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.4 },
  error: { frequency: 150, duration: 0.5, type: 'sawtooth', volume: 0.4 },
  razz: { frequency: 100, duration: 0.8, type: 'sawtooth', volume: 0.6 }, // Epic 9: Harsh "Razz" buzz
  eliminated: { frequency: 200, duration: 0.6, type: 'triangle', volume: 0.4 },
  timeout: { frequency: 300, duration: 0.3, type: 'square', volume: 0.3 },
  beep: { frequency: 600, duration: 0.15, type: 'sine', volume: 0.3 },
  victory: { frequency: 523.25, duration: 0.8, type: 'sine', volume: 0.5 },
};

// =============================================================================
// SOUND SERVICE CLASS
// =============================================================================

class SoundService {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private currentOscillator: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;

  constructor() {
    // Load mute preference from localStorage
    const savedMute = localStorage.getItem('simon-sound-muted');
    this.isMuted = savedMute === 'true';
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume if suspended (happens in some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('🔊 Sound service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
    }
  }

  /**
   * Check if sound is muted
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('simon-sound-muted', String(this.isMuted));
    
    // Stop any playing sound when muting
    if (this.isMuted) {
      this.stopCurrentSound();
    }
    
    return this.isMuted;
  }

  /**
   * Set mute state explicitly
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('simon-sound-muted', String(muted));
    
    if (muted) {
      this.stopCurrentSound();
    }
  }

  /**
   * Stop currently playing sound
   */
  private stopCurrentSound(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
        this.currentOscillator.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.currentOscillator = null;
    }
    if (this.currentGain) {
      this.currentGain.disconnect();
      this.currentGain = null;
    }
  }

  /**
   * Play a tone with given configuration
   */
  private playTone(config: SoundConfig): void {
    if (this.isMuted || !this.audioContext || !this.isInitialized) return;

    // Stop any previous sound
    this.stopCurrentSound();

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);

      // Smooth envelope (attack-decay-sustain-release)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, this.audioContext.currentTime + 0.02); // Attack
      gainNode.gain.linearRampToValueAtTime(config.volume * 0.8, this.audioContext.currentTime + config.duration * 0.3); // Decay
      gainNode.gain.linearRampToValueAtTime(config.volume * 0.6, this.audioContext.currentTime + config.duration * 0.8); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + config.duration); // Release

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.currentOscillator = oscillator;
      this.currentGain = gainNode;

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration);

      // Cleanup after sound ends
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        if (this.currentOscillator === oscillator) {
          this.currentOscillator = null;
          this.currentGain = null;
        }
      };
    } catch (error) {
      console.error('❌ Error playing tone:', error);
    }
  }

  /**
   * Play color tone (for sequence and input)
   */
  playColor(color: Color, duration?: number): void {
    const config = SOUND_CONFIGS.color;
    this.playTone({
      frequency: COLOR_FREQUENCIES[color],
      duration: duration || config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play color tone briefly (for button clicks)
   */
  playColorClick(color: Color): void {
    this.playColor(color, 0.2);
  }

  /**
   * Play success sound
   */
  playSuccess(): void {
    const config = SOUND_CONFIGS.success;
    // Play a pleasant ascending arpeggio
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play error sound
   */
  playError(): void {
    const config = SOUND_CONFIGS.error;
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Epic 9: Play "Razz" buzz sound (harsh error feedback)
   */
  playRazz(): void {
    const config = SOUND_CONFIGS.razz;
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play elimination sound
   */
  playEliminated(): void {
    const config = SOUND_CONFIGS.eliminated;
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play timeout sound
   */
  playTimeout(): void {
    const config = SOUND_CONFIGS.timeout;
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play timer warning beep
   */
  playBeep(): void {
    const config = SOUND_CONFIGS.beep;
    this.playTone({
      frequency: config.frequency!,
      duration: config.duration!,
      type: config.type!,
      volume: config.volume!,
    });
  }

  /**
   * Play victory fanfare (ascending notes)
   */
  playVictory(): void {
    if (this.isMuted || !this.audioContext || !this.isInitialized) return;

    // Play a quick ascending arpeggio: C-E-G-C
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteLength = 0.15;
    
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone({
          frequency: freq,
          duration: noteLength,
          type: 'sine',
          volume: 0.4,
        });
      }, index * 150);
    });
  }

  /**
   * Play countdown beep (for 3-2-1 countdown)
   */
  playCountdown(count: number): void {
    if (this.isMuted || !this.audioContext || !this.isInitialized) return;

    // Higher pitch for lower numbers (more urgent)
    const frequencies: Record<number, number> = {
      3: 400,
      2: 500,
      1: 600,
      0: 800, // Go!
    };

    const freq = frequencies[count] || 500;
    this.playTone({
      frequency: freq,
      duration: count === 0 ? 0.4 : 0.2,
      type: 'sine',
      volume: 0.4,
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const soundService = new SoundService();

export default soundService;

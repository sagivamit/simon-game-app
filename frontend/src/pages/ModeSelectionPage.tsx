/**
 * Mode Selection Page
 * 
 * Displays user profile and allows selection between Training and Competition modes.
 * Redesigned to match target UI with card layout and icons.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';

// SVG Icons as components
const PersonIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GroupIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export function ModeSelectionPage() {
  const navigate = useNavigate();
  const { displayName, avatarEmoji, isProfileComplete } = useProfileStore();
  
  // Redirect to profile setup if no profile
  useEffect(() => {
    if (!isProfileComplete()) {
      navigate('/');
    }
  }, [isProfileComplete, navigate]);

  const handleTrainingMode = () => {
    navigate('/training');
  };

  const handleCompetitiveMode = () => {
    navigate('/play');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 pt-16 sm:pt-20">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center">
          {avatarEmoji}
        </span>
        <span className="text-white text-lg font-medium">
          {displayName}
        </span>
      </div>
      
      {/* Title */}
      <h1 className="text-white text-2xl font-bold mb-8 tracking-wide">
        SELECT MODE
      </h1>
      
      {/* Mode Cards Container */}
      <div className="w-full max-w-sm space-y-4">
        {/* Training Card */}
        <button
          onClick={handleTrainingMode}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left transition-all duration-150 hover:border-green-500/50 hover:bg-slate-800/80 active:scale-98"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <PersonIcon className="text-green-500 w-6 h-6" />
            </div>
            <span className="text-green-500 font-bold text-xl tracking-wide">
              TRAINING
            </span>
          </div>
          
          {/* Card Details */}
          <ul className="space-y-2.5 text-gray-300 text-sm">
            <li className="flex items-center gap-3">
              <BoltIcon className="text-gray-500" />
              <span>Solo Play</span>
            </li>
            <li className="flex items-center gap-3">
              <ClockIcon className="text-gray-500" />
              <span>10 Cycles</span>
            </li>
            <li className="flex items-center gap-3">
              <TrophyIcon className="text-gray-500" />
              <span>Track Your Speed</span>
            </li>
          </ul>
        </button>
        
        {/* Competition Card */}
        <button
          onClick={handleCompetitiveMode}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 text-left transition-all duration-150 hover:border-blue-500/50 hover:bg-slate-800/80 active:scale-98"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <GroupIcon className="text-blue-500 w-6 h-6" />
            </div>
            <span className="text-blue-500 font-bold text-xl tracking-wide">
              COMPETITION
            </span>
          </div>
          
          {/* Card Details */}
          <ul className="space-y-2.5 text-gray-300 text-sm">
            <li className="flex items-center gap-3">
              <GroupIcon className="text-gray-500 w-[18px] h-[18px]" />
              <span>2-4 Players</span>
            </li>
            <li className="flex items-center gap-3">
              <ClockIcon className="text-gray-500" />
              <span>5 Cycles</span>
            </li>
            <li className="flex items-center gap-3">
              <TrophyIcon className="text-gray-500" />
              <span>Race to Win</span>
            </li>
          </ul>
        </button>
      </div>
    </div>
  );
}

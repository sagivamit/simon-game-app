/**
 * Profile Setup Page
 * 
 * First screen - collects user name and avatar before mode selection.
 * Dark navy design matching the target UI.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, AVATAR_OPTIONS } from '../store/profileStore';

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { displayName, avatarId, setDisplayName, setAvatar, isProfileComplete } = useProfileStore();
  
  const [localName, setLocalName] = useState(displayName);
  const [localAvatarId, setLocalAvatarId] = useState(avatarId);
  
  // Sync local state with store on mount
  useEffect(() => {
    setLocalName(displayName);
    setLocalAvatarId(avatarId);
  }, [displayName, avatarId]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 12); // Max 12 chars
    setLocalName(value);
    setDisplayName(value);
  };
  
  const handleAvatarSelect = (id: string) => {
    setLocalAvatarId(id);
    setAvatar(id);
  };
  
  const handleContinue = () => {
    if (isProfileComplete()) {
      navigate('/mode');
    }
  };
  
  const isValid = localName.trim().length >= 3;
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Title */}
        <h1 className="text-white text-2xl font-bold text-center mb-8">
          CREATE PROFILE
        </h1>
        
        {/* Avatar Selection */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-3 text-center">
            Choose Avatar
          </label>
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {AVATAR_OPTIONS.map((emoji, index) => {
              const id = String(index + 1);
              const isSelected = localAvatarId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleAvatarSelect(id)}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all duration-150 ${
                    isSelected
                      ? 'bg-slate-700 border-2 border-blue-500 scale-110'
                      : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Name Input */}
        <div className="mb-8">
          <label className="block text-gray-400 text-sm mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={localName}
            onChange={handleNameChange}
            placeholder="Enter your name"
            minLength={3}
            maxLength={12}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="flex justify-between mt-2">
            <span className="text-gray-500 text-xs">
              {localName.length < 3 ? 'Min 3 characters' : ''}
            </span>
            <span className="text-gray-500 text-xs">
              {localName.length}/12
            </span>
          </div>
        </div>
        
        {/* Preview */}
        {isValid && (
          <div className="mb-6 flex items-center justify-center gap-3 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <span className="text-4xl">
              {AVATAR_OPTIONS[parseInt(localAvatarId) - 1]}
            </span>
            <span className="text-white text-lg font-medium">
              {localName}
            </span>
          </div>
        )}
        
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-150 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white active:scale-98'
              : 'bg-slate-800 text-gray-500 cursor-not-allowed'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}


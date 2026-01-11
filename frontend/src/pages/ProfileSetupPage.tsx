/**
 * Profile Setup Page
 * 
 * First screen - collects user name and avatar before mode selection.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, AVATAR_OPTIONS } from '../store/profileStore';

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { displayName, avatarId, setDisplayName, setAvatar, isProfileComplete } = useProfileStore();
  
  const [localName, setLocalName] = useState(displayName);
  const [localAvatarId, setLocalAvatarId] = useState(avatarId);
  
  useEffect(() => {
    setLocalName(displayName);
    setLocalAvatarId(avatarId);
  }, [displayName, avatarId]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 12);
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
  const selectedEmoji = AVATAR_OPTIONS[parseInt(localAvatarId) - 1] || AVATAR_OPTIONS[0];
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Title */}
        <h1 className="text-white text-2xl font-bold text-center mb-8">
          SET PROFILE
        </h1>
        
        {/* Large Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
            <span className="text-5xl">{selectedEmoji}</span>
          </div>
        </div>
        
        {/* Avatar Grid - 6 columns */}
        <div className="grid grid-cols-6 gap-2 mb-8">
          {AVATAR_OPTIONS.map((emoji, index) => {
            const id = String(index + 1);
            const isSelected = localAvatarId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleAvatarSelect(id)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-150 ${
                  isSelected
                    ? 'bg-slate-600 border-2 border-slate-400'
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        
        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
            Your Name
          </label>
          <input
            type="text"
            value={localName}
            onChange={handleNameChange}
            placeholder="Enter your name"
            minLength={3}
            maxLength={12}
            className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
        </div>
        
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-150 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white active:scale-98'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}

/**
 * Main App Component
 * 
 * Routes and navigation.
 */

import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { ModeSelectionPage } from './pages/ModeSelectionPage';
import { EntryPage } from './pages/EntryPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';
import { SoloTrainingPage } from './pages/SoloTrainingPage';
import { LinkExpiredPage } from './pages/LinkExpiredPage';
import { LandscapeWarning } from './components/ui/LandscapeWarning';
import { SplashScreen } from './components/ui/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <BrowserRouter>
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} duration={3000} />
      )}
      <LandscapeWarning />
      <Routes>
        {/* New flow: Profile Setup -> Mode Selection -> Training/Competition */}
        <Route path="/" element={<ProfileSetupPage />} />
        <Route path="/mode" element={<ModeSelectionPage />} />
        <Route path="/training" element={<SoloTrainingPage />} />
        <Route path="/play" element={<EntryPage />} />
        <Route path="/waiting" element={<WaitingRoomPage />} />
        <Route path="/expired" element={<LinkExpiredPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

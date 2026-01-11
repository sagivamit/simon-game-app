# Testing Guide

## Quick Start

### 1. Run the Application Locally

```bash
# Install dependencies (if not already done)
npm install
cd frontend && npm install && cd ..

# Start both backend and frontend in development mode
npm run dev
```

This will start:
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173` (Vite default)

Open `http://localhost:5173` in your browser.

---

## Automated Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests with UI
```bash
npm run test:ui
```

---

## Manual Testing Checklist

### Epic 5: Implicit Submission ✅
- [ ] **No Submit Button**: Verify submit button is removed from game board
- [ ] **Instant Validation**: Tap a wrong color → should immediately show error (Razz sound + glitch)
- [ ] **Auto-Lock**: Complete sequence correctly → input should lock automatically
- [ ] **Finish Time**: Check console logs for `performance.now()` timestamps

**How to Test:**
1. Start a game
2. Wait for sequence to finish
3. Tap colors - each tap should validate instantly
4. Tap wrong color → should trigger error immediately
5. Complete sequence → should auto-lock and show "Sequence Complete!"

---

### Epic 6: Competitive Scoring ✅
- [ ] **5 Cycles**: Game should end after exactly 5 rounds
- [ ] **20-Second Timer**: Each cycle should have 20-second countdown
- [ ] **Single Winner**: Only fastest correct player gets +1 point (check scoreboard)

**How to Test:**
1. Create/join a multiplayer game
2. Play through rounds
3. Verify timer shows 20 seconds each round
4. Verify game ends after round 5
5. Check that only fastest player gets points

---

### Epic 3: Solo Training Mode ✅
- [ ] **Mode Selection**: Home page should show Training vs Competition options
- [ ] **10 Cycles**: Training mode should run 10 cycles
- [ ] **Metrics**: Results screen should show Average Time and Fastest Time
- [ ] **No Server**: Training should work offline (no WebSocket needed)

**How to Test:**
1. Go to home page → Click "Training Mode"
2. Complete 10 cycles
3. Check results screen for metrics
4. Try "Re-Train" button

---

### Epic 11: Neon Dark-Mode UI ✅
- [ ] **Black Background**: All pages should have deep black (#000000) background
- [ ] **Neon Colors**: UI elements should use neon green/red/yellow/blue
- [ ] **Glow Effects**: Buttons and game board should have glow effects
- [ ] **Consistent Theme**: All pages (Entry, Waiting Room, Game, Results) should match

**How to Test:**
1. Navigate through all pages
2. Check for neon glow effects on interactive elements
3. Verify dark theme consistency

---

### Epic 9: Enhanced Audio & Haptics ✅
- [ ] **Razz Sound**: Wrong tap should play harsh buzz sound
- [ ] **Haptic Feedback**: On mobile, wrong tap should vibrate strongly
- [ ] **Color Tones**: Original Simon frequencies should play correctly

**How to Test:**
1. Enable sound
2. Tap wrong color → should hear harsh "Razz" buzz
3. On mobile device → should feel strong vibration
4. Verify color tones match original Simon game

---

### Epic 2: Invite Link Expiry ✅
- [ ] **5-Minute Expiry**: Room should expire after 5 minutes
- [ ] **Expired Screen**: Attempting to join expired link should show "Link Expired" screen
- [ ] **Countdown**: (Optional) Check if expiry countdown is shown

**How to Test:**
1. Create a game
2. Wait 5+ minutes (or manually set expiry in code)
3. Try to join with expired link
4. Should see "Link Expired" screen

---

### Epic 7: Host-Drop Termination ✅
- [ ] **Host Leaves**: If host leaves during active game, all players should see termination message
- [ ] **Host Transfer**: If host leaves in waiting room, next player should become host
- [ ] **Graceful Handling**: Non-host players leaving should not terminate game

**How to Test:**
1. Start a multiplayer game with 2+ players
2. Have host close browser/tab during active game
3. Other players should see "THE HOST HAS LEFT THE GAME" message
4. Test host transfer in waiting room

---

### Epic 8: Results & Podium ✅
- [ ] **3-Tier Podium**: Game over screen should show podium with top 3 players
- [ ] **Tie-Breaker**: Players with same score should be ranked by average time
- [ ] **Final Standings**: All players should be listed with scores

**How to Test:**
1. Complete a multiplayer game
2. Check game over screen for 3-tier podium
3. Verify top 3 players are on podium
4. Check final standings list

---

### Epic 12: Sequence Scaling & Tempo ✅
- [ ] **Cycle 1-2**: Base tempo (600ms show, 200ms gap)
- [ ] **Cycle 3-4**: Accelerated (450ms show, 150ms gap)
- [ ] **Cycle 5**: Fastest (300ms show, 100ms gap)

**How to Test:**
1. Play through all 5 cycles
2. Notice sequence gets faster at cycle 3
3. Notice sequence gets even faster at cycle 5
4. Check console logs for tempo values

---

### Epic 4: Synchronized Game Engine ✅
- [ ] **Same Sequence**: All players should see identical sequence
- [ ] **Ready-Check**: Countdown should wait for all players
- [ ] **Frame-Accurate**: Sequence timing should be consistent across devices

**How to Test:**
1. Open game in multiple browser tabs/windows
2. Join same room
3. Verify all players see same sequence colors
4. Check that countdown waits for all players

---

### Epic 14: Visual Juice ✅
- [ ] **Victory Explosion**: Winner should see neon particle explosion
- [ ] **Glitch Effect**: Wrong tap should trigger screen shake/chromatic aberration
- [ ] **Smooth Transitions**: Cycle transitions should have motion blur effect

**How to Test:**
1. Win a game → should see particle explosion
2. Tap wrong color → should see glitch effect
3. Watch transitions between cycles

---

## Testing Multiplayer Features

### Test with Multiple Devices/Browsers

1. **Open Multiple Tabs/Windows:**
   - Tab 1: Create game (host)
   - Tab 2-4: Join game (players)

2. **Test Scenarios:**
   - All players join → countdown starts
   - Host starts game → all see sequence
   - Players submit → scoreboard updates
   - Host leaves → termination message
   - Player eliminated → status updates

### Test on Mobile Device

1. **Connect to Local Network:**
   - Find your local IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
   - Access from mobile: `http://YOUR_IP:5173`

2. **Test Mobile Features:**
   - Touch interactions
   - Haptic feedback
   - Responsive design
   - Portrait/landscape orientation

---

## Debugging Tips

### Check Console Logs
- Open browser DevTools (F12)
- Look for console logs with emojis (🎨, 🎮, ✅, ❌)
- Backend logs show in terminal

### Check Network Tab
- Verify WebSocket connection (should see `socket.io` connection)
- Check API calls to `/api/auth/*` endpoints

### Check Application State
- Use React DevTools to inspect Zustand stores
- Check `simonStore` and `soloTrainingStore` state

---

## Common Issues & Solutions

### Issue: Frontend can't connect to backend
**Solution:** Check that backend is running on port 3000 and frontend has correct `VITE_API_URL`

### Issue: WebSocket connection fails
**Solution:** Check CORS settings and `FRONTEND_URL` environment variable

### Issue: Styles not loading
**Solution:** Check that Tailwind CSS is configured correctly and `index.css` exists

### Issue: Audio not playing
**Solution:** Browser requires user interaction before playing audio - click anywhere first

---

## Performance Testing

### Check Frame Rate
- Open DevTools → Performance tab
- Record during gameplay
- Should maintain 60fps

### Check Network Latency
- Open DevTools → Network tab
- Check WebSocket message timing
- Should be < 100ms for local network

---

## Accessibility Testing (Epic 13 - Partial)

- [ ] **Keyboard Support**: Test with keyboard (1, 2, 3, 4 keys for colors)
- [ ] **Screen Reader**: Test with screen reader (ARIA labels)
- [ ] **Colorblind Mode**: (To be implemented) Toggle symbol overlay

---

## Next Steps

After testing, if you find issues:
1. Check console for error messages
2. Verify all environment variables are set
3. Check that all dependencies are installed
4. Review the implementation in the relevant files

For Epic 10 (NTP Sync) and Epic 13 (Accessibility), these are advanced features that can be tested once fully implemented.


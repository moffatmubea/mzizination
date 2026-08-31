# 🎮 CRASH GAME - TESTING GUIDE

## Quick Start
```bash
# Navigate to project
cd rebrand

# Dev server already running at:
# http://localhost:5174/games/crash
```

---

## ✨ FEATURES TO TEST

### 1. Exponential Growth 📈
**What to Look For:**
- Multiplier starts at 1.00x and accelerates smoothly
- Curve should be exponential (slow start, rapid acceleration)
- The longer the game, the steeper the climb

**How to Test:**
1. Start a game
2. Observe the multiplier value grows (1.00 → 1.50 → 3.00 → 10.00+ )
3. The curve line should follow the multiplier growth
4. Text multiplier in center should match curve endpoint

**Expected Result:** ✅ Smooth exponential curve visible, multiplier synchronizes with curve position

---

### 2. Rocket Flight Animation 🚀
**What to Look For:**
- Rocket sprite follows the curve smoothly
- Rocket rotates to match curve trajectory
- Exhaust trail follows behind rocket
- Glow effect around rocket

**How to Test:**
1. Start a game
2. Watch rocket move across canvas
3. Note the rotation angle changes as curve gets steeper
4. Exhaust should be perpendicular to rocket direction

**Expected Result:** ✅ Rocket smoothly tracks curve with proper rotation and exhaust trail

---

### 3. Multiplier Color Transition 🌈
**What to Look For:**
- Multiplier text color changes from orange → yellow → white as it increases
- Shadow glow matches text color and intensity
- Colors should be vibrant and readable

**Color Progression:**
- Low (1-2x): White text
- Medium (2-5x): Orange (#f7931a)
- High (5-10x): Yellow (#ffc107)
- Very High (10x+): Bright/Golden

**How to Test:**
1. Start game and let it run
2. Watch text color progression
3. Verify legibility throughout

**Expected Result:** ✅ Smooth color transitions matching multiplier zones

---

### 4. Crash Effects 💥
**What to Look For:**
- Immediate particle explosion
- Screen shake animation (600ms duration)
- Crash sound effect (audio synthesis)
- Explosion GIF at crash point
- Curve turns red
- Rocket desaturates

**How to Test:**
1. Let game run until crash (3-15 seconds)
2. Observe all effects simultaneously:
   - Feel screen shake
   - Hear audio (if volume enabled)
   - See particle burst
   - Explosion animation plays
   - Status changes to "Crashed @X.XXx"

**Expected Result:** ✅ All crash effects trigger at exact same moment, screen feels responsive

---

### 5. Particle Explosion 🎆
**What to Look For:**
- ~30 particles burst outward from crash point
- Particles have different colors (red, orange, yellow, white)
- Each particle has individual glow
- Gravity simulation (particles fall downward)
- Particles fade out gradually

**How to Test:**
1. Cause a crash
2. Watch particles:
   - Emit from crash location
   - Travel in all directions
   - Fall due to gravity
   - Fade over ~1 second

**Expected Result:** ✅ Realistic explosion with physics and gradual fade-out

---

### 6. Screen Shake 📳
**What to Look For:**
- Entire canvas area shakes
- Shake is violent initially, dampens over time
- Duration: ~600ms
- Intensity reduces after peak

**How to Test:**
1. Crash the game
2. Notice entire canvas area vibrates
3. Vibration should stop after ~600ms
4. Should feel responsive but not nauseating

**Expected Result:** ✅ Smooth shake that adds impact without discomfort

---

### 7. Audio Feedback 🔊
**What to Look For:**
- Brief crash sound plays on impact
- Sound is synthesized (not a file)
- Pitch sweeps from high to low
- Duration: ~300ms

**How to Test:**
1. Enable system volume
2. Crash a game
3. Listen for:
   - Initial high frequency tone
   - Exponential pitch drop
   - Natural fade-out

**Expected Result:** ✅ Crisp, realistic crash sound with proper frequency sweep

---

### 8. Grid & Axes 📐
**What to Look For:**
- Subtle grid background (barely visible)
- Y-axis labels: 1.0x, 2.0x, 3.0x, etc.
- X-axis labels: Time in seconds
- Dashed grid lines at intervals

**How to Test:**
1. Look at canvas background
2. Identify grid pattern (40x40px)
3. Check axis labels update dynamically
4. Verify labels make sense for curve height/width

**Expected Result:** ✅ Clear reference grid without visual clutter

---

### 9. Status Messages 📢
**What to Look For:**
- During wait: "Starting in 5.0s" (counts down)
- During flight: Multiplier updates in real-time
- During crash: "Crashed @X.XXx" in red tag

**How to Test:**
1. Watch countdown before game starts
2. Observe multiplier display updates smoothly
3. Check crash message shows correct multiplier

**Expected Result:** ✅ Clear, accurate status information always visible

---

### 10. Responsive Design 📱
**What to Look For:**
- Game adapts to different screen sizes
- Touch controls work on mobile
- Scaling is proportional
- No UI elements overlap

**How to Test:**
1. Resize browser window (or use DevTools)
2. Test at various breakpoints:
   - 320px (mobile)
   - 768px (tablet)
   - 1024px (desktop)
3. Verify all visual effects scale properly

**Expected Result:** ✅ Game remains playable and visually correct at all sizes

---

## 🎯 PERFORMANCE CHECKS

### FPS Monitoring
```javascript
// In browser console:
console.time('gameFrame')
// ... observe game
console.timeEnd('gameFrame')
```

**Expected:** 60 FPS during flight, smooth animation

### Memory Usage
```javascript
// In browser DevTools → Performance tab
// Record during 10+ games
// Check for memory leaks
```

**Expected:** ~5-10MB stable memory, no continuous growth

### CPU Usage
```javascript
// Monitor in DevTools
// Should see ~15-20% CPU usage on average device
```

---

## 🐛 KNOWN BEHAVIORS

### Intentional
- Particles stop rendering after 1 second (performance)
- Grid lines may flicker at high zoom levels (browser limitation)
- Screen shake is viewport-based (affects entire canvas)
- Audio only plays if Web Audio API available

### Edge Cases to Test
1. **Very Quick Crash** (< 1 second)
   - Effects should still trigger
   - No visual glitches

2. **Very Long Flight** (> 60 seconds)
   - Multiplier continues scaling correctly
   - Canvas adapts to massive numbers
   - Performance remains smooth

3. **Rapid Succession** (crash → start → crash)
   - No lingering effects from previous crash
   - Particle arrays clean up properly
   - Audio doesn't overlap

4. **Mobile Landscape**
   - UI adapts to wide screen
   - Touch controls remain accessible
   - No overflow or clipping

---

## 📊 METRICS TO OBSERVE

| Metric | Expected | Observable |
|--------|----------|-----------|
| Curve Accuracy | ±0.01x | Multiplier text matches curve endpoint |
| Rocket Position | ±2px | Rocket at curve end, visually aligned |
| Crash Delay | <50ms | Effects start immediately after crash |
| Particle Count | 30 | Count particles burst from center |
| Shake Duration | 600ms ± 50ms | Time to full dampening |
| Frame Rate | 60 FPS | No stuttering or dropped frames |

---

## ✅ TESTING CHECKLIST

**Visual Effects**
- [ ] Multiplier curve grows smoothly
- [ ] Rocket follows curve accurately
- [ ] Exhaust rotates with rocket
- [ ] Colors transition properly
- [ ] Glow effects visible

**Crash Effects**
- [ ] Particles burst outward
- [ ] Screen shakes smoothly
- [ ] Audio crash sound plays
- [ ] Explosion GIF displays
- [ ] Curve turns red
- [ ] Status updates correctly

**Performance**
- [ ] 60 FPS maintained
- [ ] No visual stuttering
- [ ] Memory stable
- [ ] CPU usage reasonable
- [ ] Responsive to input

**Responsive Design**
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works
- [ ] All effects scale properly
- [ ] No UI overlap

---

## 🚀 DEPLOYMENT NOTES

### For Production
1. Verify audio context initialization works
2. Test on various mobile browsers
3. Monitor performance metrics in production
4. Ensure image assets (rocket, exhaust, explosion) are cached
5. Test on slow networks (3G simulation)

### Environment Variables
```javascript
// Optional customization in .env
VITE_CRASH_SHAKE_INTENSITY=15      // pixels
VITE_CRASH_PARTICLE_COUNT=30        // count
VITE_CRASH_SOUND_ENABLED=true       // boolean
```

---

## 🆘 TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| No crash effects | Check browser console for errors |
| Audio not working | Verify Web Audio API available |
| Screen shake choppy | Close other browser tabs |
| Mobile layout broken | Clear browser cache, hard refresh |
| Particles not visible | Check particle ref updates |
| Rocket not rotating | Verify trajectory angle calculation |

---

## 📚 DEVELOPER NOTES

### Key Components
- **GameChart.jsx** (504 lines): Main rendering component
- **CrashGame.css** (1793 lines): Styles and animations
- **Particle System**: Managed in `particlesRef`
- **Animation Loop**: RequestAnimationFrame @ 60fps

### Customization Points
```javascript
// In GameChart.jsx
triggerCrashEffects() // Modify particle count, colors
playCrashSound()      // Adjust frequency sweep
maxMultiplier         // Scale Y-axis differently
maxTime               // Adjust X-axis range
```

---

Enjoy testing! 🎉 Report any issues or feature requests.

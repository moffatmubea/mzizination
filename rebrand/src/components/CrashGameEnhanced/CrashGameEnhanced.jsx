import React, { useState, useEffect, useRef } from 'react';
import './CrashGameEnhanced.css';

const CrashGameEnhanced = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef({
    status: 'idle', // idle, playing, crashed, won
    multiplier: 1.0,
    crashMultiplier: null,
    jetX: 0,
    jetY: 0,
    particles: [],
    gameStartTime: null,
    crashTime: null,
    trailPoints: []
  });

  const [state, setState] = useState({
    status: 'idle',
    multiplier: 1.0,
    crashed: false,
    bet: 10,
    balance: 1000,
    winnings: 0,
    canCashOut: false,
    message: ''
  });

  const [betAmount, setBetAmount] = useState(10);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0f1419';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid background
      drawGrid(ctx, canvas);

      if (gameStateRef.current.status === 'playing') {
        updateGameState();
        drawJet(ctx);
        drawTrail(ctx);
        drawMultiplier(ctx, canvas);
      } else if (gameStateRef.current.status === 'crashed') {
        drawJet(ctx);
        drawCrashEffect(ctx);
        drawParticles(ctx);
        updateParticles();
        drawMultiplier(ctx, canvas);
      } else if (gameStateRef.current.status === 'won') {
        drawJet(ctx);
        drawTrail(ctx);
        drawMultiplier(ctx, canvas);
      } else {
        // Idle state - show waiting message
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press START to begin', canvas.width / 2, canvas.height / 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const updateGameState = () => {
    const game = gameStateRef.current;
    const elapsed = Date.now() - game.gameStartTime;

    if (elapsed >= game.crashTime) {
      triggerCrash();
      return;
    }

    // Exponential multiplier growth
    const progress = elapsed / game.crashTime;
    const multiplier = 1 + Math.pow(progress, 1.2) * 9.5;

    // Smooth jet movement (curved trajectory)
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;

    game.jetX = (progress * canvasWidth * 0.9) + 30;
    game.jetY = canvasHeight * 0.7 - (progress * progress * canvasHeight * 0.5);

    game.multiplier = Math.max(1.0, multiplier);

    // Add trail points
    if (game.trailPoints.length === 0 || 
        Math.hypot(
          game.jetX - game.trailPoints[game.trailPoints.length - 1].x,
          game.jetY - game.trailPoints[game.trailPoints.length - 1].y
        ) > 5) {
      game.trailPoints.push({ x: game.jetX, y: game.jetY });
      if (game.trailPoints.length > 100) {
        game.trailPoints.shift();
      }
    }

    setState(prev => ({
      ...prev,
      multiplier: parseFloat(game.multiplier.toFixed(2)),
      canCashOut: true
    }));
  };

  const drawGrid = (ctx, canvas) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  const drawTrail = (ctx) => {
    const trail = gameStateRef.current.trailPoints;
    if (trail.length < 2) return;

    // Gradient trail
    for (let i = 0; i < trail.length - 1; i++) {
      const alpha = (i / trail.length) * 0.6;
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(trail[i].x, trail[i].y);
      ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
      ctx.stroke();
    }
  };

  const drawJet = (ctx) => {
    const game = gameStateRef.current;
    const x = game.jetX;
    const y = game.jetY;

    if (game.status === 'crashed') {
      ctx.globalAlpha = 0.5;
    }

    // Jet body
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 15, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Jet wings
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(x - 15, y + 5, 8, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 5, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Jet glow
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 25, 18, -0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  };

  const drawMultiplier = (ctx, canvas) => {
    const game = gameStateRef.current;
    const multiplier = game.multiplier.toFixed(2);

    // Draw multiplier text with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(multiplier + 'x', canvas.width / 2 + 2, 60 + 2);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(multiplier + 'x', canvas.width / 2, 60);

    // Status text
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    if (game.status === 'playing') {
      ctx.fillText('📈 FLYING...', canvas.width / 2, canvas.height - 20);
    } else if (game.status === 'crashed') {
      ctx.fillStyle = '#FF4444';
      ctx.fillText('💥 CRASHED!', canvas.width / 2, canvas.height - 20);
    }
  };

  const triggerCrash = () => {
    const game = gameStateRef.current;
    game.status = 'crashed';
    game.crashMultiplier = game.multiplier;

    // Create particles
    for (let i = 0; i < 15; i++) {
      game.particles.push({
        x: game.jetX,
        y: game.jetY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 1,
        size: Math.random() * 8 + 4,
        color: ['#FFD700', '#FFA500', '#FF6B6B'][Math.floor(Math.random() * 3)]
      });
    }

    setState(prev => ({
      ...prev,
      status: 'crashed',
      crashed: true,
      canCashOut: false,
      message: `Game Crashed at ${game.multiplier.toFixed(2)}x`
    }));
  };

  const drawCrashEffect = (ctx) => {
    const game = gameStateRef.current;

    // Draw multiple explosion circles
    for (let i = 0; i < 3; i++) {
      const size = 40 + i * 30;
      const alpha = 0.4 - i * 0.1;
      ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(game.jetX, game.jetY, size, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const updateParticles = () => {
    const particles = gameStateRef.current.particles;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // Gravity
      p.life -= 0.02;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  };

  const drawParticles = (ctx) => {
    const particles = gameStateRef.current.particles;

    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  };

  const startGame = () => {
    if (betAmount > state.balance || betAmount <= 0) {
      setState(prev => ({ ...prev, message: '❌ Invalid bet amount' }));
      return;
    }

    const crashTime = Math.floor(Math.random() * 20000) + 3000; // 3-23 seconds

    gameStateRef.current = {
      status: 'playing',
      multiplier: 1.0,
      crashMultiplier: null,
      jetX: 30,
      jetY: 0,
      particles: [],
      gameStartTime: Date.now(),
      crashTime: crashTime,
      trailPoints: []
    };

    setState(prev => ({
      ...prev,
      status: 'playing',
      crashed: false,
      bet: betAmount,
      balance: prev.balance - betAmount,
      canCashOut: true,
      message: '🚀 Game started! Tap Cash Out before the crash!'
    }));
  };

  const cashOut = () => {
    const game = gameStateRef.current;
    if (game.status !== 'playing') return;

    game.status = 'won';

    const winnings = state.bet * state.multiplier;
    const profit = winnings - state.bet;

    setState(prev => ({
      ...prev,
      status: 'won',
      canCashOut: false,
      balance: prev.balance + winnings,
      winnings: profit,
      message: `✅ Cashed out at ${state.multiplier}x! Won $${profit.toFixed(2)}`
    }));
  };

  const playAgain = () => {
    gameStateRef.current.status = 'idle';
    setState(prev => ({
      ...prev,
      status: 'idle',
      multiplier: 1.0,
      crashed: false,
      canCashOut: false,
      message: ''
    }));
  };

  return (
    <div className="crash-container">
      <div className="crash-header">
        <h1>🚀 CRASH GAME</h1>
        <p>Watch the multiplier climb—crash out before impact!</p>
      </div>

      {state.message && (
        <div className={`crash-message ${state.status}`}>
          {state.message}
        </div>
      )}

      <div className="crash-game-content">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="crash-canvas"
        />

        <div className="crash-side-panel">
          <div className="crash-stats">
            <div className="crash-stat">
              <div className="crash-stat-label">Balance</div>
              <div className="crash-stat-value">${state.balance.toFixed(2)}</div>
            </div>
            <div className="crash-stat">
              <div className="crash-stat-label">Current Bet</div>
              <div className="crash-stat-value">${state.bet.toFixed(2)}</div>
            </div>
            <div className="crash-stat">
              <div className="crash-stat-label">Potential Win</div>
              <div className="crash-stat-value crash-potential">
                ${(state.bet * state.multiplier).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="crash-controls">
            {state.status === 'idle' && (
              <>
                <div className="crash-bet-section">
                  <label>Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    min="1"
                    max={state.balance}
                    className="crash-input"
                  />
                  <div className="crash-quick-bets">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        className="crash-quick-bet"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startGame}
                  disabled={betAmount > state.balance}
                  className="crash-btn crash-btn-start"
                >
                  🚀 START GAME
                </button>
              </>
            )}

            {state.status === 'playing' && (
              <button
                onClick={cashOut}
                className="crash-btn crash-btn-cashout"
              >
                💰 CASH OUT
                <div className="crash-btn-amount">
                  Win ${(state.bet * state.multiplier).toFixed(2)}
                </div>
              </button>
            )}

            {(state.status === 'crashed' || state.status === 'won') && (
              <>
                <div className={`crash-result ${state.status}`}>
                  <div className="crash-result-emoji">
                    {state.status === 'won' ? '🎉' : '💥'}
                  </div>
                  <div className="crash-result-text">
                    {state.status === 'won' ? 'YOU WON!' : 'CRASHED!'}
                  </div>
                  <div className="crash-result-amount">
                    {state.status === 'won'
                      ? `+$${state.winnings.toFixed(2)}`
                      : `-$${state.bet.toFixed(2)}`}
                  </div>
                </div>

                <button
                  onClick={playAgain}
                  className="crash-btn crash-btn-again"
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="crash-info">
        <h3>How to Play</h3>
        <p>
          Place your bet and watch the multiplier rise. The jet flies higher and higher,
          but it might crash at any moment! Click <strong>Cash Out</strong> to secure your winnings
          before the crash. If the jet crashes before you cash out, you lose your bet!
        </p>
      </div>
    </div>
  );
};

export default CrashGameEnhanced;

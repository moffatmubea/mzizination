import React, { useState, useEffect, useRef } from 'react';
import './JetXGameReact.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function JetXGameReact() {
  const [gameState, setGameState] = useState('idle'); // idle, playing, crashed, won
  const [multiplier, setMultiplier] = useState(1.0);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [jetPosition, setJetPosition] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [winnings, setWinnings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const gameLoopRef = useRef(null);
  const startTimeRef = useRef(null);
  const gameIdRef = useRef(null);
  const crashTimeRef = useRef(null);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/jetx/balance`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const startGame = async () => {
    if (bet <= 0 || bet > balance) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/jetx/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bet })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to start game');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      gameIdRef.current = data.game_id;
      crashTimeRef.current = data.crash_time;
      
      setGameState('playing');
      setMultiplier(1.0);
      setCrashed(false);
      setJetPosition(0);
      setWinnings(0);
      setBalance(balance - bet);
      
      startTimeRef.current = Date.now();
      
      // Game loop
      gameLoopRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        
        if (elapsed >= crashTimeRef.current) {
          crashGame();
          return;
        }
        
        // Smooth multiplier increase
        const progress = elapsed / crashTimeRef.current;
        const newMultiplier = 1 + (Math.pow(progress, 1.3) * 4);
        const newPosition = Math.min(90, progress * 100);
        
        setMultiplier(parseFloat(newMultiplier.toFixed(2)));
        setJetPosition(newPosition);
      }, 30);
      
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const crashGame = async () => {
    clearInterval(gameLoopRef.current);
    setCrashed(true);
    setGameState('crashed');
    
    // Notify backend
    try {
      await fetch(`${API_URL}/api/jetx/crash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ game_id: gameIdRef.current })
      });
      await fetchBalance();
    } catch (err) {
      console.error('Failed to report crash:', err);
    }
  };

  const cashOut = async () => {
    if (gameState !== 'playing') return;
    
    clearInterval(gameLoopRef.current);
    
    try {
      const response = await fetch(`${API_URL}/api/jetx/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          game_id: gameIdRef.current,
          multiplier: multiplier
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.new_balance);
        setWinnings(data.winnings);
        setGameState('won');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cash out');
        if (data.error && data.error.includes('Crashed')) {
          setCrashed(true);
          setGameState('crashed');
        }
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
  };

  const playAgain = () => {
    setGameState('idle');
    setMultiplier(1.0);
    setCrashed(false);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  return (
    <div className="jetx-react-container">
      <div className="jetx-header">
        <h1>✈️ JetX</h1>
        <p>Cash out before the jet crashes!</p>
      </div>

      {error && (
        <div className="jetx-error-banner">
          {error}
          <button onClick={() => setError(null)} className="jetx-error-close">×</button>
        </div>
      )}

      <div className="jetx-game-area">
        <div className="jetx-canvas">
          <div className="jetx-grid-bg"></div>
          
          <div className={`jetx-jet ${crashed ? 'crashed' : ''}`} style={{ left: `${jetPosition}%` }}>
            ✈️
          </div>

          {crashed && (
            <div className="jetx-explosion" style={{ left: `${jetPosition}%` }}>
              💥
            </div>
          )}

          <div className="jetx-multiplier-box">
            <div className="jetx-multiplier-value">{multiplier.toFixed(2)}x</div>
            <div className="jetx-status">
              {gameState === 'playing' ? '📈 Flying...' : gameState === 'crashed' ? '💣 Crashed!' : '⏳ Ready'}
            </div>
          </div>
        </div>

        <div className="jetx-stats">
          <div className="jetx-stat">
            <span>Balance</span>
            <strong>${balance.toFixed(2)}</strong>
          </div>
          <div className="jetx-stat">
            <span>Bet</span>
            <strong>${bet}</strong>
          </div>
          <div className="jetx-stat">
            <span>To Win</span>
            <strong>${(bet * multiplier).toFixed(2)}</strong>
          </div>
        </div>

        <div className="jetx-controls">
          {gameState === 'idle' && (
            <>
              <div className="jetx-bet-input">
                <label>Bet Amount</label>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(Math.max(1, parseInt(e.target.value) || 0))}
                  min="1"
                  max={balance}
                  disabled={loading}
                />
              </div>
              <button
                onClick={startGame}
                disabled={bet <= 0 || bet > balance || loading}
                className="jetx-btn jetx-btn-start"
              >
                {loading ? 'Loading...' : '🚀 Start Game'}
              </button>
            </>
          )}

          {gameState === 'playing' && (
            <button onClick={cashOut} className="jetx-btn jetx-btn-cashout">
              💰 Cash Out - Win ${(bet * multiplier).toFixed(2)}
            </button>
          )}

          {(gameState === 'crashed' || gameState === 'won') && (
            <>
              <div className={`jetx-result ${gameState}`}>
                <div className="jetx-result-title">
                  {gameState === 'won' ? '🎉 You Won!' : '😱 Crashed!'}
                </div>
                <div className="jetx-result-amount">
                  {gameState === 'won' ? `+$${(winnings - bet).toFixed(2)}` : `-$${bet}`}
                </div>
              </div>
              <button onClick={playAgain} className="jetx-btn jetx-btn-again">
                Play Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JetXGameReact;

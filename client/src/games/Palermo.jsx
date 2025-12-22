import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import './Palermo.css';

const ROLES = {
    MAFIA: { name: 'Mafia', emoji: '🔪', team: 'mafia' },
    DOCTOR: { name: 'Doctor', emoji: '💉', team: 'village' },
    DETECTIVE: { name: 'Detective', emoji: '🔍', team: 'village' },
    VILLAGER: { name: 'Villager', emoji: '👤', team: 'village' }
};

const Palermo = ({ socket, roomId, user, players }) => {
    const [gamePhase, setGamePhase] = useState('lobby');
    const [myRole, setMyRole] = useState(null);
    const [isAlive, setIsAlive] = useState(true);
    const [alivePlayers, setAlivePlayers] = useState([]);
    const [votes, setVotes] = useState({});
    const [myVote, setMyVote] = useState(null);
    const [message, setMessage] = useState('');
    const [gameLog, setGameLog] = useState([]);
    const [winner, setWinner] = useState(null);
    const [nightTarget, setNightTarget] = useState(null);
    const [showRole, setShowRole] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const countdownRef = useRef(null);

    // Start countdown when we receive a timer
    const startCountdown = (seconds) => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        setCountdown(seconds);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('palermo-roles', ({ roles }) => {
            const myRoleKey = roles[user.username];
            setMyRole(ROLES[myRoleKey]);
            setShowRole(true);
            setTimeout(() => setShowRole(false), 5000);
        });

        socket.on('palermo-phase', ({ phase, alivePlayers: alive, message: msg, timer }) => {
            console.log('Phase changed:', phase, 'timer:', timer);
            setGamePhase(phase);
            if (alive) setAlivePlayers(alive);
            if (msg) {
                setGameLog(prev => [...prev, msg]);
                setMessage(msg);
            }
            if (timer && timer > 0) {
                startCountdown(timer);
            }
            setVotes({});
            setMyVote(null);
            setNightTarget(null);
        });

        socket.on('palermo-vote-update', ({ votes: newVotes }) => {
            setVotes(newVotes);
        });

        socket.on('palermo-death', ({ username, role }) => {
            if (username === user.username) {
                setIsAlive(false);
            }
            setGameLog(prev => [...prev, `💀 ${username} (${role}) died!`]);
        });

        socket.on('palermo-game-over', ({ winner: w, message: msg }) => {
            setWinner(w);
            setMessage(msg);
            setGamePhase('gameOver');
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        });

        socket.on('palermo-night-result', ({ message: msg }) => {
            setGameLog(prev => [...prev, msg]);
        });

        socket.on('game-reset', () => {
            setGamePhase('lobby');
            setMyRole(null);
            setIsAlive(true);
            setAlivePlayers([]);
            setVotes({});
            setMyVote(null);
            setGameLog([]);
            setWinner(null);
            setCountdown(0);
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        });

        return () => {
            socket.off('palermo-roles');
            socket.off('palermo-phase');
            socket.off('palermo-vote-update');
            socket.off('palermo-death');
            socket.off('palermo-game-over');
            socket.off('palermo-night-result');
            socket.off('game-reset');
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [socket, user.username]);

    const startGame = () => {
        if (players.length < 4) {
            alert('Need at least 4 players!');
            return;
        }
        socket.emit('palermo-start', { roomId });
    };

    const performNightAction = (target) => {
        if (!myRole || !isAlive || nightTarget) return;
        setNightTarget(target);
        socket.emit('palermo-night-action', { roomId, action: myRole.name, target });
    };

    const castVote = (target) => {
        if (!isAlive || myVote) return;
        setMyVote(target);
        socket.emit('palermo-vote', { roomId, target });
    };

    const getPhaseDisplay = () => {
        const time = countdown > 0 ? ` (${countdown}s)` : '';
        switch (gamePhase) {
            case 'night': return `🌙 Night${time}`;
            case 'day': return `☀️ Day${time}`;
            case 'voting': return `🗳️ Voting${time}`;
            case 'lobby': return '⏳ Waiting';
            case 'gameOver': return '🏆 Game Over';
            default: return '';
        }
    };

    return (
        <div className="palermo-game">
            <div className="game-header">
                <h3>🎭 Palermo</h3>
                <div className="phase-indicator">{getPhaseDisplay()}</div>
            </div>

            {myRole && (
                <div className={`role-card ${showRole ? 'show' : ''}`} onClick={() => setShowRole(!showRole)}>
                    <div className="role-emoji">{myRole.emoji}</div>
                    <div className="role-name">{myRole.name}</div>
                    <div className="role-team">{myRole.team === 'mafia' ? 'Mafia' : 'Village'}</div>
                    {!isAlive && <div className="dead-overlay">💀 DEAD</div>}
                </div>
            )}

            {gamePhase === 'lobby' && (
                <div className="lobby-section">
                    <h2>Players: {players.length}</h2>
                    <div className="players-list">
                        {players.map((p, i) => (
                            <div key={i} className="player-chip">{p.username}</div>
                        ))}
                    </div>
                    <p className="info-text">Need 4+ players</p>
                    <Button variant="primary" onClick={startGame} disabled={players.length < 4}>
                        Start Game
                    </Button>
                </div>
            )}

            {gamePhase === 'night' && isAlive && myRole && (
                <div className="night-section">
                    <h2>🌙 Night - {myRole.name}</h2>
                    {myRole.name === 'Mafia' && (
                        <div className="action-section">
                            <p>Choose who to kill:</p>
                            <div className="target-list">
                                {alivePlayers.filter(p => p !== user.username).map((p, i) => (
                                    <button key={i} className={`target-btn ${nightTarget === p ? 'selected' : ''}`}
                                        onClick={() => performNightAction(p)} disabled={nightTarget}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {myRole.name === 'Doctor' && (
                        <div className="action-section">
                            <p>Choose who to save:</p>
                            <div className="target-list">
                                {alivePlayers.map((p, i) => (
                                    <button key={i} className={`target-btn ${nightTarget === p ? 'selected' : ''}`}
                                        onClick={() => performNightAction(p)} disabled={nightTarget}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {myRole.name === 'Detective' && (
                        <div className="action-section">
                            <p>Choose who to investigate:</p>
                            <div className="target-list">
                                {alivePlayers.filter(p => p !== user.username).map((p, i) => (
                                    <button key={i} className={`target-btn ${nightTarget === p ? 'selected' : ''}`}
                                        onClick={() => performNightAction(p)} disabled={nightTarget}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {myRole.name === 'Villager' && (
                        <div className="action-section">
                            <p>💤 Sleeping... Wait for day.</p>
                        </div>
                    )}
                    {nightTarget && <p className="selected-text">✓ Selected: {nightTarget}</p>}
                </div>
            )}

            {(gamePhase === 'day' || gamePhase === 'voting') && (
                <div className="day-section">
                    <h2>{gamePhase === 'day' ? '☀️ Day - Discussion' : '🗳️ Voting'}</h2>
                    <div className="message-display">{message}</div>
                    <div className="alive-players">
                        <h3>Alive Players:</h3>
                        <div className="players-grid">
                            {alivePlayers.map((p, i) => (
                                <div key={i} className="player-card">
                                    <span>{p}</span>
                                    {gamePhase === 'voting' && isAlive && p !== user.username && (
                                        <button className={`vote-btn ${myVote === p ? 'voted' : ''}`}
                                            onClick={() => castVote(p)} disabled={myVote}>
                                            {votes[p] || 0} 🗳️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {myVote && <p className="vote-status">You voted for: {myVote}</p>}
                </div>
            )}

            {gamePhase === 'gameOver' && (
                <div className="game-over-section">
                    <h2>{winner === 'mafia' ? '🔪 Mafia Wins!' : '👥 Village Wins!'}</h2>
                    <p>{message}</p>
                    <Button variant="primary" onClick={() => socket.emit('game-reset', { roomId, gameType: 'palermo' })}>
                        Play Again
                    </Button>
                </div>
            )}

            {!isAlive && gamePhase !== 'gameOver' && gamePhase !== 'lobby' && (
                <div className="spectator-mode">
                    <p>💀 You are dead. Spectating...</p>
                </div>
            )}

            <div className="game-log">
                <h4>📜 Game Log</h4>
                <div className="log-entries">
                    {gameLog.slice(-5).map((log, i) => (
                        <div key={i} className="log-entry">{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Palermo;

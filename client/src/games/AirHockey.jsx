import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../components/Button';
import './AirHockey.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_RADIUS = 30;
const PUCK_RADIUS = 15;
const GOAL_HEIGHT = 120;

const AirHockey = ({ socket, roomId, user, players }) => {
    const canvasRef = useRef(null);
    const [scores, setScores] = useState([0, 0]);
    const [gameStarted, setGameStarted] = useState(false);
    const [winner, setWinner] = useState(null);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const isHost = myPlayerIndex === 0;

    const gameRef = useRef({
        paddle1: { x: 80, y: CANVAS_HEIGHT / 2 },
        paddle2: { x: CANVAS_WIDTH - 80, y: CANVAS_HEIGHT / 2 },
        puck: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 4, vy: 3 }
    });

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            if (state.paddle1) gameRef.current.paddle1 = state.paddle1;
            if (state.paddle2) gameRef.current.paddle2 = state.paddle2;
            if (state.puck) gameRef.current.puck = state.puck;
            if (state.scores) setScores(state.scores);
            if (state.winner !== undefined) setWinner(state.winner);
            if (state.gameStarted) setGameStarted(true);
        });

        socket.on('game-reset', () => {
            setScores([0, 0]);
            setWinner(null);
            setGameStarted(false);
            gameRef.current = {
                paddle1: { x: 80, y: CANVAS_HEIGHT / 2 },
                paddle2: { x: CANVAS_WIDTH - 80, y: CANVAS_HEIGHT / 2 },
                puck: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 4, vy: 3 }
            };
        });

        // Receive other player's paddle
        socket.on('paddle-update', ({ playerIndex, paddle }) => {
            if (playerIndex === 0 && myPlayerIndex !== 0) {
                gameRef.current.paddle1 = paddle;
            } else if (playerIndex === 1 && myPlayerIndex !== 1) {
                gameRef.current.paddle2 = paddle;
            }
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
            socket.off('paddle-update');
        };
    }, [socket, myPlayerIndex]);

    // Game loop
    useEffect(() => {
        if (!gameStarted || winner !== null) return;

        const interval = setInterval(() => {
            const g = gameRef.current;

            // Both players check collision with THEIR OWN paddle
            const myPaddle = myPlayerIndex === 0 ? g.paddle1 : g.paddle2;

            const dx = g.puck.x - myPaddle.x;
            const dy = g.puck.y - myPaddle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < PADDLE_RADIUS + PUCK_RADIUS && dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                // Hit the puck!
                g.puck.x = myPaddle.x + nx * (PADDLE_RADIUS + PUCK_RADIUS + 2);
                g.puck.y = myPaddle.y + ny * (PADDLE_RADIUS + PUCK_RADIUS + 2);
                g.puck.vx = nx * 8;
                g.puck.vy = ny * 8;

                // Send puck update to other player
                socket.emit('game-move', {
                    roomId,
                    gameType: 'airhockey',
                    puck: g.puck
                });
            }

            // Only host moves the puck and checks goals
            if (isHost) {
                g.puck.x += g.puck.vx;
                g.puck.y += g.puck.vy;

                // Wall bounce
                if (g.puck.y <= PUCK_RADIUS || g.puck.y >= CANVAS_HEIGHT - PUCK_RADIUS) {
                    g.puck.vy *= -1;
                    g.puck.y = Math.max(PUCK_RADIUS, Math.min(g.puck.y, CANVAS_HEIGHT - PUCK_RADIUS));
                }

                const goalTop = (CANVAS_HEIGHT - GOAL_HEIGHT) / 2;
                const goalBottom = goalTop + GOAL_HEIGHT;

                // Left goal - Player 2 scores
                if (g.puck.x <= PUCK_RADIUS) {
                    if (g.puck.y > goalTop && g.puck.y < goalBottom) {
                        const newScores = [scores[0], scores[1] + 1];
                        setScores(newScores);
                        g.puck = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: -4, vy: 3 };
                        socket.emit('game-move', { roomId, gameType: 'airhockey', scores: newScores, puck: g.puck, winner: newScores[1] >= 5 ? 1 : null });
                        if (newScores[1] >= 5) setWinner(1);
                    } else {
                        g.puck.vx = Math.abs(g.puck.vx);
                        g.puck.x = PUCK_RADIUS;
                    }
                }

                // Right goal - Player 1 scores
                if (g.puck.x >= CANVAS_WIDTH - PUCK_RADIUS) {
                    if (g.puck.y > goalTop && g.puck.y < goalBottom) {
                        const newScores = [scores[0] + 1, scores[1]];
                        setScores(newScores);
                        g.puck = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 4, vy: -3 };
                        socket.emit('game-move', { roomId, gameType: 'airhockey', scores: newScores, puck: g.puck, winner: newScores[0] >= 5 ? 0 : null });
                        if (newScores[0] >= 5) setWinner(0);
                    } else {
                        g.puck.vx = -Math.abs(g.puck.vx);
                        g.puck.x = CANVAS_WIDTH - PUCK_RADIUS;
                    }
                }

                // Broadcast puck position periodically
                socket.emit('game-move', { roomId, gameType: 'airhockey', puck: g.puck });
            }

        }, 16);

        return () => clearInterval(interval);
    }, [gameStarted, winner, isHost, socket, roomId, scores, myPlayerIndex]);

    // Drawing loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const draw = () => {
            const g = gameRef.current;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Center line
            ctx.strokeStyle = '#6366f1';
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH / 2, 0);
            ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
            ctx.stroke();
            ctx.setLineDash([]);

            // Goals
            const goalY = (CANVAS_HEIGHT - GOAL_HEIGHT) / 2;
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(0, goalY, 10, GOAL_HEIGHT);
            ctx.fillRect(CANVAS_WIDTH - 10, goalY, 10, GOAL_HEIGHT);

            // Paddle 1 (red)
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(g.paddle1.x, g.paddle1.y, PADDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Paddle 2 (green)
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(g.paddle2.x, g.paddle2.y, PADDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Puck
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(g.puck.x, g.puck.y, PUCK_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animId);
    }, []);

    const handleMove = useCallback((clientX, clientY) => {
        if (!gameStarted || winner !== null) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;

        y = Math.max(PADDLE_RADIUS, Math.min(y, CANVAS_HEIGHT - PADDLE_RADIUS));

        if (myPlayerIndex === 0) {
            x = Math.max(PADDLE_RADIUS, Math.min(x, CANVAS_WIDTH / 2 - PADDLE_RADIUS));
            gameRef.current.paddle1 = { x, y };
            socket?.emit('airhockey-paddle', { roomId, playerIndex: 0, paddle: { x, y } });
        } else {
            x = Math.max(CANVAS_WIDTH / 2 + PADDLE_RADIUS, Math.min(x, CANVAS_WIDTH - PADDLE_RADIUS));
            gameRef.current.paddle2 = { x, y };
            socket?.emit('airhockey-paddle', { roomId, playerIndex: 1, paddle: { x, y } });
        }
    }, [gameStarted, winner, myPlayerIndex, socket, roomId]);

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleStart = () => {
        if (players.length < 2) {
            alert('Waiting for player 2!');
            return;
        }
        setGameStarted(true);
        socket.emit('game-move', { roomId, gameType: 'airhockey', gameStarted: true });
    };

    return (
        <div className="airhockey-game">
            <div className="game-info">
                <h3>🏒 Air Hockey</h3>
                <div className="scores">
                    <span style={{ color: '#ff6b6b' }}>{players[0]?.username}: {scores[0]}</span>
                    <span> - </span>
                    <span style={{ color: '#4ade80' }}>{players[1]?.username}: {scores[1]}</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                style={{ border: '2px solid #6366f1', borderRadius: '8px', touchAction: 'none' }}
            />

            {!gameStarted && (
                <Button variant="primary" onClick={handleStart} style={{ marginTop: '20px' }}>
                    Start Game
                </Button>
            )}

            {winner !== null && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <h2>{winner === myPlayerIndex ? '🏆 You Win!' : '😢 You Lose!'}</h2>
                    <Button variant="primary" onClick={() => socket.emit('game-reset', { roomId, gameType: 'airhockey' })}>
                        Play Again
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AirHockey;

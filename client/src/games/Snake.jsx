import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import './Snake.css';

const GRID_SIZE = 20;
const CELL_SIZE = 20;

const Snake = ({ socket, roomId, user, players }) => {
    const [snake1, setSnake1] = useState([{ x: 5, y: 10 }]);
    const [snake2, setSnake2] = useState([{ x: 15, y: 10 }]);
    const [direction1, setDirection1] = useState({ x: 1, y: 0 });
    const [direction2, setDirection2] = useState({ x: -1, y: 0 });
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [scores, setScores] = useState([0, 0]);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);

    const boardRef = useRef(null);
    const myPlayerIndex = players.findIndex(p => p.username === user.username);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            if (state.snake1) setSnake1(state.snake1);
            if (state.snake2) setSnake2(state.snake2);
            if (state.food) setFood(state.food);
            if (state.scores) setScores(state.scores);
            if (state.direction1) setDirection1(state.direction1);
            if (state.direction2) setDirection2(state.direction2);
            if (state.gameOver) {
                setGameOver(true);
                setWinner(state.winner);
            }
            if (state.gameStarted !== undefined) setGameStarted(state.gameStarted);
        });

        socket.on('game-reset', () => {
            handleReset();
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!gameStarted || gameOver || !socket) return;

            const key = e.key;
            changeDirection(key === 'ArrowUp' ? 'up' :
                key === 'ArrowDown' ? 'down' :
                    key === 'ArrowLeft' ? 'left' :
                        key === 'ArrowRight' ? 'right' : null);
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameStarted, gameOver, socket, direction1, direction2, myPlayerIndex, roomId]);

    const changeDirection = (dir) => {
        if (!dir || !socket || !gameStarted || gameOver) return;

        const currentDir = myPlayerIndex === 0 ? direction1 : direction2;
        let newDirection = null;

        if (dir === 'up' && currentDir.y === 0) newDirection = { x: 0, y: -1 };
        else if (dir === 'down' && currentDir.y === 0) newDirection = { x: 0, y: 1 };
        else if (dir === 'left' && currentDir.x === 0) newDirection = { x: -1, y: 0 };
        else if (dir === 'right' && currentDir.x === 0) newDirection = { x: 1, y: 0 };

        if (newDirection) {
            if (myPlayerIndex === 0) {
                setDirection1(newDirection);
            } else {
                setDirection2(newDirection);
            }

            socket.emit('snake-direction', {
                roomId,
                playerIndex: myPlayerIndex,
                direction: newDirection
            });
        }
    };

    const handleStart = () => {
        if (!socket) return;
        if (players.length < 2) {
            alert('Waiting for second player to join!');
            return;
        }
        socket.emit('snake-start', { roomId });
    };

    const handleReset = () => {
        setGameStarted(false);
        setGameOver(false);
        setSnake1([{ x: 5, y: 10 }]);
        setSnake2([{ x: 15, y: 10 }]);
        setDirection1({ x: 1, y: 0 });
        setDirection2({ x: -1, y: 0 });
        setScores([0, 0]);
        setWinner(null);
    };

    return (
        <div className="snake-game">
            <div className="game-info">
                <h3>🐍 Snake Battle</h3>
                <div className="scores">
                    {players.map((player, index) => (
                        <div key={index} className="player-score">
                            <span>{player.username}</span>
                            <strong>{scores[index]}</strong>
                        </div>
                    ))}
                </div>
            </div>

            <div
                ref={boardRef}
                className="snake-board"
                style={{
                    width: GRID_SIZE * CELL_SIZE,
                    height: GRID_SIZE * CELL_SIZE
                }}
            >
                <div
                    className="food"
                    style={{
                        left: food.x * CELL_SIZE,
                        top: food.y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE
                    }}
                >
                    🍎
                </div>

                {snake1.map((segment, index) => (
                    <div
                        key={`s1-${index}`}
                        className={`snake-segment green ${index === 0 ? 'snake-head' : ''}`}
                        style={{
                            left: segment.x * CELL_SIZE,
                            top: segment.y * CELL_SIZE,
                            width: CELL_SIZE,
                            height: CELL_SIZE
                        }}
                    />
                ))}

                {snake2.map((segment, index) => (
                    <div
                        key={`s2-${index}`}
                        className={`snake-segment blue ${index === 0 ? 'snake-head' : ''}`}
                        style={{
                            left: segment.x * CELL_SIZE,
                            top: segment.y * CELL_SIZE,
                            width: CELL_SIZE,
                            height: CELL_SIZE
                        }}
                    />
                ))}

                {!gameStarted && !gameOver && (
                    <div className="game-overlay">
                        <h2>Ready to Battle?</h2>
                        <p>You are: {myPlayerIndex === 0 ? '🟢 Green Snake' : '🔵 Blue Snake'}</p>
                        <Button variant="primary" onClick={handleStart}>
                            Start Game
                        </Button>
                    </div>
                )}

                {gameOver && (
                    <div className="game-overlay">
                        <h2>Game Over!</h2>
                        <p>
                            {winner === 'draw' ? "It's a Draw!" :
                                winner === myPlayerIndex ? "You Win! 🏆" : "You Lose! 😔"}
                        </p>
                        <p>Final Score: {scores[0]} - {scores[1]}</p>
                        <Button variant="primary" onClick={() => {
                            if (socket) {
                                socket.emit('game-reset', { roomId, gameType: 'snake' });
                            }
                        }}>
                            Play Again
                        </Button>
                    </div>
                )}
            </div>

            {/* Simple Direction Buttons */}
            {gameStarted && !gameOver && (
                <div className="direction-controls">
                    <button className="dir-btn up" onTouchStart={(e) => { e.preventDefault(); changeDirection('up'); }} onClick={() => changeDirection('up')}>↑</button>
                    <div className="dir-row">
                        <button className="dir-btn left" onTouchStart={(e) => { e.preventDefault(); changeDirection('left'); }} onClick={() => changeDirection('left')}>←</button>
                        <button className="dir-btn right" onTouchStart={(e) => { e.preventDefault(); changeDirection('right'); }} onClick={() => changeDirection('right')}>→</button>
                    </div>
                    <button className="dir-btn down" onTouchStart={(e) => { e.preventDefault(); changeDirection('down'); }} onClick={() => changeDirection('down')}>↓</button>
                </div>
            )}
        </div>
    );
};

export default Snake;

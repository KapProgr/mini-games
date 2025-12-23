import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './Backgammon.css';

const POINTS = 24;

const Backgammon = ({ socket, roomId, user, players }) => {
    const [board, setBoard] = useState([]);
    const [dice, setDice] = useState([0, 0]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [availableMoves, setAvailableMoves] = useState([]);
    const [usedDice, setUsedDice] = useState([]);
    const [winner, setWinner] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const isMyTurn = currentPlayer === myPlayerIndex;

    useEffect(() => {
        if (players.length === 2 && !gameStarted) {
            initializeBoard();
        }
    }, [players.length]);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            if (state.board) setBoard(state.board);
            if (state.dice) setDice(state.dice);
            if (state.currentPlayer !== undefined) setCurrentPlayer(state.currentPlayer);
            if (state.usedDice) setUsedDice(state.usedDice);
            if (state.winner) {
                setWinner(state.winner);
                setShowResult(true);
            }
            setGameStarted(true);
        });

        socket.on('game-reset', () => {
            initializeBoard();
            setWinner(null);
            setShowResult(false);
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket]);

    const initializeBoard = () => {
        // Simplified backgammon setup
        const newBoard = Array(POINTS).fill(null).map(() => ({ count: 0, player: null }));

        // Player 0 (red) pieces
        newBoard[0] = { count: 2, player: 0 };
        newBoard[11] = { count: 5, player: 0 };
        newBoard[16] = { count: 3, player: 0 };
        newBoard[18] = { count: 5, player: 0 };

        // Player 1 (white) pieces
        newBoard[23] = { count: 2, player: 1 };
        newBoard[12] = { count: 5, player: 1 };
        newBoard[7] = { count: 3, player: 1 };
        newBoard[5] = { count: 5, player: 1 };

        setBoard(newBoard);
        setDice([0, 0]);
        setCurrentPlayer(0);
        setUsedDice([]);
        setSelectedPoint(null);
        setGameStarted(true);
        setWinner(null);

        if (socket && myPlayerIndex === 0) {
            socket.emit('game-move', {
                roomId,
                gameType: 'backgammon',
                board: newBoard,
                dice: [0, 0],
                currentPlayer: 0,
                usedDice: []
            });
        }
    };

    const rollDice = () => {
        if (!isMyTurn || dice[0] !== 0 || !socket) return;

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;

        playSound();

        socket.emit('game-move', {
            roomId,
            gameType: 'backgammon',
            board,
            dice: [die1, die2],
            currentPlayer,
            usedDice: []
        });
    };

    const canMovePiece = (from, steps) => {
        if (!board[from] || board[from].player !== currentPlayer) return false;

        const direction = currentPlayer === 0 ? 1 : -1;
        const to = from + (steps * direction);

        if (to < 0 || to >= POINTS) return false;

        const destPoint = board[to];
        if (destPoint.player !== null && destPoint.player !== currentPlayer && destPoint.count > 1) {
            return false; // Blocked by opponent
        }

        return true;
    };

    const movePiece = (from, steps) => {
        if (!socket) return;

        const direction = currentPlayer === 0 ? 1 : -1;
        const to = from + (steps * direction);

        const newBoard = board.map(p => ({ ...p }));

        // Move piece
        newBoard[from].count--;
        if (newBoard[from].count === 0) {
            newBoard[from].player = null;
        }

        // Capture opponent piece if present
        if (newBoard[to].player !== null && newBoard[to].player !== currentPlayer) {
            newBoard[to].count = 0;
            newBoard[to].player = null;
        }

        newBoard[to].count++;
        newBoard[to].player = currentPlayer;

        const newUsedDice = [...usedDice, steps];

        // Check if all dice used or no more moves
        let nextPlayer = currentPlayer;
        let newDice = dice;

        if (newUsedDice.length >= 2 || (dice[0] === dice[1] && newUsedDice.length >= 4)) {
            nextPlayer = 1 - currentPlayer;
            newDice = [0, 0];
        }

        // Check for winner (simplified - if opponent has no pieces)
        const opponentPieces = newBoard.filter(p => p.player === (1 - currentPlayer)).reduce((sum, p) => sum + p.count, 0);
        const gameWinner = opponentPieces === 0 ? currentPlayer : null;

        socket.emit('game-move', {
            roomId,
            gameType: 'backgammon',
            board: newBoard,
            dice: newDice,
            currentPlayer: nextPlayer,
            usedDice: newDice[0] === 0 ? [] : newUsedDice,
            winner: gameWinner
        });

        setSelectedPoint(null);
    };

    const handlePointClick = (pointIndex) => {
        if (!isMyTurn || dice[0] === 0) return;

        const point = board[pointIndex];

        if (selectedPoint === null) {
            // Select a piece to move
            if (point.player === currentPlayer && point.count > 0) {
                setSelectedPoint(pointIndex);

                // Calculate available moves
                const moves = [];
                const availableDice = dice.filter((d, i) => !usedDice.includes(i));

                for (let die of availableDice) {
                    if (canMovePiece(pointIndex, die)) {
                        moves.push(die);
                    }
                }
                setAvailableMoves(moves);
            }
        } else {
            // Try to move to this point
            const direction = currentPlayer === 0 ? 1 : -1;
            const diff = (pointIndex - selectedPoint) * direction;

            if (availableMoves.includes(diff)) {
                movePiece(selectedPoint, diff);
            } else {
                setSelectedPoint(null);
                setAvailableMoves([]);
            }
        }
    };

    const endTurn = () => {
        if (!socket || !isMyTurn) return;

        socket.emit('game-move', {
            roomId,
            gameType: 'backgammon',
            board,
            dice: [0, 0],
            currentPlayer: 1 - currentPlayer,
            usedDice: []
        });
    };

    const playSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 400;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) { }
    };

    const handleReset = () => {
        if (socket) {
            socket.emit('game-reset', { roomId, gameType: 'backgammon' });
        }
    };

    if (!gameStarted || board.length === 0) {
        return (
            <div className="backgammon-game">
                <div className="game-info">
                    <h3>🎲 Backgammon</h3>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="backgammon-game">
            <div className="game-info">
                <h3>🎲 Backgammon</h3>
                <div className="players-info">
                    {players.map((player, index) => (
                        <div key={index} className={`player-indicator ${currentPlayer === index ? 'active' : ''}`}>
                            <span>{player.username}</span>
                            <div className={`player-color ${index === 0 ? 'red' : 'white'}`}></div>
                        </div>
                    ))}
                </div>
                {!winner && (
                    <div className="turn-indicator">
                        {isMyTurn ? (
                            <span className="badge badge-success">Your Turn!</span>
                        ) : (
                            <span className="badge badge-primary">Opponent's Turn</span>
                        )}
                    </div>
                )}
            </div>

            <div className="backgammon-board">
                <div className="dice-container">
                    {dice[0] > 0 && (
                        <>
                            <div className="die">{getDieFace(dice[0])}</div>
                            <div className="die">{getDieFace(dice[1])}</div>
                        </>
                    )}
                </div>

                <div className="board-points">
                    {board.map((point, index) => (
                        <div
                            key={index}
                            className={`board-point ${selectedPoint === index ? 'selected' : ''} ${point.player === 0 ? 'red-point' : point.player === 1 ? 'white-point' : ''
                                }`}
                            onClick={() => handlePointClick(index)}
                        >
                            <div className="point-number">{index + 1}</div>
                            {point.count > 0 && (
                                <div className="pieces">
                                    {[...Array(Math.min(point.count, 5))].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`piece ${point.player === 0 ? 'red' : 'white'}`}
                                        >
                                            {point.count > 5 && i === 4 ? `+${point.count - 5}` : ''}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="game-controls">
                {dice[0] === 0 && isMyTurn && (
                    <Button variant="primary" onClick={rollDice}>
                        Roll Dice 🎲
                    </Button>
                )}
                {dice[0] !== 0 && isMyTurn && (
                    <Button variant="secondary" onClick={endTurn}>
                        End Turn
                    </Button>
                )}
            </div>

            <Modal
                isOpen={showResult}
                onClose={() => setShowResult(false)}
                title="Game Over"
            >
                <div className="result-modal">
                    <div className="result-icon">
                        {winner === myPlayerIndex ? '🏆' : '😢'}
                    </div>
                    <h2>{winner === myPlayerIndex ? 'You Win!' : 'You Lose!'}</h2>
                    <Button variant="primary" onClick={() => {
                        setShowResult(false);
                        handleReset();
                    }}>
                        Play Again
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

const getDieFace = (num) => {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[num - 1];
};

export default Backgammon;

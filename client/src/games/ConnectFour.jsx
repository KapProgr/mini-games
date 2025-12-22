import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './ConnectFour.css';

const ROWS = 6;
const COLS = 7;

const ConnectFour = ({ socket, roomId, user, players }) => {
    const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [winner, setWinner] = useState(null);
    const [winningCells, setWinningCells] = useState([]);
    const [showResult, setShowResult] = useState(false);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const myColor = myPlayerIndex === 0 ? 'red' : 'yellow';
    const isMyTurn = currentPlayer === myPlayerIndex;

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            setBoard(state.board);
            setCurrentPlayer(state.currentPlayer);
            setWinner(state.winner);
            setWinningCells(state.winningCells || []);
            if (state.winner) {
                setShowResult(true);
            }
        });

        socket.on('game-reset', () => {
            resetGame();
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket]);

    const checkWinner = (board) => {
        // Check horizontal
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS - 3; col++) {
                if (board[row][col] &&
                    board[row][col] === board[row][col + 1] &&
                    board[row][col] === board[row][col + 2] &&
                    board[row][col] === board[row][col + 3]) {
                    return {
                        winner: board[row][col],
                        cells: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]]
                    };
                }
            }
        }

        // Check vertical
        for (let row = 0; row < ROWS - 3; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col] &&
                    board[row][col] === board[row + 1][col] &&
                    board[row][col] === board[row + 2][col] &&
                    board[row][col] === board[row + 3][col]) {
                    return {
                        winner: board[row][col],
                        cells: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]]
                    };
                }
            }
        }

        // Check diagonal (down-right)
        for (let row = 0; row < ROWS - 3; row++) {
            for (let col = 0; col < COLS - 3; col++) {
                if (board[row][col] &&
                    board[row][col] === board[row + 1][col + 1] &&
                    board[row][col] === board[row + 2][col + 2] &&
                    board[row][col] === board[row + 3][col + 3]) {
                    return {
                        winner: board[row][col],
                        cells: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]]
                    };
                }
            }
        }

        // Check diagonal (down-left)
        for (let row = 0; row < ROWS - 3; row++) {
            for (let col = 3; col < COLS; col++) {
                if (board[row][col] &&
                    board[row][col] === board[row + 1][col - 1] &&
                    board[row][col] === board[row + 2][col - 2] &&
                    board[row][col] === board[row + 3][col - 3]) {
                    return {
                        winner: board[row][col],
                        cells: [[row, col], [row + 1, col - 1], [row + 2, col - 2], [row + 3, col - 3]]
                    };
                }
            }
        }

        // Check for draw
        const isFull = board.every(row => row.every(cell => cell !== null));
        if (isFull) {
            return { winner: 'draw', cells: [] };
        }

        return null;
    };

    const handleColumnClick = (col) => {
        if (!isMyTurn || winner) return;

        // Find the lowest empty row in this column
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) {
                row = r;
                break;
            }
        }

        if (row === -1) return; // Column is full

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = myColor;

        const result = checkWinner(newBoard);

        playSound('drop');

        if (result) {
            if (result.winner !== 'draw') {
                playSound('win');
            }

            socket.emit('game-move', {
                roomId,
                gameType: 'connectfour',
                board: newBoard,
                currentPlayer,
                winner: result.winner,
                winningCells: result.cells
            });
        } else {
            socket.emit('game-move', {
                roomId,
                gameType: 'connectfour',
                board: newBoard,
                currentPlayer: 1 - currentPlayer,
                winner: null,
                winningCells: []
            });
        }
    };

    const playSound = (type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'drop') {
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
            } else if (type === 'win') {
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (e) {
            // Ignore audio errors
        }
    };

    const resetGame = () => {
        setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
        setCurrentPlayer(0);
        setWinner(null);
        setWinningCells([]);
        setShowResult(false);
    };

    const handleReset = () => {
        if (socket) {
            socket.emit('game-reset', { roomId, gameType: 'connectfour' });
        }
    };

    const isWinningCell = (row, col) => {
        return winningCells.some(([r, c]) => r === row && c === col);
    };

    const getResultMessage = () => {
        if (winner === 'draw') return "It's a Draw!";
        if (winner === myColor) return '🎉 You Win!';
        return '😔 You Lose!';
    };

    return (
        <div className="connectfour-game">
            <div className="game-info">
                <h3>🔴 Connect Four</h3>
                <div className="players-info">
                    {players.map((player, index) => (
                        <div key={index} className={`player-indicator ${currentPlayer === index ? 'active' : ''}`}>
                            <div className={`player-disc ${index === 0 ? 'red' : 'yellow'}`}></div>
                            <span>{player.username}</span>
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

            <div className="connectfour-board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                className={`board-cell ${isMyTurn && !winner ? 'clickable' : ''}`}
                                onClick={() => handleColumnClick(colIndex)}
                            >
                                {cell && (
                                    <div className={`disc ${cell} ${isWinningCell(rowIndex, colIndex) ? 'winning' : ''}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {winner && (
                <Button variant="primary" onClick={handleReset}>
                    Play Again
                </Button>
            )}

            <Modal
                isOpen={showResult}
                onClose={() => setShowResult(false)}
                title="Game Over"
            >
                <div className="result-modal">
                    <div className="result-icon">
                        {winner === 'draw' ? '🤝' : winner === myColor ? '🏆' : '😢'}
                    </div>
                    <h2>{getResultMessage()}</h2>
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

export default ConnectFour;

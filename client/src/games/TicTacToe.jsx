import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './TicTacToe.css';

const TicTacToe = ({ socket, roomId, user, players }) => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [currentPlayer, setCurrentPlayer] = useState('X');
    const [winner, setWinner] = useState(null);
    const [isDraw, setIsDraw] = useState(false);
    const [mySymbol, setMySymbol] = useState(null);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        if (!socket) return;

        // Assign symbols based on join order
        const playerIndex = players.findIndex(p => p.username === user.username);
        setMySymbol(playerIndex === 0 ? 'X' : 'O');

        socket.on('game-state', ({ board: newBoard, currentPlayer: newCurrentPlayer, winner: gameWinner, isDraw: gameDraw }) => {
            setBoard(newBoard);
            setCurrentPlayer(newCurrentPlayer);
            setWinner(gameWinner);
            setIsDraw(gameDraw);
            if (gameWinner || gameDraw) {
                setShowResult(true);
            }
        });

        socket.on('game-reset', () => {
            setBoard(Array(9).fill(null));
            setCurrentPlayer('X');
            setWinner(null);
            setIsDraw(false);
            setShowResult(false);
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket, players, user.username]);

    const checkWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (let line of lines) {
            const [a, b, c] = line;
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const handleClick = (index) => {
        if (!socket || board[index] || winner || isDraw || currentPlayer !== mySymbol) {
            return;
        }

        const newBoard = [...board];
        newBoard[index] = currentPlayer;

        const gameWinner = checkWinner(newBoard);
        const gameDraw = !gameWinner && newBoard.every(cell => cell !== null);
        const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

        socket.emit('game-move', {
            roomId,
            gameType: 'tictactoe',
            board: newBoard,
            currentPlayer: nextPlayer,
            winner: gameWinner,
            isDraw: gameDraw
        });

        // Play sound
        playSound('move');
        if (gameWinner) playSound('win');
        if (gameDraw) playSound('draw');
    };

    const handleReset = () => {
        if (!socket) return;
        socket.emit('game-reset', { roomId, gameType: 'tictactoe' });
    };

    const playSound = (type) => {
        // Simple sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'move') {
            oscillator.frequency.value = 400;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'win') {
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.2;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } else if (type === 'draw') {
            oscillator.frequency.value = 300;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    };

    const getResultMessage = () => {
        if (winner === mySymbol) return '🎉 You Win!';
        if (winner) return '😔 You Lose!';
        if (isDraw) return '🤝 Draw!';
        return '';
    };

    return (
        <div className="tictactoe-game">
            <div className="game-info">
                <h3>Tic-Tac-Toe</h3>
                <div className="game-status">
                    {winner ? (
                        <span className="status-text">Winner: {winner}</span>
                    ) : isDraw ? (
                        <span className="status-text">Draw!</span>
                    ) : (
                        <>
                            <span className="status-text">
                                Current Turn: <strong>{currentPlayer}</strong>
                            </span>
                            {currentPlayer === mySymbol && (
                                <span className="badge badge-success">Your Turn</span>
                            )}
                        </>
                    )}
                </div>
                <div className="player-symbols">
                    <span className={mySymbol === 'X' ? 'active' : ''}>You: {mySymbol}</span>
                </div>
            </div>

            <div className="tictactoe-board">
                {board.map((cell, index) => (
                    <button
                        key={index}
                        className={`tictactoe-cell ${cell ? 'filled' : ''} ${currentPlayer === mySymbol && !cell && !winner && !isDraw ? 'clickable' : ''
                            }`}
                        onClick={() => handleClick(index)}
                        disabled={!!cell || !!winner || isDraw || currentPlayer !== mySymbol}
                    >
                        {cell && <span className={`symbol symbol-${cell}`}>{cell}</span>}
                    </button>
                ))}
            </div>

            {(winner || isDraw) && (
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
                        {winner === mySymbol ? '🏆' : winner ? '😢' : '🤝'}
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

export default TicTacToe;

import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import './Checkers.css';

const BOARD_SIZE = 8;

const Checkers = ({ socket, roomId, user, players }) => {
    const [board, setBoard] = useState([]);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [winner, setWinner] = useState(null);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const myColor = myPlayerIndex === 0 ? 'red' : 'black';
    const isMyTurn = currentPlayer === myPlayerIndex;

    // Auto-initialize when both players join
    useEffect(() => {
        if (players.length === 2 && board.length === 0) {
            initializeBoard();
        }
    }, [players.length]);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            if (state.board) setBoard(state.board);
            if (state.currentPlayer !== undefined) setCurrentPlayer(state.currentPlayer);
            if (state.winner) setWinner(state.winner);
            setSelectedPiece(null);
        });

        socket.on('game-reset', () => {
            initializeBoard();
            setWinner(null);
            setSelectedPiece(null);
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket]);

    const initializeBoard = () => {
        const newBoard = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            newBoard[row] = [];
            for (let col = 0; col < BOARD_SIZE; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 3) {
                        newBoard[row][col] = { color: 'black', isKing: false };
                    } else if (row > 4) {
                        newBoard[row][col] = { color: 'red', isKing: false };
                    } else {
                        newBoard[row][col] = null;
                    }
                } else {
                    newBoard[row][col] = null;
                }
            }
        }
        setBoard(newBoard);
        setCurrentPlayer(0);
        setWinner(null);

        // Only player 0 broadcasts
        if (socket && myPlayerIndex === 0) {
            socket.emit('game-move', {
                roomId,
                gameType: 'checkers',
                board: newBoard,
                currentPlayer: 0,
                winner: null
            });
        }
    };

    const isValidMove = (fromRow, fromCol, toRow, toCol, piece) => {
        if (!piece || toRow < 0 || toRow >= BOARD_SIZE || toCol < 0 || toCol >= BOARD_SIZE) {
            return false;
        }
        if (board[toRow][toCol] !== null) return false;

        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);

        // Normal move
        if (colDiff === 1 && Math.abs(rowDiff) === 1) {
            if (piece.isKing) return true;
            return piece.color === 'red' ? rowDiff === -1 : rowDiff === 1;
        }

        // Jump move
        if (colDiff === 2 && Math.abs(rowDiff) === 2) {
            const midRow = (fromRow + toRow) / 2;
            const midCol = (fromCol + toCol) / 2;
            const midPiece = board[midRow][midCol];

            if (midPiece && midPiece.color !== piece.color) {
                if (piece.isKing) return true;
                return piece.color === 'red' ? rowDiff === -2 : rowDiff === 2;
            }
        }

        return false;
    };

    const handleCellClick = (row, col) => {
        if (!isMyTurn || winner || !socket) return;

        const piece = board[row][col];

        if (selectedPiece) {
            const [fromRow, fromCol] = selectedPiece;
            const movingPiece = board[fromRow][fromCol];

            if (isValidMove(fromRow, fromCol, row, col, movingPiece)) {
                const newBoard = board.map(r => r.map(c => c ? { ...c } : null));

                newBoard[row][col] = { ...movingPiece };
                newBoard[fromRow][fromCol] = null;

                // King promotion
                if ((newBoard[row][col].color === 'red' && row === 0) ||
                    (newBoard[row][col].color === 'black' && row === BOARD_SIZE - 1)) {
                    newBoard[row][col].isKing = true;
                }

                // Handle jump
                const rowDiff = Math.abs(row - fromRow);
                if (rowDiff === 2) {
                    const midRow = (fromRow + row) / 2;
                    const midCol = (fromCol + col) / 2;
                    newBoard[midRow][midCol] = null;
                }

                // Check winner
                const redPieces = newBoard.flat().filter(p => p && p.color === 'red').length;
                const blackPieces = newBoard.flat().filter(p => p && p.color === 'black').length;

                let gameWinner = null;
                if (redPieces === 0) gameWinner = 'black';
                if (blackPieces === 0) gameWinner = 'red';

                socket.emit('game-move', {
                    roomId,
                    gameType: 'checkers',
                    board: newBoard,
                    currentPlayer: 1 - currentPlayer,
                    winner: gameWinner
                });

                setSelectedPiece(null);
            } else {
                if (piece && piece.color === myColor) {
                    setSelectedPiece([row, col]);
                } else {
                    setSelectedPiece(null);
                }
            }
        } else {
            if (piece && piece.color === myColor) {
                setSelectedPiece([row, col]);
            }
        }
    };

    const handleReset = () => {
        if (socket) {
            socket.emit('game-reset', { roomId, gameType: 'checkers' });
        }
    };

    if (board.length === 0) {
        return (
            <div className="checkers-game">
                <div className="game-info">
                    <h3>⚫ Checkers</h3>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkers-game">
            <div className="game-info">
                <h3>⚫ Checkers</h3>
                <div className="players-info">
                    {players.map((player, index) => (
                        <div key={index} className={`player-indicator ${currentPlayer === index ? 'active' : ''}`}>
                            <div className={`checker-piece ${index === 0 ? 'red' : 'black'}`}></div>
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

            <div className="checkers-board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((cell, colIndex) => {
                            const isLight = (rowIndex + colIndex) % 2 === 0;
                            const isSelected = selectedPiece && selectedPiece[0] === rowIndex && selectedPiece[1] === colIndex;

                            return (
                                <div
                                    key={colIndex}
                                    className={`board-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                >
                                    {cell && (
                                        <div className={`checker-piece ${cell.color} ${cell.isKing ? 'king' : ''}`}>
                                            {cell.isKing && '👑'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {winner && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <h2>{winner === myColor ? '🏆 You Win!' : '😔 You Lose!'}</h2>
                    <Button variant="primary" onClick={handleReset}>
                        Play Again
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Checkers;

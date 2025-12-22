import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card';
import Modal from '../components/Modal';
import './Lobby.css';

const GAMES = [
    {
        id: 'tictactoe',
        name: 'Tic-Tac-Toe',
        icon: '⭕',
        description: 'Classic 3x3 grid game',
        players: '2 players',
        difficulty: 'Easy'
    },
    {
        id: 'snake',
        name: 'Snake',
        icon: '🐍',
        description: 'Compete for the highest score',
        players: '1-2 players',
        difficulty: 'Medium'
    },
    {
        id: 'airhockey',
        name: 'Air Hockey',
        icon: '🏒',
        description: 'Fast-paced puck action',
        players: '2 players',
        difficulty: 'Medium'
    },
    {
        id: 'memory',
        name: 'Memory',
        icon: '🎴',
        description: 'Match the cards',
        players: '2 players',
        difficulty: 'Easy'
    },
    {
        id: 'backgammon',
        name: 'Backgammon',
        icon: '🎲',
        description: 'Traditional board game',
        players: '2 players',
        difficulty: 'Hard'
    },
    {
        id: 'connectfour',
        name: 'Connect Four',
        icon: '🔴',
        description: 'Connect 4 in a row',
        players: '2 players',
        difficulty: 'Medium'
    },
    {
        id: 'battleship',
        name: 'Battleship',
        icon: '🚢',
        description: 'Naval warfare strategy',
        players: '2 players',
        difficulty: 'Medium'
    },
    {
        id: 'checkers',
        name: 'Checkers',
        icon: '⚫',
        description: 'Classic board game',
        players: '2 players',
        difficulty: 'Medium'
    },
    {
        id: 'pictionary',
        name: 'Pictionary',
        icon: '🎨',
        description: 'Draw and guess words',
        players: '2+ players',
        difficulty: 'Easy'
    },
    {
        id: 'palermo',
        name: 'Palermo',
        icon: '🎭',
        description: 'Mafia-style social deduction',
        players: '4+ players',
        difficulty: 'Medium'
    }
];

const Lobby = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [roomId, setRoomId] = useState('');

    const handleCreateRoom = (game) => {
        setSelectedGame(game);
        setShowCreateRoom(true);
    };

    const handleConfirmCreate = () => {
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        navigate(`/game/${selectedGame.id}/${newRoomId}`);
    };

    const handleJoinRoom = () => {
        if (!roomId.trim()) return;

        // Navigate directly - the GameRoom component will handle if room doesn't exist
        // We'll default to tictactoe, but the actual game type will be set when joining
        navigate(`/game/tictactoe/${roomId.trim().toUpperCase()}`);
    };

    return (
        <div className="lobby-page">
            <div className="lobby-header">
                <div className="container">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1>🎮 Game Lobby</h1>
                            <p className="text-secondary">Welcome, <strong>{user.username}</strong>!</p>
                        </div>
                        <div className="flex gap-md">
                            <Button
                                variant="secondary"
                                onClick={() => setShowJoinRoom(true)}
                            >
                                Join Room
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={onLogout}
                            >
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container lobby-content">
                <div className="lobby-intro">
                    <h2>Choose Your Game</h2>
                    <p>Select a game below to create a room and invite friends!</p>
                </div>

                <div className="games-grid">
                    {GAMES.map((game) => (
                        <Card
                            key={game.id}
                            interactive
                            onClick={() => handleCreateRoom(game)}
                            className="game-card"
                        >
                            <div className="game-icon">{game.icon}</div>
                            <CardHeader>
                                <CardTitle>{game.name}</CardTitle>
                                <CardDescription>{game.description}</CardDescription>
                            </CardHeader>
                            <div className="game-meta">
                                <span className="badge badge-primary">{game.players}</span>
                                <span className={`badge ${game.difficulty === 'Easy' ? 'badge-success' :
                                    game.difficulty === 'Hard' ? 'badge-warning' :
                                        'badge-primary'
                                    }`}>
                                    {game.difficulty}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create Room Modal */}
            <Modal
                isOpen={showCreateRoom}
                onClose={() => setShowCreateRoom(false)}
                title="Create Game Room"
            >
                {selectedGame && (
                    <div className="modal-content">
                        <div className="selected-game-preview">
                            <div className="game-icon-large">{selectedGame.icon}</div>
                            <h3>{selectedGame.name}</h3>
                            <p>{selectedGame.description}</p>
                        </div>

                        <div className="modal-info">
                            <p>A unique room code will be generated. Share it with your friend to join!</p>
                        </div>

                        <div className="flex gap-md">
                            <Button
                                variant="secondary"
                                onClick={() => setShowCreateRoom(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmCreate}
                            >
                                Create Room
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Join Room Modal */}
            <Modal
                isOpen={showJoinRoom}
                onClose={() => {
                    setShowJoinRoom(false);
                    setRoomId('');
                }}
                title="Join Game Room"
            >
                <div className="modal-content">
                    <p className="text-secondary mb-lg">
                        Enter the room code shared by your friend
                    </p>

                    <input
                        type="text"
                        className="input mb-lg"
                        placeholder="Enter room code (e.g., ABC123)"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        maxLength={6}
                        autoFocus
                    />

                    <div className="flex gap-md">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowJoinRoom(false);
                                setRoomId('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleJoinRoom}
                            disabled={!roomId.trim()}
                        >
                            Join Room
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Lobby;

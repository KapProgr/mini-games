import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import Button from '../components/Button';
import Card from '../components/Card';
import './Home.css';

const Home = ({ onSetUser }) => {
    const { connected } = useSocket();
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }

        if (username.trim().length < 2) {
            setError('Username must be at least 2 characters');
            return;
        }

        if (username.trim().length > 20) {
            setError('Username must be less than 20 characters');
            return;
        }

        onSetUser({ username: username.trim() });
    };

    return (
        <div className="home-page">
            <div className="home-content">
                <div className="home-hero">
                    <h1 className="home-title">
                        🎮 Gaming Chat
                    </h1>
                    <p className="home-subtitle">
                        Play multiplayer games with friends in real-time
                    </p>
                </div>

                <Card className="home-card">
                    <form onSubmit={handleSubmit} className="home-form">
                        <h2>Join the Fun!</h2>
                        <p className="text-secondary mb-lg">
                            Enter your username to start playing
                        </p>

                        <div className="form-group">
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    setError('');
                                }}
                                maxLength={20}
                                autoFocus
                            />
                            {error && <p className="error-message">{error}</p>}
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={!connected}
                        >
                            {connected ? 'Start Playing' : 'Connecting...'}
                        </Button>

                        {!connected && (
                            <p className="connection-status">
                                <span className="animate-pulse">⚠️</span> Connecting to server...
                            </p>
                        )}
                    </form>
                </Card>

                <div className="home-features">
                    <div className="feature">
                        <div className="feature-icon">🎯</div>
                        <h3>8 Games</h3>
                        <p>Tic-Tac-Toe, Snake, Air Hockey, Memory, and more!</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">💬</div>
                        <h3>Real-time Chat</h3>
                        <p>Chat with your opponents while playing</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">📱</div>
                        <h3>Mobile Friendly</h3>
                        <p>Play on any device, anywhere</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;

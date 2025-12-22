import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Load user from localStorage
        const savedUser = localStorage.getItem('gamingChatUser');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const handleSetUser = (userData) => {
        setUser(userData);
        localStorage.setItem('gamingChatUser', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('gamingChatUser');
    };

    return (
        <Routes>
            <Route
                path="/"
                element={
                    user ? <Navigate to="/lobby" /> : <Home onSetUser={handleSetUser} />
                }
            />
            <Route
                path="/lobby"
                element={
                    user ? <Lobby user={user} onLogout={handleLogout} /> : <Navigate to="/" />
                }
            />
            <Route
                path="/game/:gameType/:roomId"
                element={
                    user ? <GameRoom user={user} onLogout={handleLogout} /> : <Navigate to="/" />
                }
            />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;

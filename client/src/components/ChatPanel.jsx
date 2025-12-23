import React, { useState, useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import soundManager from '../utils/soundManager';
import './ChatPanel.css';

const ChatPanel = ({ socket, roomId = null, username, isGlobal = false, onClose }) => {
    const { globalMessages, getRoomMessages } = useChatContext();
    const [inputMessage, setInputMessage] = useState('');
    const [activeTab, setActiveTab] = useState(isGlobal ? 'global' : 'room');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [globalMessages, roomId]);

    useEffect(() => {
        if (!socket) return;

        // Play notification sound for new messages
        const handleGlobalMessage = ({ username: sender }) => {
            if (sender !== username) {
                soundManager.playNotification();
            }
        };

        const handleRoomMessage = ({ username: sender }) => {
            if (sender !== username) {
                soundManager.playNotification();
            }
        };

        socket.on('global-message', handleGlobalMessage);
        if (roomId) {
            socket.on('room-message', handleRoomMessage);
        }

        return () => {
            socket.off('global-message', handleGlobalMessage);
            socket.off('room-message', handleRoomMessage);
        };
    }, [socket, roomId, username]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !socket) return;

        const messageData = {
            message: inputMessage.trim(),
            timestamp: new Date().toISOString(),
            username: username // Include username
        };

        if (activeTab === 'global') {
            socket.emit('global-message', messageData);
        } else if (roomId) {
            socket.emit('room-message', { ...messageData, roomId });
        }

        soundManager.playClick();
        setInputMessage('');
    };

    const currentMessages = activeTab === 'global' ? globalMessages : (roomId ? getRoomMessages(roomId) : []);

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-tabs">
                    {roomId && (
                        <button
                            className={`chat-tab ${activeTab === 'room' ? 'active' : ''}`}
                            onClick={() => setActiveTab('room')}
                        >
                            💬 Room
                        </button>
                    )}
                    <button
                        className={`chat-tab ${activeTab === 'global' ? 'active' : ''}`}
                        onClick={() => setActiveTab('global')}
                    >
                        🌍 Global
                    </button>
                </div>
                {onClose && (
                    <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
                        ✕
                    </button>
                )}
            </div>

            <div className="chat-messages">
                {currentMessages.length === 0 ? (
                    <div className="chat-empty">
                        <p>No messages yet. Start the conversation! 💬</p>
                    </div>
                ) : (
                    currentMessages.map((msg, index) => (
                        <div
                            key={index}
                            className={`chat-message ${msg.sender === username ? 'own-message' : ''}`}
                        >
                            <div className="message-header">
                                <span className="message-sender">{msg.sender}</span>
                                <span className="message-time">
                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="message-content">{msg.message}</div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder={`Message ${activeTab === 'global' ? 'everyone' : 'room'}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    maxLength={200}
                />
                <button type="submit" className="chat-send-btn" disabled={!inputMessage.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatPanel;

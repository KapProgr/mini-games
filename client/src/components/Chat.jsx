import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import Button from './Button';
import './Chat.css';

const Chat = ({ roomId, user }) => {
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat-message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socket.on('user-typing', ({ username }) => {
            setTypingUsers((prev) => {
                if (!prev.includes(username)) {
                    return [...prev, username];
                }
                return prev;
            });

            setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u !== username));
            }, 3000);
        });

        return () => {
            socket.off('chat-message');
            socket.off('user-typing');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || !socket) return;

        const message = {
            roomId,
            username: user.username,
            text: inputMessage.trim(),
            timestamp: new Date().toISOString()
        };

        socket.emit('chat-message', message);
        setInputMessage('');
        setIsTyping(false);
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);

        if (!socket) return;

        if (!isTyping) {
            setIsTyping(true);
            socket.emit('user-typing', { roomId, username: user.username });
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3>💬 Chat</h3>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`chat-message ${msg.username === user.username ? 'own-message' : ''}`}
                        >
                            <div className="message-header">
                                <span className="message-username">{msg.username}</span>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div className="message-text">{msg.text}</div>
                        </div>
                    ))
                )}
                {typingUsers.length > 0 && (
                    <div className="typing-indicator">
                        <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
                        <span className="typing-dots">
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    className="input chat-input"
                    placeholder="Type a message..."
                    value={inputMessage}
                    onChange={handleInputChange}
                    maxLength={500}
                />
                <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputMessage.trim()}
                >
                    Send
                </Button>
            </form>
        </div>
    );
};

export default Chat;

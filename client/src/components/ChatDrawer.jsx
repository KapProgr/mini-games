import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import './ChatDrawer.css';

const ChatDrawer = ({ socket, roomId, username }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Chat Button */}
            <button
                className={`chat-fab ${isOpen ? 'chat-fab-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle chat"
            >
                💬
                <span className="chat-fab-badge">3</span>
            </button>

            {/* Chat Drawer */}
            <div className={`chat-drawer ${isOpen ? 'chat-drawer-open' : ''}`}>
                <div className="chat-drawer-overlay" onClick={() => setIsOpen(false)} />
                <div className="chat-drawer-content">
                    <ChatPanel
                        socket={socket}
                        roomId={roomId}
                        username={username}
                        isGlobal={!roomId}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            </div>
        </>
    );
};

export default ChatDrawer;

import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatContext = createContext(null);

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children, socket }) => {
    const [globalMessages, setGlobalMessages] = useState([]);
    const [roomMessages, setRoomMessages] = useState({});

    useEffect(() => {
        if (!socket) return;

        // Listen for global messages
        socket.on('global-message', ({ username, message, timestamp }) => {
            setGlobalMessages(prev => [...prev, { sender: username, message, timestamp, type: 'global' }]);
        });

        // Listen for room messages
        socket.on('room-message', ({ username, message, timestamp }) => {
            const roomId = socket.currentRoom; // We'll set this when joining
            if (roomId) {
                setRoomMessages(prev => ({
                    ...prev,
                    [roomId]: [...(prev[roomId] || []), { sender: username, message, timestamp, type: 'room' }]
                }));
            }
        });

        return () => {
            socket.off('global-message');
            socket.off('room-message');
        };
    }, [socket]);

    const getRoomMessages = (roomId) => {
        return roomMessages[roomId] || [];
    };

    const clearRoomMessages = (roomId) => {
        setRoomMessages(prev => {
            const newMessages = { ...prev };
            delete newMessages[roomId];
            return newMessages;
        });
    };

    return (
        <ChatContext.Provider value={{
            globalMessages,
            getRoomMessages,
            clearRoomMessages,
            setGlobalMessages,
            setRoomMessages
        }}>
            {children}
        </ChatContext.Provider>
    );
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SocketProvider } from './context/SocketContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <SocketProvider>
            <App />
        </SocketProvider>
    </BrowserRouter>
);

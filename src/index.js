import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LobbyGame from './LobbyGame'; // ✅ make sure this matches filename

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LobbyGame />
  </React.StrictMode>
);

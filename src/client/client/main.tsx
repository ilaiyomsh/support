import React from 'react';
import ReactDOM from 'react-dom/client';
import ClientPanel from './components/ClientPanel';
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClientPanel />
  </React.StrictMode>
);


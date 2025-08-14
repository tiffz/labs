import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/corp.css';
import CorpApp from './App';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<CorpApp />);
}


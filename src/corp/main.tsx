import React from 'react';
import { createRoot } from 'react-dom/client';
// Initialize server logger BEFORE any app modules so import-time errors are captured
import { installServerLogger } from '../shared/utils/serverLogger';
import './styles/corp.css';
import CorpApp from './App';

// Install server logging for this app
installServerLogger('CORP');

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<CorpApp />);
}


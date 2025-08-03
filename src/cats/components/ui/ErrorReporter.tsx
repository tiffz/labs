import React, { useState, useEffect } from 'react';

// Type declaration for development error logging functions
declare global {
  interface Window {
    downloadErrorLog?: () => void;
    clearErrorLog?: () => void;
    getErrorLog?: () => unknown[];
  }
}

interface ErrorReporterProps {
  isVisible?: boolean;
}

/**
 * Development-only component that shows captured errors and provides easy sharing
 */
export const ErrorReporter: React.FC<ErrorReporterProps> = ({ isVisible = true }) => {
  const [errorCount, setErrorCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [latestError, setLatestError] = useState<string>('');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !isVisible) return;

    const checkErrors = () => {
      const errorLog = localStorage.getItem('errorLog');
      if (errorLog) {
        const lines = errorLog.split('\n').filter(line => line.includes('--- Error'));
        const newErrorCount = lines.length;
        
        // Only update state if the count actually changed to prevent unnecessary re-renders
        setErrorCount(prevCount => prevCount !== newErrorCount ? newErrorCount : prevCount);
        
        // Get latest error message
        const errorLines = errorLog.split('\n');
        const lastErrorIndex = errorLines.findLastIndex(line => line.startsWith('Message:'));
        if (lastErrorIndex >= 0) {
          const newLatestError = errorLines[lastErrorIndex].replace('Message: ', '');
          setLatestError(prevError => prevError !== newLatestError ? newLatestError : prevError);
        }
      }
    };

    // Check every 5 seconds instead of every second to reduce update frequency during render loops
    const interval = setInterval(checkErrors, 5000);
    checkErrors(); // Initial check

    return () => clearInterval(interval);
  }, [isVisible]);

  if (process.env.NODE_ENV !== 'development' || !isVisible || errorCount === 0) {
    return null;
  }

  const copyToClipboard = () => {
    const errorLog = localStorage.getItem('errorLog');
    if (errorLog) {
      navigator.clipboard.writeText(errorLog).then(() => {
        alert('Error log copied to clipboard! You can now paste it for Claude.');
      });
    }
  };

  const downloadLog = () => {
    window.downloadErrorLog?.();
  };

  const clearLog = () => {
    window.clearErrorLog?.();
    setErrorCount(0);
    setLatestError('');
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      backgroundColor: '#ff4444',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      maxWidth: '300px'
    }}>
      <div 
        style={{ cursor: 'pointer', fontWeight: 'bold' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        🚨 {errorCount} Error{errorCount !== 1 ? 's' : ''} Detected {isExpanded ? '▼' : '▶'}
      </div>
      
      {isExpanded && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ 
            fontSize: '11px', 
            marginBottom: '8px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '4px',
            borderRadius: '3px',
            wordBreak: 'break-word'
          }}>
            Latest: {latestError.substring(0, 100)}{latestError.length > 100 ? '...' : ''}
          </div>
          
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button 
              onClick={copyToClipboard}
              style={{
                fontSize: '10px',
                padding: '4px 6px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              📋 Copy
            </button>
            
            <button 
              onClick={downloadLog}
              style={{
                fontSize: '10px',
                padding: '4px 6px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              💾 Download
            </button>
            
            <button 
              onClick={clearLog}
              style={{
                fontSize: '10px',
                padding: '4px 6px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
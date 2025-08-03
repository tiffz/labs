/**
 * Development-only error logger that captures console errors and writes them to a file
 * that can be easily shared for debugging
 */

interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warn' | 'log';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';
  
  constructor() {
    if (!this.isEnabled) return;
    
    this.setupConsoleInterception();
    this.setupWindowErrorHandler();
    this.setupUnhandledRejectionHandler();
    
    // Auto-export errors every 10 seconds
    setInterval(() => this.exportToFile(), 10000);
  }
  
  private setupConsoleInterception() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    console.error = (...args) => {
      this.logError('error', args);
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      this.logError('warn', args);
      originalWarn.apply(console, args);
    };
    
    // Optionally capture console.log too
    console.log = (...args) => {
      // Only log if it looks like an error (but ignore debug callback logs)
      if (args.some(arg => String(arg).toLowerCase().includes('error')) && 
          !args.some(arg => String(arg).includes('🎯 [CALLBACK]'))) {
        this.logError('log', args);
      }
      originalLog.apply(console, args);
    };
  }
  
  private setupWindowErrorHandler() {
    window.addEventListener('error', (event) => {
      this.errors.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
  }
  
  private setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack
      });
    });
  }
  
  private logError(type: 'error' | 'warn' | 'log', args: unknown[]) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
      return JSON.stringify(arg);
    }).join(' ');
    
    this.errors.push({
      timestamp: new Date().toISOString(),
      type,
      message
    });
  }
  
  private exportToFile() {
    if (this.errors.length === 0) return;
    
    const errorReport = this.generateReport();
    
    // Create downloadable file
    const blob = new Blob([errorReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Store in localStorage so user can access it
    localStorage.setItem('errorLog', errorReport);
    localStorage.setItem('errorLogUrl', url);
    
    console.log('📝 Error log updated. Run `window.downloadErrorLog()` to download, or check localStorage.errorLog');
  }
  
  private generateReport(): string {
    const header = `
=== CAT CLICKER ERROR LOG ===
Generated: ${new Date().toISOString()}
Total Errors: ${this.errors.length}
==================================

`;
    
    const errorSections = this.errors.map((error, index) => {
      return `
--- Error ${index + 1} ---
Time: ${error.timestamp}
Type: ${error.type.toUpperCase()}
Message: ${error.message}
${error.stack ? `Stack:\n${error.stack}` : ''}
${error.url ? `File: ${error.url}:${error.line}:${error.column}` : ''}
`;
    }).join('\n');
    
    return header + errorSections;
  }
  
  // Public methods for manual access
  public getErrors() {
    return [...this.errors];
  }
  
  public clearErrors() {
    this.errors = [];
    localStorage.removeItem('errorLog');
  }
  
  public downloadReport() {
    const report = this.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cat-clicker-errors-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Initialize in development
const errorLogger = new ErrorLogger();

// Type declaration for global error logging functions
declare global {
  interface Window {
    downloadErrorLog?: () => void;
    clearErrorLog?: () => void;
    getErrorLog?: () => unknown[];
  }
}

// Expose global methods for easy access
if (process.env.NODE_ENV === 'development') {
  window.downloadErrorLog = () => errorLogger.downloadReport();
  window.clearErrorLog = () => errorLogger.clearErrors();
  window.getErrorLog = () => errorLogger.getErrors();
}

export default errorLogger;
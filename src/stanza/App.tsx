import SkipToMain from '../shared/components/SkipToMain';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import StanzaErrorBoundary from './components/StanzaErrorBoundary';
import StanzaWorkspace from './components/StanzaWorkspace';

export default function App() {
  return (
    <div className="stanza-app">
      <LabsUndoProvider>
        <SkipToMain />
        <main id="main" className="stanza-main">
          <StanzaErrorBoundary>
            <StanzaWorkspace />
          </StanzaErrorBoundary>
        </main>
      </LabsUndoProvider>
    </div>
  );
}

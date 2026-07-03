import SkipToMain from '../shared/components/SkipToMain';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import StanzaWorkspace from './components/StanzaWorkspace';

export default function App() {
  return (
    <div className="stanza-app">
      <LabsBlockingJobProvider unloadCaption="Keep this tab open. Closing it or leaving Stanza can cancel in-progress backup work.">
        <LabsUndoProvider>
          <SkipToMain />
          <main id="main" className="stanza-main">
            <StanzaWorkspace />
          </main>
        </LabsUndoProvider>
      </LabsBlockingJobProvider>
    </div>
  );
}

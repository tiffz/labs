import SkipToMain from '../shared/components/SkipToMain';
import { LabsKeyboardShortcutsHost, stanzaKeyboardShortcutSections } from '../shared/keyboardShortcuts';
import { LabsBlockingJobProvider } from '../shared/jobs/LabsBlockingJobContext';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import StanzaWorkspace from './components/StanzaWorkspace';

export default function App() {
  return (
    <div className="stanza-app">
      <LabsBlockingJobProvider unloadCaption="Keep this tab open. Closing it or leaving Stanza can cancel in-progress backup work.">
        <LabsUndoProvider>
          <LabsKeyboardShortcutsHost sections={stanzaKeyboardShortcutSections} theme="stanza">
            <SkipToMain />
            <main id="main" className="stanza-main">
              <StanzaWorkspace />
            </main>
          </LabsKeyboardShortcutsHost>
        </LabsUndoProvider>
      </LabsBlockingJobProvider>
    </div>
  );
}

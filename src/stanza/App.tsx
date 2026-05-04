import SkipToMain from '../shared/components/SkipToMain';
import StanzaWorkspace from './components/StanzaWorkspace';

export default function App() {
  return (
    <div className="stanza-app">
      <SkipToMain />
      <main id="main" className="stanza-main">
        <StanzaWorkspace />
      </main>
    </div>
  );
}

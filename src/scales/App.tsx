import { ScalesProvider, useScales } from './store';
import HomeScreen from './components/HomeScreen';
import SessionScreen from './components/SessionScreen';
import ResultScreen from './components/ResultScreen';
import ProgressScreen from './components/ProgressScreen';

function ScreenRouter() {
  const { state } = useScales();

  switch (state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'session':
      return <SessionScreen />;
    case 'result':
      return <ResultScreen />;
    case 'progress':
      return <ProgressScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <ScalesProvider>
      <div className="scales-app">
        <ScreenRouter />
      </div>
    </ScalesProvider>
  );
}

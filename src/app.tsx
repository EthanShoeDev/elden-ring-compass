import { AppBar } from './components/app-bar';
import { MainContent } from './components/main-content';

function App() {
  return (
    <div className="flex h-screen flex-col">
      <AppBar />
      <MainContent />
    </div>
  );
}

export default App;

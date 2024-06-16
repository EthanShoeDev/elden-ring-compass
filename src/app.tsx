import { AppBar } from './components/app-bar';
import { Footer } from './components/footer';
import { MainContent } from './components/main-content';

function App() {
  return (
    <div className="flex h-screen flex-col">
      <AppBar />
      <MainContent />
      <Footer />
    </div>
  );
}

export default App;

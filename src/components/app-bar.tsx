import { SwordIcon } from 'lucide-react';
import { SaveFileSourceSelector } from './save-file-source-selector';

export function AppBar() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <a href="#">
          <SwordIcon className="size-8" />
        </a>
        <h1 className="text-2xl font-bold">Elden Ring Save Parser</h1>
      </div>
      <div className="flex items-center gap-4">
        <SaveFileSourceSelector />
      </div>
    </header>
  );
}

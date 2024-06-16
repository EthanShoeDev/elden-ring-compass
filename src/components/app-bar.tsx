import { SwordIcon } from 'lucide-react';
import { SaveFileSourceSelector } from './save-file-source-selector';
import { DarkModeToggle } from './dark-mode-toggle';
import { ELDEN_RING_OBJECTIVES } from '@/lib/er-objectives';
import { Combobox } from './ui/combobox';

export function AppBar() {
  return (
    <header className="flex w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-accent px-3 py-2 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center gap-4">
          <a href="#">
            <SwordIcon className="size-8" />
          </a>
          <h1 className="text-2xl font-bold">Elden Ring Save Parser</h1>
          <Combobox
            emptyLabel="No region selected"
            placeholder="Select a region"
            items={ELDEN_RING_OBJECTIVES.map((r) => ({
              label: r.name,
              value: r.name,
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <SaveFileSourceSelector />
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}

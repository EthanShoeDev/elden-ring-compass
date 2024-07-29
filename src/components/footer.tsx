import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Button } from './ui/button';
import { inventoryDbView } from '@/lib/vm/inventory';
import { eventsDbView } from '@/lib/vm/events';
import { regionsDbView } from '@/lib/vm/regions';
import { statsDbView } from '@/lib/vm/stats';
import { equipmentDbView } from '@/lib/vm/equipement';
import { useMutation } from '@tanstack/react-query';
import Spinner from './ui/spinner';
import { useState } from 'react';

export function Footer() {
  return (
    <footer className="flex flex-col items-center py-10">
      <h3 className="mb-2 text-lg font-bold">Huge thanks to these projects:</h3>
      <ul className="prose list-inside list-disc dark:prose-invert">
        <li>
          <a
            href="https://github.com/elden-ring-progression-tracker/elden-ring-progression-tracker.github.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Elden Ring Progression Tracker
          </a>
        </li>
        <li>
          <a
            href="https://github.com/ClayAmore/ER-Save-Editor"
            target="_blank"
            rel="noopener noreferrer"
          >
            ER Save Editor
          </a>
        </li>
        <li>
          <a
            href="https://github.com/EldenRingDatabase/erdb"
            target="_blank"
            rel="noopener noreferrer"
          >
            ERDB
          </a>
        </li>
      </ul>
      <div className="flex w-full flex-wrap justify-center gap-2 py-8 text-2xl">
        <a
          className="hover:underline"
          href="https://github.com/EthanShoeDev/elden-ring-compass"
        >
          Github
        </a>{' '}
        -
        <a className="hover:underline" href="https://www.eldenringcompass.com">
          Website
        </a>
      </div>
      <CopySaveAsJsonButton />
    </footer>
  );
}

function CopySaveAsJsonButton() {
  const slot = useSelectedSlot();
  const [recentSuccess, setRecentSuccess] = useState(false);

  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!slot) return;

      const equipmentVm = equipmentDbView(slot);
      const eventsVm = eventsDbView(slot);
      const inventoryVm = inventoryDbView(slot);
      const regionsVm = regionsDbView(slot);
      const statsVm = statsDbView(slot);

      function uint8ArrayToBase64(uint8Array: Uint8Array) {
        let binary = '';
        const len = uint8Array.length;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
      }

      function trimTrailingZeros(uint8Array: Readonly<Uint8Array>) {
        let endIndex = uint8Array.length - 1;
        while (endIndex >= 0 && uint8Array[endIndex] === 0) {
          endIndex--;
        }
        return uint8Array.slice(0, endIndex + 1);
      }

      const result = {
        stats: statsVm,
        regions: regionsVm[0],
        events: {
          known_events: eventsVm,
          event_buffer: uint8ArrayToBase64(
            trimTrailingZeros(slot.event_flags.flags)
          ),
        },
        inventory: inventoryVm.items,
        equipment: equipmentVm,
      };

      await navigator.clipboard.writeText(
        JSON.stringify(
          result,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        )
      );
    },
    onSuccess: () => {
      setRecentSuccess(true);
      setTimeout(() => {
        setRecentSuccess(false);
      }, 2000);
    },
  });

  return (
    <Button
      disabled={!slot || copyMutation.isPending}
      onClick={() => {
        copyMutation.mutate();
      }}
      className="flex gap-4"
    >
      {copyMutation.isPending && <Spinner />}
      {recentSuccess && <span className="text-green-500">✔</span>}
      {copyMutation.error ? copyMutation.error.message : 'Copy Save as JSON'}
    </Button>
  );
}

import { Label } from '@/components/ui/label';
import { useEldenRingSave } from '@/lib/atoms/save';
import { fileToArrBuffer } from '@/lib/er-save-parser';
import { saveFileSourceAtom } from '@/stores/save-file-source-store';
import { useSlotNameSelection } from '@/stores/slot-selection-store';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import { ClientOnly } from '@tanstack/react-router';
import { formatDistance } from 'date-fns';
import {
  EditIcon,
  FileCheckIcon,
  Link2OffIcon,
  LinkIcon,
  RefreshCcwIcon,
  UnplugIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CodeSnippet } from './code-snippet';
import { CopyCodeSnippet } from './copy-button';
import { Button } from '../ui/button';
import { ComboboxSelect } from '../ui/combobox-select';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Spinner } from '../ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

export function SaveFileSourceSelector() {
  const saveFileSource = useAtomValue(saveFileSourceAtom);
  const setSaveFileSource = useAtomSet(saveFileSourceAtom);
  const save = useEldenRingSave();

  const [type, setType] = useState<'file' | 'url'>(
    saveFileSource && 'url' in saveFileSource ? 'url' : 'file',
  );

  // The save source is restored from localStorage, which is empty during SSR.
  // Source-dependent UI is therefore client-only (<ClientOnly>) so the server
  // and first client render agree — both show the "connect" state — avoiding a
  // hydration mismatch.
  const connectLabel = (
    <>
      <UnplugIcon />
      Connect your save file
    </>
  );

  return (
    <>
      <SteamIdLabel />
      <SlotSelector />
      <ClientOnly>{saveFileSource && <RefreshButton />}</ClientOnly>
      <Popover>
        <PopoverTrigger render={<Button className='flex gap-2' />}>
          <ClientOnly fallback={connectLabel}>
            {!saveFileSource && connectLabel}
            {saveFileSource && 'file' in saveFileSource && (
              <>
                <FileCheckIcon />
                File Uploaded
              </>
            )}
            {saveFileSource &&
              'url' in saveFileSource &&
              (save.isError ? (
                <>
                  <Link2OffIcon />
                  Url Error
                </>
              ) : (
                <>
                  <LinkIcon />
                  Url Connected
                </>
              ))}
          </ClientOnly>
        </PopoverTrigger>
        <PopoverContent className='w-[600px] max-w-full'>
          <div className='flex flex-col items-start gap-4'>
            <Label>Select source</Label>
            <ToggleGroup
              className='rounded-md border'
              value={[type]}
              onValueChange={(v) => {
                const next = v[v.length - 1];
                if (next) setType(next as 'file' | 'url');
              }}
            >
              <ToggleGroupItem
                className='w-20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
                value='file'
              >
                File
              </ToggleGroupItem>
              <ToggleGroupItem
                className='w-20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
                value='url'
              >
                Url
              </ToggleGroupItem>
            </ToggleGroup>
            {type === 'file' ? (
              <>
                <div className='w-full'>
                  <a
                    className='hover:underline'
                    target='_blank'
                    rel='noreferrer'
                    href='https://store.steampowered.com/account/remotestorageapp/?appid=1245620'
                  >
                    Download save from Steam Cloud
                  </a>
                  <p>or upload the file located at:</p>
                  <CopyCodeSnippet
                    snippet={String.raw`%AppData%\EldenRing\YOUR_STEAM_ID\ER0000.sl2`}
                  />
                </div>

                {saveFileSource && 'file' in saveFileSource ? (
                  <div className='flex items-center gap-2'>
                    File: {saveFileSource.file.name}
                    <Button
                      variant='secondary'
                      onClick={() => {
                        setSaveFileSource(undefined);
                      }}
                    >
                      <EditIcon />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type='file'
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSaveFileSource({
                          file: {
                            buffer: await fileToArrBuffer(file),
                            name: file.name,
                          },
                        });
                      }
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <p>Run in powershell to host the save file on a local server:</p>

                <CodeSnippet>
                  {`
cd (Join-Path "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" (Get-ChildItem "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" -Directory | Select-Object -First 1).Name) ; npx http-server -p 8080 --cors -c-1
`}
                </CodeSnippet>
                <p>Then paste the url below: </p>

                <CopyCodeSnippet snippet='http://localhost:8080/ER0000.sl2' />

                <p>Test save: </p>
                <CopyCodeSnippet snippet='/ER0000.sl2' />
                <Input
                  type='url'
                  placeholder='http://localhost:8080/ER0000.sl2'
                  value={saveFileSource && 'url' in saveFileSource ? saveFileSource.url : ''}
                  onChange={(e) => {
                    setSaveFileSource({ url: e.target.value });
                  }}
                />
              </>
            )}
            {save.isLoading ? (
              <div>Loading...</div>
            ) : save.isError ? (
              <div>Error: {save.error?.message}</div>
            ) : save.isSuccess ? (
              <div>Success!</div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function SlotSelector() {
  const { data } = useEldenRingSave();
  const slotState = useSlotNameSelection();
  if (!data) return <></>;
  return (
    <ComboboxSelect
      valueState={slotState}
      emptyLabel='No slot selected'
      placeholder='Select slot from save file'
      triggerButtonClassName='w-[200px]'
      popoverContentClassName='w-[200px]'
      items={data.slots
        .map((slot) => slot.player_game_data.character_name)
        .map((s) => ({
          label: s,
          value: s,
        }))}
    />
  );
}

function SteamIdLabel() {
  const { data } = useEldenRingSave();
  if (!data) return <></>;
  return <Label>Steam ID: {data.global_steam_id}</Label>;
}

function RefreshButton() {
  const saveFileSource = useAtomValue(saveFileSourceAtom);
  const save = useEldenRingSave();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [setNow]);

  return (
    <Button
      variant='ghost'
      disabled={save.isFetching || (!!saveFileSource && 'file' in saveFileSource)}
      className='flex gap-2'
      onClick={() => {
        save.refresh();
      }}
    >
      {save.isFetching ? (
        <>
          <Spinner />
          Loading...
        </>
      ) : (
        <>
          <RefreshCcwIcon />
          Updated{' '}
          {save.data && save.dataUpdatedAt
            ? formatDistance(save.dataUpdatedAt, now, {
                addSuffix: true,
                includeSeconds: true,
              })
            : 'never'}
        </>
      )}
    </Button>
  );
}

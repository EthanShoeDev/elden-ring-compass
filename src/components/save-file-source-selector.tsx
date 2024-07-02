import { Label } from '@/components/ui/label';
import { playerNameBytesToString } from '@/lib/elden-ring-raw-db/er-raw-db';
import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
import { fileToArrBuffer } from '@/lib/er-save-parser';
import { useSaveFileSourceStore } from '@/stores/save-file-source-store';
import { useSlotNameSelection } from '@/stores/slot-selection-store';
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
import { CodeSnippet } from './misc/code-snippet';
import { CopyCodeSnippet } from './misc/copy-button';
import { Button } from './ui/button';
import { Combobox } from './ui/combobox';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Spinner from './ui/spinner';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export function SaveFileSourceSelector() {
  const { saveFileSource, setSaveFileSource } = useSaveFileSourceStore();
  const { query, isParsing } = useEldenRingSaveQuery();

  const [type, setType] = useState<'file' | 'url'>(
    saveFileSource && 'url' in saveFileSource ? 'url' : 'file'
  );
  return (
    <>
      <SteamIdLabel />
      <SlotSelector />
      {saveFileSource && <RefreshButton />}
      <Popover>
        <PopoverTrigger asChild>
          <Button className="flex gap-2">
            {!saveFileSource && (
              <>
                <UnplugIcon />
                Connect your save file
              </>
            )}
            {saveFileSource && 'file' in saveFileSource && (
              <>
                <FileCheckIcon />
                File Uploaded
              </>
            )}
            {saveFileSource &&
              'url' in saveFileSource &&
              (query.error ? (
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
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] max-w-full">
          <div className="flex flex-col items-start gap-4">
            <Label>Select source</Label>
            <ToggleGroup
              className="rounded-md border"
              type="single"
              value={type}
              onValueChange={(v) => {
                setType(v as 'file' | 'url');
              }}
            >
              <ToggleGroupItem
                className="w-20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                value="file"
              >
                File
              </ToggleGroupItem>
              <ToggleGroupItem
                className="w-20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                value="url"
              >
                Url
              </ToggleGroupItem>
            </ToggleGroup>
            {type === 'file' ? (
              <>
                <div className="w-full">
                  <a
                    className="hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href="https://store.steampowered.com/account/remotestorageapp/?appid=1245620"
                  >
                    Download save from Steam Cloud
                  </a>
                  <p>or upload the file located at:</p>
                  <CopyCodeSnippet
                    snippet={String.raw`%AppData%\EldenRing\YOUR_STEAM_ID\ER0000.sl2`}
                  />
                </div>

                {saveFileSource && 'file' in saveFileSource ? (
                  <div className="flex items-center gap-2">
                    File: {saveFileSource.file.name}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSaveFileSource(undefined);
                      }}
                    >
                      <EditIcon />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    onChange={async (e) => {
                      if (e.target.files) {
                        setSaveFileSource({
                          file: {
                            buffer: await fileToArrBuffer(e.target.files[0]),
                            name: e.target.files[0].name,
                          },
                        });
                      }
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <p>
                  Run in powershell to host the save file on a local server:
                </p>

                <CodeSnippet>
                  {`
cd (Join-Path "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" (Get-ChildItem "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" -Directory | Select-Object -First 1).Name) ; npx http-server -p 8080 --cors -c-1
`}
                </CodeSnippet>
                <p>Then paste the url below: </p>

                <CopyCodeSnippet snippet="http://localhost:8080/ER0000.sl2" />

                <p>Test save: </p>
                <CopyCodeSnippet snippet="/ER0000.sl2" />
                <Input
                  type="url"
                  placeholder="http://localhost:8080/ER0000.sl2"
                  value={
                    saveFileSource && 'url' in saveFileSource
                      ? saveFileSource.url
                      : ''
                  }
                  onChange={(e) => {
                    setSaveFileSource({ url: e.target.value });
                  }}
                />
              </>
            )}
            {query.isLoading ? (
              <div>{isParsing ? 'Parsing' : 'Loading'}...</div>
            ) : query.isError ? (
              <div>Error: {query.error.message}</div>
            ) : query.isSuccess ? (
              <div>Success!</div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function SlotSelector() {
  const { query } = useEldenRingSaveQuery();
  const slotState = useSlotNameSelection();
  if (!query.data) return <></>;
  return (
    <Combobox
      valueState={slotState}
      emptyLabel="No slot selected"
      placeholder="Select slot from save file"
      triggerButtonClassName="w-[200px]"
      popoverContentClassName="w-[200px]"
      items={query.data.slots
        .map((slot) =>
          playerNameBytesToString(slot.player_game_data.character_name)
        )
        .map((s) => ({
          label: s,
          value: s,
        }))}
    />
  );
}

function SteamIdLabel() {
  const { query } = useEldenRingSaveQuery();
  if (!query.data) return <></>;
  return <Label>Steam ID: {query.data.global_steam_id}</Label>;
}

function RefreshButton() {
  const { saveFileSource } = useSaveFileSourceStore();

  const { query, isParsing } = useEldenRingSaveQuery();
  const [now, setNow] = useState<number>(Date.now());

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
      variant="ghost"
      disabled={
        query.isFetching || (saveFileSource && 'file' in saveFileSource)
      }
      className="flex gap-2"
      onClick={() => {
        void query.refetch();
      }}
    >
      {query.isFetching ? (
        <>
          <Spinner />
          {isParsing ? 'Parsing...' : 'Loading...'}
        </>
      ) : (
        <>
          <RefreshCcwIcon />
          Updated{' '}
          {query.data
            ? formatDistance(query.dataUpdatedAt, now, {
                addSuffix: true,
                includeSeconds: true,
              })
            : 'never'}
        </>
      )}
    </Button>
  );
}

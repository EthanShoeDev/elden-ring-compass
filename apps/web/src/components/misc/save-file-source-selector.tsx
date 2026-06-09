import { itemIconUrl } from '@elden-ring-compass/data/images';
import { useEldenRingSave } from '@/lib/atoms/save';
import { fileToArrBuffer } from '@/lib/er-save-parser';
import { encodeToUrl, slotToShareableProgression } from '@/lib/share/encode';
import { ShareCodecError } from '@/lib/share/types';
import { cn } from '@/lib/utils';
import { statsDbView } from '@/lib/vm/stats';
import {
  isSharedSource,
  SAMPLE_SAVE_URL,
  saveFileSourceAtom,
} from '@/stores/save-file-source-store';
import { useSelectedSlot, useSlotNameSelection } from '@/stores/slot-selection-store';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import { ClientOnly, useNavigate } from '@tanstack/react-router';
import { Effect, Exit } from 'effect';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  EditIcon,
  FileCheckIcon,
  Link2OffIcon,
  LinkIcon,
  Share2Icon,
  SwordIcon,
  UnplugIcon,
  UploadCloudIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { CodeSnippet } from './code-snippet';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

const DEFAULT_LOCAL_URL = 'http://localhost:8080/ER0000.sl2';

// Faint remembrance art behind the modal (Godfrey), echoing the design kit's
// `modal-art`. Decorative only.
const MODAL_ART = itemIconUrl(170);

export function ShareCharacterButton({
  className,
  variant = 'outline',
  size = 'sm',
}: Pick<React.ComponentProps<typeof Button>, 'className' | 'variant' | 'size'>) {
  const slot = useSelectedSlot();
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'building' | 'copied' | 'error'>('idle');

  if (!slot) return null;

  const buildLink = () => {
    setStatus('building');
    const fiber = Effect.runFork(
      Effect.gen(function* () {
        const encoded = yield* encodeToUrl(slotToShareableProgression(slot));
        const url = new URL(
          typeof window === 'undefined' ? 'http://localhost/' : window.location.href,
        );
        url.pathname = '/';
        url.search = '';
        url.searchParams.set('save', encoded);
        url.hash = '';
        const nextUrl = url.toString();
        yield* Effect.sync(() => setShareUrl(nextUrl));
        if (navigator.clipboard) {
          yield* Effect.tryPromise({
            try: () => navigator.clipboard.writeText(nextUrl),
            catch: (cause) => new ShareCodecError({ cause }),
          });
        }
      }),
    );
    fiber.addObserver((exit) => {
      if (Exit.isSuccess(exit)) {
        setStatus('copied');
      } else {
        setStatus('error');
      }
    });
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Button variant={variant} size={size} onClick={buildLink}>
        {status === 'copied' ? <CheckIcon /> : status === 'building' ? <CopyIcon /> : <Share2Icon />}
        {status === 'building'
          ? 'Building link'
          : status === 'copied'
            ? 'Copied share link'
            : 'Share this character'}
      </Button>
      {shareUrl && (
        <Input
          readOnly
          className='h-8 min-w-0 font-mono text-xs'
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      {status === 'error' && (
        <div className='text-[12.5px] text-destructive'>Could not create share link.</div>
      )}
    </div>
  );
}

/**
 * The Connect-a-save flow, as a centered modal (was an app-bar dropdown).
 * Connecting is optional — the whole app is explorable without a save — so this
 * lives behind a button and *personalizes* every section. Mirrors the
 * compass-app design kit's `ConnectModal`: faint remembrance art, a sword mark,
 * a File/URL toggle, a drag-and-drop zone, and read-only reassurances.
 */
function ConnectSaveContent() {
  const saveFileSource = useAtomValue(saveFileSourceAtom);
  const setSaveFileSource = useAtomSet(saveFileSourceAtom);
  const save = useEldenRingSave();

  const [type, setType] = useState<'file' | 'url'>(
    saveFileSource && 'url' in saveFileSource ? 'url' : 'file',
  );
  const [drag, setDrag] = useState(false);
  const [urlInput, setUrlInput] = useState(() =>
    saveFileSource && 'url' in saveFileSource ? saveFileSource.url : DEFAULT_LOCAL_URL,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setSaveFileSource({
      file: { buffer: await fileToArrBuffer(file), name: file.name },
    });
  };

  return (
    <div className='relative flex flex-col gap-5'>
      <img
        src={MODAL_ART}
        alt=''
        aria-hidden
        className='pointer-events-none absolute -top-10 -right-10 size-48 object-contain opacity-[0.08] select-none'
      />

      <DialogHeader className='gap-2.5'>
        <span className='flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-foreground'>
          <SwordIcon className='size-6' />
        </span>
        <DialogTitle className='text-[22px] leading-tight font-bold tracking-tight'>
          Connect your save
        </DialogTitle>
        <DialogDescription className='leading-relaxed'>
          Personalize the Compass — boss progression, owned items, character stats, and which graces
          you’ve discovered. It’s read-only and stays on your device.
        </DialogDescription>
      </DialogHeader>

      <ToggleGroup
        className='self-start rounded-md border'
        value={[type]}
        onValueChange={(v) => {
          const next = v[v.length - 1];
          if (next) setType(next as 'file' | 'url');
        }}
      >
        <ToggleGroupItem
          className='gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
          value='file'
        >
          <FileCheckIcon className='size-3.5' />
          Upload File
        </ToggleGroupItem>
        <ToggleGroupItem
          className='gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
          value='url'
        >
          <LinkIcon className='size-3.5' />
          Local URL
        </ToggleGroupItem>
      </ToggleGroup>

      {type === 'file' ? (
        <div className='flex flex-col gap-2.5'>
          {saveFileSource && 'file' in saveFileSource ? (
            <div className='flex items-center justify-between gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3.5 py-3'>
              <span className='flex min-w-0 items-center gap-2 text-sm'>
                <FileCheckIcon className='size-4 shrink-0 text-green-500' />
                <span className='truncate'>{saveFileSource.file.name}</span>
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSaveFileSource(undefined);
                }}
              >
                <EditIcon /> Change
              </Button>
            </div>
          ) : (
            <>
              <button
                type='button'
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => {
                  setDrag(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
                className={cn(
                  'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
                  drag
                    ? 'border-green-500/70 bg-green-500/5'
                    : 'border-border hover:border-green-500/50 hover:bg-green-500/5',
                )}
              >
                <span className='flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
                  <UploadCloudIcon className='size-[22px]' />
                </span>
                <span className='text-[15px] font-semibold'>
                  Drop your save here, or click to browse
                </span>
                <span className='font-mono text-xs text-muted-foreground'>ER0000.sl2</span>
              </button>
              <input
                ref={fileRef}
                type='file'
                aria-label='Upload Elden Ring save file'
                className='hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </>
          )}
          <a
            className='text-[12.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
            target='_blank'
            rel='noreferrer'
            href='https://store.steampowered.com/account/remotestorageapp/?appid=1245620'
          >
            Download save from Steam Cloud
          </a>
          <p className='font-mono text-[11.5px] leading-relaxed text-muted-foreground'>
            %AppData%\EldenRing\YOUR_STEAM_ID\ER0000.sl2
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          <Input
            type='url'
            className='font-mono'
            placeholder={DEFAULT_LOCAL_URL}
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
            }}
          />
          <Button
            variant='default'
            onClick={() => {
              setSaveFileSource({ url: urlInput });
            }}
          >
            <LinkIcon /> Connect &amp; start polling
          </Button>
          <details className='text-muted-foreground'>
            <summary className='cursor-pointer text-[12.5px] underline-offset-2 hover:text-foreground'>
              How do I host my save locally?
            </summary>
            <div className='mt-2 flex flex-col gap-2'>
              <p className='text-[12.5px]'>
                Run this in PowerShell, then enter the url it serves above:
              </p>
              <CodeSnippet>
                {`cd (Join-Path "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" (Get-ChildItem "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\EldenRing" -Directory | Select-Object -First 1).Name) ; npx http-server -p 8080 --cors -c-1`}
              </CodeSnippet>
            </div>
          </details>
        </div>
      )}

      <ConnectStatusLine />

      {save.data && <ShareCharacterButton className='rounded-lg border border-border p-3' />}

      <div className='flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <CheckIcon className='size-3.5 text-green-500' /> Read-only — never writes your save
        </span>
        <span className='flex items-center gap-1.5'>
          <CheckIcon className='size-3.5 text-green-500' /> Parsed locally · can’t get you banned
        </span>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4'>
        <DialogClose
          render={<Button variant='ghost' size='sm' />}
          onClick={() => {
            setType('url');
            setUrlInput(SAMPLE_SAVE_URL);
            setSaveFileSource({ url: SAMPLE_SAVE_URL });
          }}
        >
          Use a sample save →
        </DialogClose>
        <DialogClose render={<Button variant={save.data ? 'default' : 'ghost'} size='sm' />}>
          {save.data ? 'Done' : 'Maybe later'}
        </DialogClose>
      </div>
    </div>
  );
}

function ConnectStatusLine() {
  const save = useEldenRingSave();
  return (
    <ClientOnly>
      {save.isLoading ? (
        <div className='text-[13px] text-muted-foreground'>Loading…</div>
      ) : save.isError ? (
        <div className='flex items-center gap-1.5 text-[13px] text-destructive'>
          <Link2OffIcon className='size-4' /> {save.error?.message ?? 'Failed to read save'}
        </div>
      ) : save.isSuccess ? (
        <div className='flex items-center gap-1.5 text-[13px] text-green-500'>
          <CheckIcon className='size-4' /> Save connected
        </div>
      ) : null}
    </ClientOnly>
  );
}

/** A button that opens the centered Connect-a-save modal. */
export function ConnectSaveButton({
  children,
  ...buttonProps
}: React.ComponentProps<typeof Button>) {
  return (
    <Dialog>
      <DialogTrigger render={<Button {...buttonProps} />}>
        {children ?? (
          <>
            <FileCheckIcon /> Connect a save
          </>
        )}
      </DialogTrigger>
      <DialogContent className='overflow-hidden sm:max-w-md'>
        <ConnectSaveContent />
      </DialogContent>
    </Dialog>
  );
}

/** Disconnect the active save (clears the source). */
export function DisconnectButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const setSaveFileSource = useAtomSet(saveFileSourceAtom);
  const saveFileSource = useAtomValue(saveFileSourceAtom);
  const navigate = useNavigate();
  return (
    <Button
      variant='ghost'
      size='icon-sm'
      title='Disconnect save'
      onClick={() => {
        setSaveFileSource(undefined);
        if (isSharedSource(saveFileSource)) {
          void navigate({
            search: ((prev: { readonly save?: string }) => ({ ...prev, save: undefined })) as never,
            replace: true,
          });
        }
      }}
      className={className}
      {...props}
    >
      <UnplugIcon />
      <span className='sr-only'>Disconnect save</span>
    </Button>
  );
}

/**
 * The active character as a combined identity + slot switcher — an avatar, the
 * character name and its archetype/level that *is* the dropdown to switch save
 * slots (mirrors the shadcn sidebar team-switcher). Replaces the old separate
 * "avatar block + SlotSelector combobox", which showed the character name twice.
 * If the save has a single slot, the trigger renders as a static identity card.
 */
export function SlotSwitcher() {
  const { data } = useEldenRingSave();
  const slot = useSelectedSlot();
  const [slotName, setSlotName] = useSlotNameSelection();
  if (!data || !slot) return null;

  const stats = statsDbView(slot);
  const name = slot.player_game_data.character_name || 'Tarnished';
  const multiple = data.slots.length > 1;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!multiple}
            render={
              <SidebarMenuButton
                size='lg'
                aria-label='Switch save slot'
                className='data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground data-disabled:opacity-100'
              />
            }
          >
            <span className='flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
              <SwordIcon className='size-4' />
            </span>
            <span className='grid min-w-0 flex-1 text-left leading-tight'>
              <span className='truncate text-[13px] font-semibold'>{name}</span>
              <span className='truncate text-[11px] text-muted-foreground'>
                {stats.arche_type} · Lvl {stats.stats.level}
              </span>
            </span>
            {multiple && (
              <ChevronsUpDownIcon className='ml-auto size-4 shrink-0 text-muted-foreground' />
            )}
          </DropdownMenuTrigger>
          {multiple && (
            <DropdownMenuContent align='start' side='right' sideOffset={4} className='w-56'>
              <DropdownMenuRadioGroup value={slotName ?? ''} onValueChange={setSlotName}>
                {/* Label must live inside a group/radio-group — Base UI's
                    MenuGroupContext requirement. */}
                <DropdownMenuLabel className='text-xs text-muted-foreground'>
                  Save slots
                </DropdownMenuLabel>
                {data.slots.map((s) => (
                  <DropdownMenuRadioItem
                    key={s.player_game_data.character_name}
                    value={s.player_game_data.character_name}
                  >
                    <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
                      <span className='truncate'>
                        {s.player_game_data.character_name || 'Tarnished'}
                      </span>
                      <span className='shrink-0 text-xs text-muted-foreground'>
                        Lvl {s.player_game_data.level}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

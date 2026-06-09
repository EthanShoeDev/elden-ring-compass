import { ExternalLinkIcon, HandshakeIcon } from 'lucide-react';

import { GithubIcon } from '@/components/shell/github-icon';
import { REPO_URL } from '@/components/shell/nav';

/**
 * Credits & Acknowledgements — a first-class page (not a footer scrap) thanking
 * every open-source project Elden Ring Compass is built on top of.
 *
 * Ordering is by importance, not category: the projects our extractor and save
 * parser are actually built on come first (with a one-line note on what they give
 * us); everything we merely cross-referenced is a compact link list at the bottom.
 */
type CoreCredit = { name: string; by: string; role: string; href: string };
type Mention = { name: string; by: string; href: string };

/** The projects Compass is genuinely built on — ranked by how much we depend on them. */
const CORE: ReadonlyArray<CoreCredit> = [
  {
    name: 'ER-Save-Lib',
    by: 'ClayAmore',
    role: 'The Rust library that first decoded the .sl2 save format; we vendor its event-flag table and regulation.bin key.',
    href: 'https://github.com/ClayAmore/ER-Save-Lib',
  },
  {
    name: 'Elden Ring Save Manager',
    by: 'Hapfel1',
    role: 'The Python reimplementation of ER-Save-Lib we transcribed our TypeScript save parser from, plus the questline flag DBs behind our quest compass.',
    href: 'https://github.com/Hapfel1/er-save-manager',
  },
  {
    name: 'UXM Selective Unpacker',
    by: 'Nordgaren / TKGP',
    role: 'Our extractor unpacks the game’s encrypted archives UXM-style, using its keys and file dictionary.',
    href: 'https://github.com/Nordgaren/UXM-Selective-Unpack',
  },
  {
    name: 'Paramdex',
    by: 'soulsmods',
    role: 'PARAMDEF schemas that name every field in the game’s params — how we read item, weapon and boss stats.',
    href: 'https://github.com/soulsmods/Paramdex',
  },
  {
    name: 'soulstruct',
    by: 'Grimrukh',
    role: 'Source of the EMEVD instruction set we use to decode event scripts for map treasure and quest flags.',
    href: 'https://github.com/Grimrukh/soulstruct',
  },
  {
    name: 'ER-Save-Editor',
    by: 'ClayAmore',
    role: 'ClayAmore’s save editor — the companion project where the .sl2 format was first reverse-engineered.',
    href: 'https://github.com/ClayAmore/ER-Save-Editor',
  },
  {
    name: 'SoulsFormatsNEXT',
    by: 'soulsmods',
    role: 'Reference for the FromSoftware binary formats our TypeScript parsers implement.',
    href: 'https://github.com/soulsmods/SoulsFormatsNEXT',
  },
];

/** Tools, data dumps and wikis we cross-referenced — credited, but not dependencies. */
const MENTIONS: ReadonlyArray<Mention> = [
  { name: 'WitchyBND', by: 'ividyon', href: 'https://github.com/ividyon/WitchyBND' },
  {
    name: 'The Impaler’s Archive',
    by: 'ividyon',
    href: 'https://github.com/ividyon/Impalers-Archive',
  },
  {
    name: 'elden-ring-eventparam',
    by: 'soulsmods',
    href: 'https://github.com/soulsmods/elden-ring-eventparam',
  },
  { name: 'DSMapStudio', by: 'soulsmods', href: 'https://github.com/soulsmods/DSMapStudio' },
  { name: 'Smithbox', by: 'vawser', href: 'https://github.com/vawser/Smithbox' },
  {
    name: 'Elden Ring Cheat Table (TGA)',
    by: 'The Grand Archives',
    href: 'https://github.com/The-Grand-Archives/Elden-Ring-CT-TGA',
  },
  {
    name: 'Elden Ring Debug Tool',
    by: 'Nordgaren',
    href: 'https://github.com/Nordgaren/Elden-Ring-Debug-Tool',
  },
  {
    name: 'Elden Ring Practice Tool',
    by: 'johndisandonato',
    href: 'https://github.com/veeenu/eldenring-practice-tool',
  },
  {
    name: 'ERDB',
    by: 'EldenRingDatabase',
    href: 'https://github.com/EldenRingDatabase/erdb',
  },
  { name: 'Fextralife Wiki', by: 'Fextralife', href: 'https://eldenring.wiki.fextralife.com' },
  { name: 'SoulsModding Wiki', by: 'community', href: 'http://soulsmodding.wikidot.com' },
];

function CoreRow({ item }: { item: CoreCredit }) {
  return (
    <a
      href={item.href}
      target='_blank'
      rel='noreferrer'
      className='group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30'
    >
      <div className='flex min-w-0 flex-col gap-0.5'>
        <div className='flex items-baseline gap-2'>
          <span className='text-sm font-semibold tracking-tight'>{item.name}</span>
          <span className='text-[11px] text-muted-foreground'>{item.by}</span>
        </div>
        <p className='text-[12.5px] leading-snug text-muted-foreground text-pretty'>{item.role}</p>
      </div>
      <ExternalLinkIcon className='mt-1 ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground' />
    </a>
  );
}

function MentionPill({ item }: { item: Mention }) {
  return (
    <a
      href={item.href}
      target='_blank'
      rel='noreferrer'
      title={`${item.name} — by ${item.by}`}
      className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground'
    >
      {item.name}
      <ExternalLinkIcon className='size-3 opacity-60' />
    </a>
  );
}

export function CreditsSection() {
  return (
    <div className='flex max-w-3xl flex-col gap-6'>
      {/* Hero */}
      <div className='flex items-start gap-4 rounded-lg border border-border bg-card p-5'>
        <span className='flex size-[42px] shrink-0 place-items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400'>
          <HandshakeIcon className='size-5' />
        </span>
        <div>
          <h3 className='mb-1.5 text-lg font-semibold tracking-tight'>
            Standing on the shoulders of the Tarnished
          </h3>
          <p className='max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground text-pretty'>
            Compass exists because the community reverse-engineered the save format and built the
            tools to unpack the game. We built our own extractor on top of their work to add Shadow
            of the Erdtree support — please go star them.
          </p>
        </div>
      </div>

      {/* Built on — ranked dependencies */}
      <section className='flex flex-col gap-2'>
        <div className='text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase'>
          Built on
        </div>
        <div className='flex flex-col gap-2'>
          {CORE.map((item) => (
            <CoreRow key={item.name} item={item} />
          ))}
        </div>
      </section>

      {/* Also referenced — compact link list */}
      <section className='flex flex-col gap-2.5'>
        <div className='text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase'>
          Also referenced
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {MENTIONS.map((item) => (
            <MentionPill key={item.name} item={item} />
          ))}
        </div>
      </section>

      {/* Closing note */}
      <div className='flex flex-col gap-2 border-t border-border pt-4'>
        <p className='max-w-[70ch] text-[12px] leading-relaxed text-pretty'>
          Spotted something wrong or uncredited? Corrections are always welcome on{' '}
          <a
            href={REPO_URL}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground'
          >
            <GithubIcon className='size-3' /> GitHub
          </a>
          .
        </p>
        <p className='max-w-[70ch] text-[11px] text-muted-foreground'>
          Elden Ring Compass is a fan project and is not affiliated with, endorsed by, or sponsored
          by FromSoftware or Bandai Namco Entertainment.
        </p>
      </div>
    </div>
  );
}

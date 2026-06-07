import {
  ExternalLinkIcon,
  HandshakeIcon,
  HardDriveIcon,
  InfoIcon,
  PackageIcon,
  Settings2Icon,
  type LucideIcon,
} from 'lucide-react';

import { GithubIcon } from '@/components/shell/github-icon';
import { REPO_URL } from '@/components/shell/nav';

/**
 * Credits & Acknowledgements — a first-class page (not a footer scrap) thanking
 * every open-source project Elden Ring Compass is built on top of, grouped by
 * what they give us. Mirrors the compass-app design kit's `CreditsView`.
 */
type CreditItem = {
  name: string;
  by: string;
  role: string;
  href: string;
  license: string;
};

type CreditGroup = {
  label: string;
  icon: LucideIcon;
  blurb: string;
  items: Array<CreditItem>;
};

const CREDIT_GROUPS: ReadonlyArray<CreditGroup> = [
  {
    label: 'Game data & catalogue',
    icon: PackageIcon,
    blurb:
      'Where Compass learns the names, stats, descriptions and flags behind every item, boss and region.',
    items: [
      {
        name: 'ERDB',
        by: 'EldenRingDatabase',
        role: 'Powered the very first version of Compass and shaped our one-JSON-object-per-item data model. We’ve since built our own extractor to replace it, because ERDB doesn’t cover the Shadow of the Erdtree DLC — but we owe it the original blueprint.',
        href: 'https://github.com/EldenRingDatabase/erdb',
        license: 'Apache-2.0',
      },
      {
        name: 'Paramdex',
        by: 'soulsmods',
        role: 'Open PARAMDEF schemas that name every field in regulation.bin. Our extractor vendors 194 of these XMLs (pinned) to read item, weapon and boss params straight from your install.',
        href: 'https://github.com/soulsmods/Paramdex',
        license: 'MIT',
      },
      {
        name: 'The Impaler’s Archive',
        by: 'ividyon',
        role: 'A complete text dump of Shadow of the Erdtree — our reference for DLC item names, descriptions and dialogue while the rest of the data was still being catalogued.',
        href: 'https://github.com/ividyon/Impalers-Archive',
        license: 'Text dump',
      },
      {
        name: 'elden-ring-eventparam',
        by: 'soulsmods',
        role: 'Documented event-flag ID ranges we cross-reference when mapping grace, boss and questline flags onto the bits in your save.',
        href: 'https://github.com/soulsmods/elden-ring-eventparam',
        license: 'Public domain',
      },
    ],
  },
  {
    label: 'Save files & reverse engineering',
    icon: HardDriveIcon,
    blurb: 'The projects that decoded the .sl2 save format so we can read it in your browser.',
    items: [
      {
        name: 'ER-Save-Editor',
        by: 'ClayAmore',
        role: 'Reverse-engineered the .sl2 save layout — the original map of where your inventory, stats and event flags live.',
        href: 'https://github.com/ClayAmore/ER-Save-Editor',
        license: 'MIT',
      },
      {
        name: 'ER-Save-Lib',
        by: 'ClayAmore',
        role: 'The Rust save library behind ER-Save-Editor. We ported it to TypeScript for our fully in-browser parser, and vendor its event-flag offset table and regulation.bin AES key.',
        href: 'https://github.com/ClayAmore/ER-Save-Lib',
        license: 'Open source',
      },
      {
        name: 'Elden Ring Save Manager',
        by: 'Hapfel1',
        role: 'A save manager whose curated event-flag and questline databases anchor the “next step” guidance in our quest compass.',
        href: 'https://github.com/Hapfel1/er-save-manager',
        license: 'MIT',
      },
      {
        name: 'soulstruct',
        by: 'Grimrukh',
        role: 'Python toolkit for FromSoftware formats — our reference for save/param structures, and the source of the EMEVD instruction dictionary our extractor uses to decode event scripts for map treasure and quest flags.',
        href: 'https://github.com/Grimrukh/soulstruct',
        license: 'MIT',
      },
    ],
  },
  {
    label: 'Extraction & game formats',
    icon: Settings2Icon,
    blurb:
      'The foundation our own extractor stands on — unpacking the encrypted archives and decoding their binary formats.',
    items: [
      {
        name: 'UXM Selective Unpacker',
        by: 'Nordgaren / TKGP',
        role: 'Unpacks the game’s encrypted dvdbnd archives. Our extractor is UXM-parity and vendors its per-archive RSA keys, 9 MB file-path dictionary and dvdbnd layout.',
        href: 'https://github.com/Nordgaren/UXM-Selective-Unpack',
        license: 'GPL-3.0',
      },
      {
        name: 'WitchyBND',
        by: 'ividyon',
        role: 'Unpacks and serializes FromSoftware archives — our cross-reference for the BND4, DCX, BHD5 and TPF container formats.',
        href: 'https://github.com/ividyon/WitchyBND',
        license: 'GPL-3.0',
      },
      {
        name: 'SoulsFormatsNEXT',
        by: 'soulsmods',
        role: 'Community .NET library implementing FromSoftware’s binary formats — the canonical reference our TypeScript parsers (BND, DCX, TPF, FMG, MSB, PARAM) follow.',
        href: 'https://github.com/soulsmods/SoulsFormatsNEXT',
        license: 'GPL-3.0',
      },
      {
        name: 'DSMapStudio',
        by: 'soulsmods',
        role: 'Map editor and the canonical reference for MSB entity coordinates — how we understand where bosses and graces sit in the world.',
        href: 'https://github.com/soulsmods/DSMapStudio',
        license: 'MIT',
      },
      {
        name: 'Smithbox',
        by: 'vawser',
        role: 'Modding workbench whose param and map browsers we cross-referenced for IDs and coordinates.',
        href: 'https://github.com/vawser/Smithbox',
        license: 'MIT',
      },
    ],
  },
  {
    label: 'References & community',
    icon: InfoIcon,
    blurb: 'Where we double-check flag meanings, item IDs, descriptions and questlines.',
    items: [
      {
        name: 'Elden Ring Cheat Table (TGA)',
        by: 'The Grand Archives',
        role: 'Cheat Engine table whose Event Flag Manager we use to name and validate save flags.',
        href: 'https://github.com/The-Grand-Archives/Elden-Ring-CT-TGA',
        license: 'Community',
      },
      {
        name: 'Elden Ring Debug Tool',
        by: 'Nordgaren',
        role: 'Debugging tool that doubles as a reference for item IDs and inventory categories.',
        href: 'https://github.com/Nordgaren/Elden-Ring-Debug-Tool',
        license: 'GPL-3.0',
      },
      {
        name: 'Elden Ring Practice Tool',
        by: 'johndisandonato',
        role: 'Speedrun practice tool we consult for in-game flag and coordinate addressing.',
        href: 'https://github.com/veeenu/eldenring-practice-tool',
        license: 'AGPL-3.0',
      },
      {
        name: 'Elden Ring Progression Tracker',
        by: 'elden-ring-progression-tracker',
        role: 'A 100%-completion tracker we cross-referenced for objective ordering and naming.',
        href: 'https://github.com/elden-ring-progression-tracker/elden-ring-progression-tracker.github.io',
        license: 'Reference',
      },
      {
        name: 'Fextralife Wiki',
        by: 'Fextralife',
        role: 'Cross-checked item descriptions and quest steps that aren’t encoded in the save data.',
        href: 'https://eldenring.wiki.fextralife.com',
        license: 'Reference',
      },
      {
        name: 'SoulsModding Wiki',
        by: 'SoulsModding community',
        role: 'Community documentation of the BND4 container and save encryption.',
        href: 'http://soulsmodding.wikidot.com',
        license: 'Reference',
      },
    ],
  },
];

function CreditCard({ item, Icon }: { item: CreditItem; Icon: LucideIcon }) {
  return (
    <a
      href={item.href}
      target='_blank'
      rel='noreferrer'
      className='group flex gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-px hover:border-foreground/30 hover:shadow-md'
    >
      <span className='flex size-[34px] shrink-0 place-items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors group-hover:text-foreground'>
        <Icon className='size-[17px]' />
      </span>
      <div className='flex min-w-0 flex-col gap-1.5'>
        <div className='flex flex-col'>
          <span className='text-sm font-semibold tracking-tight break-words'>{item.name}</span>
          <span className='text-[11.5px] text-muted-foreground'>by {item.by}</span>
        </div>
        <p className='text-[12.5px] leading-relaxed text-muted-foreground text-pretty'>
          {item.role}
        </p>
        <div className='mt-0.5 flex items-center gap-2.5'>
          <span className='rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10.5px] tracking-wide text-muted-foreground'>
            {item.license}
          </span>
          <span className='ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors group-hover:text-foreground'>
            <GithubIcon className='size-[13px]' /> Repository
            <ExternalLinkIcon className='size-3' />
          </span>
        </div>
      </div>
    </a>
  );
}

export function CreditsSection() {
  return (
    <div className='flex max-w-5xl flex-col gap-7'>
      {/* Hero */}
      <div className='flex items-start gap-4 rounded-lg border border-border bg-card p-5'>
        <span className='flex size-[42px] shrink-0 place-items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400'>
          <HandshakeIcon className='size-5' />
        </span>
        <div>
          <h3 className='mb-1.5 text-lg font-semibold tracking-tight'>
            Standing on the shoulders of the Tarnished
          </h3>
          <p className='max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground text-pretty'>
            Elden Ring Compass is free and open-source, and it only exists because of the people who
            reverse-engineered the save format, catalogued the game’s data and built the tools that
            unpack it. We’ve since built our own extractor on top of their work to add Shadow of the
            Erdtree support — every project below is independent and community-run, so please go
            star them.
          </p>
        </div>
      </div>

      {CREDIT_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <section key={group.label} className='flex flex-col gap-3.5'>
            <div className='flex items-start gap-3'>
              <span className='mt-px flex size-7 shrink-0 place-items-center justify-center rounded-md border border-border bg-muted text-muted-foreground'>
                <Icon className='size-[15px]' />
              </span>
              <div>
                <div className='text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase'>
                  {group.label}
                </div>
                <p className='mt-0.5 text-[12.5px] text-muted-foreground'>{group.blurb}</p>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              {group.items.map((item) => (
                <CreditCard key={item.name} item={item} Icon={group.icon} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Closing note */}
      <div className='flex flex-col gap-2 border-t border-border pt-4'>
        <p className='max-w-[70ch] text-[12.5px] leading-relaxed text-pretty'>
          Thank you to every contributor, bug reporter and data corrector who has opened a pull
          request or issue. Spotted something wrong? Corrections are always welcome on{' '}
          <a
            href={REPO_URL}
            target='_blank'
            rel='noreferrer'
            className='underline underline-offset-2 hover:text-foreground'
          >
            GitHub
          </a>
          .
        </p>
        <p className='max-w-[70ch] text-[11.5px] text-muted-foreground'>
          Elden Ring Compass is a fan project and is not affiliated with, endorsed by, or sponsored
          by FromSoftware or Bandai Namco Entertainment.
        </p>
      </div>
    </div>
  );
}

import { type LucideIcon, SparklesIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Shared "preview / coming soon" surface for scaffolded views (Build Planner,
 * Quest Compass) whose real logic lives in docs/projects/future/ and isn't
 * implemented yet. Keeps the nav + layout complete without faking functionality.
 */
export function FeaturePreview({
  icon: Icon,
  title,
  blurb,
  planned,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  planned: string[];
}) {
  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm'>
        <SparklesIcon className='size-4 shrink-0 text-violet-300' />
        <span className='font-semibold'>Preview</span>
        <span className='text-muted-foreground'>
          This feature is in design — it isn’t wired to your save yet.
        </span>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-accent'>
              <Icon className='size-5' />
            </span>
            <CardTitle className='text-xl'>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-5'>
          <p className='max-w-prose leading-relaxed text-muted-foreground'>{blurb}</p>
          <div>
            <div className='mb-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase'>
              Planned
            </div>
            <ul className='flex flex-col gap-1.5'>
              {planned.map((p) => (
                <li key={p} className='flex items-start gap-2 text-sm'>
                  <span className='mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60' />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

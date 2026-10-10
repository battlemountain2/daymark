"use client";
import { use, Suspense } from 'react';
import type { CanvasResult } from '@/app/page';
import type { State } from '@/lib/db';
import type { LedeInputs } from '@/lib/lede';
import { dailyBrief } from '@/lib/daily-brief';
import { buildItems } from './TodoPanel';

type Props = { promise: Promise<CanvasResult>; state: State; base: Omit<LedeInputs, 'items' | 'weather'> };
function BriefText({ brief }: { brief: ReturnType<typeof dailyBrief> }) {
  return <div className="daily-brief-copy" data-tone={brief.tone}>
    <p className="daily-brief-lead">{brief.lead}</p>
    {brief.sub && <p className="daily-brief-detail">{brief.sub}</p>}
    {brief.availability && <p className="daily-brief-availability mono">{brief.availability}</p>}
  </div>;
}
function LoadedBrief({ promise, state, base }: Props) {
  const canvas = use(promise);
  const items = buildItems(canvas.assignments, state).filter(item => !state.dismissed.includes(item.id));
  return <BriefText brief={dailyBrief({ ...base, items, weather: null }, canvas.error ? 'unavailable' : 'ready')} />;
}
export default function DailyBrief(props: Props) {
  return <Suspense fallback={<BriefText brief={dailyBrief({ ...props.base, items: props.state.todos, weather: null }, 'loading')} />}>
    <LoadedBrief {...props} />
  </Suspense>;
}

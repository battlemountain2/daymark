import { lede, type LedeInputs } from './lede';

/** An unavailable feed must never be presented as a cleared workload. */
export function dailyBrief(input: LedeInputs, source: 'loading' | 'ready' | 'unavailable') {
  const hasOpenWork = input.items?.some(item => !item.done);
  const result = lede({ ...input, items: source === 'ready' || hasOpenWork ? input.items : null });
  return {
    ...result,
    availability: source === 'loading' ? 'Checking assignments…'
      : source === 'unavailable' ? 'Canvas unavailable · showing saved tasks only.' : null,
  };
}

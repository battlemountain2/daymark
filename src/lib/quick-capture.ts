export function appendCapture(previous: string | undefined, content: string, source?: string) {
  const entry = `${content.trim()}${source ? `\nSource: ${source}` : ''}`;
  return [previous?.trim(), entry].filter(Boolean).join('\n\n');
}

/** Reserve room for the source before the task API's 200-character limit. */
export function captureTaskTitle(content: string, source?: string) {
  const suffix = source ? ` · ${source}` : '';
  const room = 200 - suffix.length;
  if (room < 8) throw new Error('This source link is too long for a task. Save it as a note or project instead.');
  const text = content.trim().replace(/\s+/g, ' ');
  return (text.length > room ? `${text.slice(0, room - 1).trimEnd()}…` : text) + suffix;
}

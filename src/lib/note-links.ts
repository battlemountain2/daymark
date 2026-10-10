export type InlineNotePart = {kind:'text' | 'wiki';text:string} | {kind:'link';text:string;url:string};
export function safeNoteUrl(value: string) {
  if (value.startsWith('//') || value.includes('\\')) return false;
  try {
    const url = new URL(value, 'https://daymark.invalid');
    return !url.username && !url.password && ['http:','https:'].includes(url.protocol) &&
      (value.startsWith('/') || /^https?:\/\//i.test(value));
  } catch { return false; }
}
export function inlineNoteParts(text: string): InlineNotePart[] {
  const localSource = text.match(/^(Source:\s*)(\/\S+)\s*$/);
  if (localSource && safeNoteUrl(localSource[2])) {
    return [{kind:'text',text:localSource[1]}, {kind:'link',text:'Open source passage ↗',url:localSource[2]}];
  }
  const parts: InlineNotePart[] = [];
  const pattern = /\[\[[^\]\n]+\]\]|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<>]+/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) parts.push({kind:'text',text:text.slice(last,match.index)});
    const value = match[0], markdown = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (value.startsWith('[[')) parts.push({kind:'wiki',text:value});
    else if (markdown && safeNoteUrl(markdown[2])) parts.push({kind:'link',text:markdown[1],url:markdown[2]});
    else if (!markdown && safeNoteUrl(value.replace(/[.,;!?]+$/,''))) {
      const url = value.replace(/[.,;!?]+$/,'');
      parts.push({kind:'link',text:url,url});
      if(url.length < value.length) parts.push({kind:'text',text:value.slice(url.length)});
    } else parts.push({kind:'text',text:value});
    last = match.index! + value.length;
  }
  if(last < text.length) parts.push({kind:'text',text:text.slice(last)});
  return parts;
}
export function capturedTaskSource(title: string) {
  const match = title.match(/^(.*?) · (https?:\/\/\S+)$/);
  return match && safeNoteUrl(match[2]) ? {title:match[1],url:match[2]} : {title,url:null};
}

export class InputError extends Error {}
export async function readInput(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 100000) throw new InputError("Request is too large.");
  try { const value = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(); return value; } catch { throw new InputError("Expected a JSON object."); }
}
export function textField(body: Record<string, unknown>, key: string, fallback = "", max = 12000): string {
  const value = body[key] ?? fallback;
  if (typeof value !== "string" || value.length > max) throw new InputError(`Invalid ${key}.`);
  return value;
}

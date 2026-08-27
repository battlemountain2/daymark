/**
 * A reachability probe, deliberately trivial.
 *
 * `navigator.onLine` reports true for a wifi network with no route out, which
 * is precisely how campus wifi fails. The offline banner asks this instead.
 */
export const dynamic = "force-dynamic";

export function HEAD() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export function GET() {
  return new Response("ok", { headers: { "cache-control": "no-store" } });
}

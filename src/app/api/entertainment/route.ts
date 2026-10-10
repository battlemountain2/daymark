import { isSignedIn } from '@/lib/auth';
import { getEntertainment } from '@/lib/entertainment';
export async function GET() {
  if (!await isSignedIn()) return new Response(null,{status:401});
  return Response.json(await getEntertainment(),{headers:{'Cache-Control':'private, no-store'}});
}

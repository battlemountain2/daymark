import {timingSafeEqual} from 'node:crypto';
import {refreshStoredRadar} from '@/lib/radar-refresh';
export const maxDuration=240;
export const dynamic='force-dynamic';
export async function GET(req:Request) {
 const secret=process.env.CRON_SECRET,actual=Buffer.from(req.headers.get('authorization')||''),expected=Buffer.from(`Bearer ${secret||''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return new Response(null,{status:401});
 try{return Response.json(await refreshStoredRadar({scheduled:true}),{headers:{'Cache-Control':'no-store'}});}
 catch{console.error('Scheduled radar refresh failed');return Response.json({error:'Radar could not refresh. Saved dates are unchanged.'},{status:503});}
}

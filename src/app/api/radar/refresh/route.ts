import {isSignedIn} from '@/lib/auth';
import {refreshStoredRadar} from '@/lib/radar-refresh';
export const maxDuration=240;
export async function POST(req:Request) {
 if(!await isSignedIn())return Response.json({error:'Sign in to refresh releases.'},{status:401});
 const origin=req.headers.get('origin');
 // Next can use localhost internally even when the browser requested 127.0.0.1.
 const host=req.headers.get('host')||new URL(req.url).host;
 if(origin){try{if(new URL(origin).host!==host)return Response.json({error:'Refresh from the Daymark page.'},{status:403});}catch{return Response.json({error:'Invalid origin.'},{status:403});}}
 try{const input=await req.json();return Response.json(await refreshStoredRadar({force:input.force===true}),{headers:{'Cache-Control':'no-store'}});}
 catch{console.error('Radar refresh failed');return Response.json({error:'Radar could not refresh. Saved dates are unchanged.'},{status:503});}
}

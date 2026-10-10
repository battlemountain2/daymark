import {isSignedIn} from '@/lib/auth';
import {getMail,mailSchema} from '@/lib/gmail';
import {gmailOrigin,gmailRedirectUri} from '@/lib/gmail-settings';
import {db} from '@/lib/db';
export async function GET(req:Request){if(!await isSignedIn())return new Response(null,{status:401});try{return Response.json({...await getMail(),redirectUri:gmailRedirectUri(req)},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Inbox unavailable. Try again shortly.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
export async function DELETE(req:Request){if(!await isSignedIn())return new Response(null,{status:401});if(req.headers.get('origin')!==gmailOrigin(req))return new Response(null,{status:403});let email:unknown;try{({email}=await req.json());}catch{return new Response(null,{status:400});}if(typeof email!=='string'||email.length>320)return new Response(null,{status:400});await mailSchema();await db().execute({sql:'DELETE FROM gmail_accounts WHERE email=?',args:[email]});return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});}

import {cookies} from 'next/headers';
import {randomBytes,createHash} from 'node:crypto';
import {isSignedIn} from '@/lib/auth';
import {seal} from '@/lib/integration-crypto';
import {gmailOrigin,gmailRedirectUri,gmailCookieSecure,gmailReturnUrl,GMAIL_STATE_TTL_SECONDS} from '@/lib/gmail-settings';
export async function GET(req:Request){
 if(!await isSignedIn())return new Response(null,{status:401});
 if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET)return Response.redirect(gmailReturnUrl(gmailOrigin(req),'setup'));
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const redirectUri=gmailRedirectUri(req);
 (await cookies()).set('daymark_gmail_state',seal(JSON.stringify({state,verifier,redirectUri,expires:Date.now()+GMAIL_STATE_TTL_SECONDS*1000})),{httpOnly:true,secure:gmailCookieSecure(req),sameSite:'lax',path:'/api/gmail',maxAge:GMAIL_STATE_TTL_SECONDS});
 const params=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:redirectUri,response_type:'code',scope:'https://www.googleapis.com/auth/gmail.readonly',access_type:'offline',prompt:'consent select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

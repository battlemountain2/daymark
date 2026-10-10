import {cookies} from 'next/headers';
import {isSignedIn} from '@/lib/auth';
import {unseal} from '@/lib/integration-crypto';
import {google,saveAccount,GoogleRequestError} from '@/lib/gmail';
import {gmailOrigin,gmailRedirectUri,gmailCookieSecure,gmailCallbackState,gmailReturnUrl,GmailConnectionError} from '@/lib/gmail-settings';

export async function GET(req:Request){
 const jar=await cookies(),raw=jar.get('daymark_gmail_state')?.value;
 jar.set('daymark_gmail_state','',{path:'/api/gmail',maxAge:0,httpOnly:true,secure:gmailCookieSecure(req),sameSite:'lax'});
 const url=new URL(req.url);
 let stage='state_invalid',reason:string|undefined,result='failed';
 try{
  if(!await isSignedIn())throw new GmailConnectionError('signin');
  if(!raw)throw new GmailConnectionError('state_missing');
  const saved=gmailCallbackState(JSON.parse(unseal(raw)),url.searchParams,gmailRedirectUri(req));
  stage='token_exchange';
  const token=await google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||'',client_secret:process.env.GOOGLE_CLIENT_SECRET||'',code:saved.code,redirect_uri:saved.redirectUri,grant_type:'authorization_code',code_verifier:saved.verifier})});
  stage='permissions';
  if(!token.refresh_token||!token.access_token||!String(token.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.readonly'))throw new GmailConnectionError(stage);
  stage='profile';
  const profile=await google('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:`Bearer ${token.access_token}`}});
  if(typeof profile.emailAddress!=='string'||!profile.emailAddress.includes('@'))throw new GmailConnectionError(stage);
  stage='save';
  await saveAccount(profile.emailAddress,token.refresh_token);
  result='connected';
 }catch(error){
  reason=error instanceof GmailConnectionError?error.reason:stage;
  // Never log the request URL, authorization code, state, token, or email content.
  console.warn('[gmail/callback]',JSON.stringify({reason,...(error instanceof GoogleRequestError?{httpStatus:error.status,googleCode:error.code}: {})}));
 }
 return Response.redirect(gmailReturnUrl(gmailOrigin(req),result,reason));
}

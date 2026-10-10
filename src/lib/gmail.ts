import { db } from '@/lib/db';
import {seal,unseal} from '@/lib/integration-crypto';
export {gmailOrigin} from '@/lib/gmail-settings';
export async function mailSchema(){await db().execute('CREATE TABLE IF NOT EXISTS gmail_accounts (email TEXT PRIMARY KEY, token TEXT NOT NULL)');}
export class GoogleRequestError extends Error {
 constructor(public status:number,public code:string){super('Google request failed');}
}
export async function google(url:string,init:RequestInit){
 const r=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!r.ok){
  let code='unknown';
  try{const data=await r.json();const value=typeof data.error==='string'?data.error:data.error?.status;
   if(['invalid_client','invalid_grant','access_denied','invalid_request','PERMISSION_DENIED','UNAUTHENTICATED'].includes(value))code=value;
  }catch{}
  throw new GoogleRequestError(r.status,code);
 }
 return r.json();
}
export async function saveAccount(email:string,token:string){await mailSchema();await db().execute({sql:'INSERT INTO gmail_accounts(email,token) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET token=excluded.token',args:[email,seal(token)]});}
export async function getMail(){
 await mailSchema();const rows=(await db().execute('SELECT email,token FROM gmail_accounts')).rows;
 const accounts=await Promise.all(rows.map(async row=>{const email=String(row.email);try{
  const token=await google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||'',client_secret:process.env.GOOGLE_CLIENT_SECRET||'',refresh_token:unseal(String(row.token)),grant_type:'refresh_token'})});
  const headers={Authorization:`Bearer ${token.access_token}`};
  const list=await google('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12&q=in%3Ainbox%20-category%3Apromotions%20-category%3Asocial',{headers});
  const messages=await Promise.all((list.messages||[]).map(async (m:{id:string})=>{
   const data=await google(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,{headers});
   const header=(name:string)=>data.payload?.headers?.find((h:{name:string;value:string})=>h.name.toLowerCase()===name.toLowerCase())?.value||'';
   return {id:m.id,from:header('From'),subject:header('Subject')||'(No subject)',snippet:data.snippet||'',date:new Date(Number(data.internalDate)).toISOString(),starred:data.labelIds?.includes('STARRED')||false,important:data.labelIds?.includes('IMPORTANT')||false,unread:data.labelIds?.includes('UNREAD')||false,url:`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email)}#all/${m.id}`};
  }));messages.sort((a: {starred:boolean;important:boolean;unread:boolean},b: {starred:boolean;important:boolean;unread:boolean})=>Number(b.starred)*4+Number(b.important)*2+Number(b.unread)-Number(a.starred)*4-Number(a.important)*2-Number(a.unread));return {email,messages,error:null};
 }catch{return {email,messages:[],error:'Reconnect this account to refresh your inbox.'};}}));
 return {configured:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),accounts,refreshedAt:new Date().toISOString()};
}

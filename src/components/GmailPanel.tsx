"use client";
import {useEffect,useRef,useState} from 'react';
import {mailPreview,mailSender} from '@/lib/mail-display';
import {gmailConnectionMessage} from '@/lib/gmail-settings';
import {usePersonalRecords} from '@/lib/use-personal-records';
import {GMAIL_DISMISSED_KEY,gmailMessageKey,visibleGmailMessages,dismissedGmailMessage,gmailMessageUrl,type DismissedMail} from '@/lib/gmail-dismissals';
type Mail={id:string;from:string;subject:string;snippet:string;url:string;date:string;starred:boolean;important:boolean;unread:boolean};
type Inbox={configured:boolean;accounts:{email:string;messages:Mail[];error:string|null}[];refreshedAt:string;redirectUri:string};
export default function GmailPanel({onCapture}:{onCapture?:(seed:{title:string;url:string})=>void}){
 const [inbox,setInbox]=useState<Inbox|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const [expanded,setExpanded]=useState(false);
 const [lastDismissed,setLastDismissed]=useState<string|null>(null),[actionFeedback,setActionFeedback]=useState('');
 const dismissed=usePersonalRecords<DismissedMail>(GMAIL_DISMISSED_KEY);
 const setup=useRef<HTMLDetailsElement>(null),undoButton=useRef<HTMLButtonElement>(null),refreshButton=useRef<HTMLButtonElement>(null);
 async function refresh(){setBusy(true);setError('');try{const r=await fetch('/api/gmail');if(!r.ok)throw Error();setInbox(await r.json());}catch{setError('Inbox unavailable. Try refreshing.');}finally{setBusy(false);}}
 useEffect(()=>{void refresh();const params=new URLSearchParams(window.location.search),status=params.get('gmail');if(status)setFeedback(gmailConnectionMessage(status,params.get('gmail_reason')));},[]);
 async function disconnect(email:string){setBusy(true);try{const r=await fetch('/api/gmail',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});if(!r.ok)throw Error();await refresh();}catch{setError('Could not disconnect. Try again.');}finally{setBusy(false);}}
 function dismiss(account:string,message:Mail){
  const key=gmailMessageKey(account,message.id);
  if(dismissed.write(key,dismissedGmailMessage(account,message))){
   setLastDismissed(key);setActionFeedback('Email dismissed from Daymark.');
   requestAnimationFrame(()=>undoButton.current?.focus());
  }
 }
 function restore(key:string){
  if(dismissed.write(key,null)){
   if(lastDismissed===key)setLastDismissed(null);
   setActionFeedback('Dismissal removed.');
   requestAnimationFrame(()=>refreshButton.current?.focus());
  }
 }
 const accounts=new Set(inbox?.accounts.map(a=>a.email.toLowerCase())||[]);
 const hidden=Object.entries(dismissed.records).filter(([,m])=>m&&accounts.has(m.account)).sort(([,a],[,b])=>b.dismissedAt.localeCompare(a.dismissedAt));
 const quiet=!!inbox&&inbox.accounts.every(account=>!visibleGmailMessages(account.email,account.messages,dismissed.records).length);
 return <section className={`card span12 gmail-card${quiet?" gmail-quiet":""}`}>
  <div className="card-head"><h2>Worth opening</h2><button ref={refreshButton} type="button" disabled={busy} onClick={refresh}>{busy?'Refreshing…':'Refresh'}</button></div>
  <div className="card-body">
   {feedback&&<p role="status" className="sub">{feedback}</p>}
   {error&&<p role="alert">{error}</p>}
   {dismissed.error&&<p role="alert">Could not load or save dismissed emails on this device. Please try again.</p>}
   {actionFeedback&&<div role="status" className="gmail-feedback"><span>{actionFeedback}</span>{lastDismissed&&dismissed.records[lastDismissed]&&<button ref={undoButton} type="button" aria-label="Undo email dismissal" onClick={()=>restore(lastDismissed)}>Undo</button>}</div>}
   <div className="inbox-accounts">{inbox?.accounts.map(account=>{
    const visible=visibleGmailMessages(account.email,account.messages,dismissed.records).slice(0,expanded?12:2);
    return <div className="inbox-account" key={account.email}>
     <div className="mail-account"><span className="mono sub">{account.email}</span></div>
     {account.error?<p className="sub">{account.error}</p>:visible.length?visible.map(m=><article key={m.id} className={m.unread ? "mail-unread" : undefined}>
      <a className="personal-item" href={m.url} target="_blank" rel="noreferrer"><span className="sub">{m.starred?'★ ':''}{mailSender(m.from)}</span><strong>{m.subject}</strong><span className="sub">{mailPreview(m.snippet)}</span><span className="mono sub">{new Date(m.date).toLocaleDateString()} · open in Gmail ↗</span></a>
      <div className="gmail-message-actions">{onCapture&&<button type="button" onClick={()=>onCapture({title:`${m.subject}\n${mailPreview(m.snippet)}`,url:m.url})}>Capture</button>}<button type="button" aria-label={`Dismiss ${m.subject} from Daymark`} onClick={()=>dismiss(account.email,m)}>Dismiss</button></div>
     </article>):<p className="sub">No emails to show.</p>}
    </div>;
   })}</div>
   {inbox?.accounts.some(a=>visibleGmailMessages(a.email,a.messages,dismissed.records).length>2)&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"Show less":"More emails"}</button>}
   {hidden.length>0&&<details className="personal-setup gmail-dismissed">
    <summary>Dismissed emails ({hidden.length})</summary>
    <p className="sub">Hidden only in Daymark.</p>
    {hidden.map(([key,m])=><div className="gmail-dismissed-item" key={key}>
     <strong>{m.subject}</strong><span className="sub">{m.account} · {new Date(m.date).toLocaleDateString()}</span>
     <div className="gmail-message-actions"><a href={gmailMessageUrl(m.account,m.id)} target="_blank" rel="noreferrer">Open in Gmail ↗</a><button type="button" aria-label={`Restore ${m.subject} to Daymark`} onClick={()=>restore(key)}>Restore</button></div>
    </div>)}
   </details>}
   {!inbox?.accounts.length&&<p className="sub">{!inbox?'Loading your inbox…':inbox.configured?'Connect Gmail to see your inbox.':'Gmail is not set up here yet.'}</p>}
   <details className="personal-setup"><summary>Accounts & connection</summary>
   {inbox?.accounts.map(a=><p key={a.email}><span className="mono sub">{a.email}</span> <button type="button" disabled={busy} onClick={()=>disconnect(a.email)}>Disconnect</button></p>)}
   {inbox?.configured?<a className="personal-action" href="/api/gmail/connect">{inbox.accounts.length?'Connect another Gmail':'Connect Gmail'}</a>:<button type="button" disabled={!inbox} onClick={()=>{if(setup.current)setup.current.open=true;}}>Set up Gmail</button>}
   <details ref={setup} className="personal-setup"><summary>Connection setup</summary>{inbox&&!inbox.configured&&<p className="sub">This environment needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. For a local preview, add them to .env.local and restart Daymark. Keys saved only in Vercel Production apply to the deployed site.</p>}<p className="sub">Register this authorized redirect URI on your Google web OAuth client:</p>{inbox?.redirectUri?<code>{inbox.redirectUri}</code>:<p className="sub">Refresh the inbox to load this environment’s callback URL.</p>}<p className="sub">Connecting happens in Google’s account picker. Email content is not sent to an AI model.</p></details></details>
  </div>
 </section>;
}

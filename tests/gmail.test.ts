import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gmailOrigin, gmailRedirectUri, gmailCookieSecure, gmailCallbackState, gmailReturnUrl, gmailConnectionMessage, GmailConnectionError} from '../src/lib/gmail-settings';
import {getMail, saveAccount, google, GoogleRequestError} from '../src/lib/gmail';
import {db} from '../src/lib/db';
import {GMAIL_DISMISSED_KEY,gmailMessageKey,visibleGmailMessages,dismissedGmailMessage,gmailMessageUrl,type DismissedMail} from '../src/lib/gmail-dismissals';
import {SYNC_KEYS} from '../src/lib/sync-contract';
import {applyRecords,readRecords} from '../src/lib/sync-db';

test('Gmail callback keeps the local port, rejects untrusted request hosts, and secures remote cookies', () => {
  const previous = process.env.DAYMARK_URL;
  try {
    delete process.env.DAYMARK_URL;
    const local = new Request('http://127.0.0.1:3001/api/gmail/connect');
    assert.equal(gmailRedirectUri(local), 'http://127.0.0.1:3001/api/gmail/callback');
    assert.equal(gmailCookieSecure(local), false);
    assert.equal(gmailRedirectUri(new Request('http://localhost:3001/api/gmail', {
      headers:{host:'127.0.0.1:3001'},
    })), 'http://127.0.0.1:3001/api/gmail/callback');
    assert.equal(gmailOrigin(new Request('http://localhost:3001/api/gmail', {
      headers:{host:'attacker.example', 'x-forwarded-host':'127.0.0.1:3001'},
    })), 'https://hey-brayan.vercel.app');
    assert.equal(gmailOrigin(new Request('https://attacker.example/api/gmail/connect')), 'https://hey-brayan.vercel.app');
    assert.equal(gmailCookieSecure(new Request('https://hey-brayan.vercel.app/api/gmail/connect')), true);
    process.env.DAYMARK_URL = 'https://daymark.example/';
    assert.equal(gmailRedirectUri(local), 'https://daymark.example/api/gmail/callback');
    process.env.DAYMARK_URL = 'http://attacker.example';
    assert.throws(() => gmailOrigin(local));
    process.env.DAYMARK_URL = 'https://user:password@daymark.example';
    assert.throws(() => gmailOrigin(local));
  } finally {
    if (previous === undefined) delete process.env.DAYMARK_URL;
    else process.env.DAYMARK_URL = previous;
  }
});

test('Gmail decrypts stored tokens, ranks messages, keeps source links, and isolates account failures', async () => {
  process.env.TURSO_DATABASE_URL = `file:${join(await mkdtemp(join(tmpdir(), 'daymark-gmail-test-')), 'test.db')}`;
  process.env.TURSO_AUTH_TOKEN = '';
  process.env.SESSION_SECRET = 'synthetic-test-secret';
  process.env.GOOGLE_CLIENT_ID = 'synthetic-client';
  process.env.GOOGLE_CLIENT_SECRET = 'synthetic-secret';
  await saveAccount('test@example.com', 'synthetic-refresh');
  await saveAccount('broken@example.com', 'revoked-refresh');
  const stored = await db().execute('SELECT token FROM gmail_accounts');
  assert.ok(stored.rows.every(row => !String(row.token).includes('refresh')));
  const originalFetch = globalThis.fetch;
  let metadataReads = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'oauth2.googleapis.com') {
      assert.equal(init?.method, 'POST');
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get('grant_type'), 'refresh_token');
      assert.equal(body.get('client_id'), 'synthetic-client');
      if (body.get('refresh_token') === 'revoked-refresh') return new Response('', {status:401});
      assert.equal(body.get('refresh_token'), 'synthetic-refresh');
      return Response.json({access_token:'synthetic-access'});
    }
    assert.equal(url.hostname, 'gmail.googleapis.com');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer synthetic-access');
    assert.ok(!init?.method || init.method === 'GET', 'Inbox reading must not mutate Gmail');
    if (url.pathname.endsWith('/messages')) {
      assert.equal(url.searchParams.get('q'), 'in:inbox -category:promotions -category:social');
      return Response.json({messages:[{id:'plain'},{id:'starred'},{id:'unread'}]});
    }
    metadataReads++;
    assert.equal(url.searchParams.get('format'), 'metadata');
    const id = url.pathname.split('/').at(-1);
    return Response.json({
      internalDate:'1791043200000', snippet:'Synthetic capture text',
      labelIds:id === 'starred' ? ['STARRED'] : id === 'unread' ? ['UNREAD'] : [],
      payload:{headers:[{name:'From',value:'Sender <sender@example.com>'},{name:'Subject',value:`Test ${id}`}]},
    });
  };
  try {
    const result = await getMail();
    assert.equal(result.configured, true);
    const working = result.accounts.find(account => account.email === 'test@example.com')!;
    assert.equal(working.error, null);
    assert.deepEqual(working.messages.map(message => message.id), ['starred','unread','plain']);
    assert.equal(working.messages[0].subject, 'Test starred');
    assert.equal(working.messages[0].snippet, 'Synthetic capture text');
    assert.equal(working.messages[0].url, 'https://mail.google.com/mail/u/?authuser=test%40example.com#all/starred');
    assert.equal(metadataReads, 3);
    assert.match(result.accounts.find(account => account.email === 'broken@example.com')!.error!, /Reconnect/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('Gmail handshake rejects expired or mismatched state before token exchange and returns to the inbox', () => {
  const redirectUri='https://hey-brayan.vercel.app/api/gmail/callback';
  const saved={state:'synthetic-state',verifier:'v'.repeat(43),redirectUri,expires:5100};
  const params=new URLSearchParams({state:saved.state,code:'synthetic-code'});
  assert.deepEqual(gmailCallbackState(saved,params,redirectUri,5000),{code:'synthetic-code',verifier:saved.verifier,redirectUri});
  const rejected=(reason:string)=>(error:unknown)=>error instanceof GmailConnectionError&&error.reason===reason;
  assert.throws(()=>gmailCallbackState(saved,params,redirectUri,5100),rejected('expired'));
  assert.throws(()=>gmailCallbackState(saved,new URLSearchParams({state:'wrong',code:'synthetic-code'}),redirectUri,5000),rejected('state_invalid'));
  assert.throws(()=>gmailCallbackState(saved,params,'https://another.example/api/gmail/callback',5000),rejected('state_invalid'));
  assert.throws(()=>gmailCallbackState({...saved,verifier:undefined},params,redirectUri,5000),rejected('state_invalid'));
  assert.throws(()=>gmailCallbackState(saved,new URLSearchParams({state:saved.state,error:'access_denied'}),redirectUri,5000),rejected('denied'));
  assert.throws(()=>gmailCallbackState(saved,new URLSearchParams({state:saved.state}),redirectUri,5000),rejected('code_missing'));
  const returned=new URL(gmailReturnUrl('https://hey-brayan.vercel.app','failed','state_missing'));
  assert.equal(returned.searchParams.get('space'),'main');
  assert.equal(returned.hash,'#gmail');
  assert.deepEqual([...returned.searchParams.keys()],['space','gmail','gmail_reason']);
  assert.match(gmailConnectionMessage('failed','state_missing'),/finish within 10 minutes/);
  assert.doesNotMatch(gmailConnectionMessage('failed','token_exchange'),/callback URL/);
});

test('Google failures expose only a bounded status/code, never arbitrary provider error text', async () => {
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>Response.json({error:'invalid_client',error_description:'secret value must never enter logs'},{status:401});
    await assert.rejects(()=>google('https://oauth2.googleapis.com/token',{}),error=>error instanceof GoogleRequestError&&error.status===401&&error.code==='invalid_client'&&!JSON.stringify(error).includes('secret value'));
    globalThis.fetch=async()=>Response.json({error:'sensitive-provider-value',error_description:'private description'},{status:400});
    await assert.rejects(()=>google('https://oauth2.googleapis.com/token',{}),error=>error instanceof GoogleRequestError&&error.code==='unknown'&&!JSON.stringify(error).includes('sensitive-provider-value'));
  } finally {globalThis.fetch=originalFetch;}
});
test('Dismissals are scoped to account/message, reveal the next candidate, and retain a Gmail source link', () => {
  const messages=Array.from({length:6},(_,i)=>({id:`id-${i}`,subject:'Same subject',date:'2026-10-04T20:00:00Z'}));
  const account='first@example.com';
  const record=dismissedGmailMessage(account,messages[0],'2026-10-04T21:00:00Z');
  const dismissed={[gmailMessageKey(account,messages[0].id)]:record};
  assert.deepEqual(visibleGmailMessages(account,messages,dismissed).slice(0,4).map(m=>m.id),['id-1','id-2','id-3','id-4']);
  assert.equal(visibleGmailMessages('second@example.com',messages,dismissed).length,6);
  assert.equal(visibleGmailMessages('FIRST@example.com',messages,dismissed).length,5);
  assert.equal(visibleGmailMessages(account,messages,{}).length,6);
  assert.notEqual(gmailMessageKey('first:account@example.com','a:b'),gmailMessageKey('first:account@example.com:a','b'));
  assert.equal(gmailMessageUrl(account,messages[0].id),'https://mail.google.com/mail/u/?authuser=first%40example.com#all/id-0');
  assert.ok(!('snippet' in record),'Dismissal does not retain the email body or snippet');
});

test('Dismissal and restore persist through shared records without touching Gmail accounts', async () => {
  assert.ok((SYNC_KEYS as readonly string[]).includes(GMAIL_DISMISSED_KEY));
  const account='test@example.com',message={id:'synthetic-message',subject:'Synthetic dismissal',date:'2026-10-04T20:00:00Z'};
  const key=gmailMessageKey(account,message.id),before=await db().execute('SELECT email,token FROM gmail_accounts ORDER BY email');
  await applyRecords([{namespace:GMAIL_DISMISSED_KEY,key,value:JSON.stringify(dismissedGmailMessage(account,message)),version:0,operation:'gmail-dismiss-test'}]);
  const saved=(await readRecords()).find(r=>r.namespace===GMAIL_DISMISSED_KEY&&r.key===key)!;
  const secondClient:Record<string,DismissedMail>={[saved.key]:JSON.parse(saved.value!)};
  assert.equal(visibleGmailMessages(account,[message],secondClient).length,0);
  await applyRecords([{namespace:GMAIL_DISMISSED_KEY,key,value:null,version:saved.version,operation:'gmail-restore-test'}]);
  const restored=(await readRecords()).find(r=>r.namespace===GMAIL_DISMISSED_KEY&&r.key===key)!;
  assert.equal(restored.value,null);
  assert.equal(restored.version,saved.version+1);
  assert.deepEqual((await db().execute('SELECT email,token FROM gmail_accounts ORDER BY email')).rows,before.rows);
});
after(() => db().close());

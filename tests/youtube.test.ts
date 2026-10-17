import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { selectedChannels, durationMinutes, youtubeImage, YOUTUBE_SCOPE } from "../src/lib/youtube-contract";
import { youtubeCallbackState, youtubeRedirectUri } from "../src/lib/youtube-settings";
import { saveYouTubeAccount, setYouTubeChannels, youtubeFeed, youtubeSubscriptions, youtubeStatus, youtubeRequest, disconnectYouTube } from "../src/lib/youtube";
import { sameOriginRequest } from "../src/lib/request-origin";
import { connectionChecks, recordConnectionCheck } from "../src/lib/connection-health";
import { SYNC_KEYS, splitRecords, joinRecords } from "../src/lib/sync-contract";

const id = `UC${"a".repeat(22)}`, other = `UC${"b".repeat(22)}`;
test("OAuth starts on the registered origin before reading a session or setting state", async () => {
  const previous = process.env.DAYMARK_URL;
  delete process.env.DAYMARK_URL;
  try {
    const { GET } = await import("../src/app/api/youtube/connect/route");
    const result = await GET(new Request("https://daymark-bry8.vercel.app/api/youtube/connect"));
    assert.equal(result.status, 302);
    assert.equal(result.headers.get("location"), "https://hey-brayan.vercel.app/connections?youtube=origin");
    assert.equal(result.headers.get("set-cookie"), null);
  } finally {
    if (previous === undefined) delete process.env.DAYMARK_URL;
    else process.env.DAYMARK_URL = previous;
  }
});
test("YouTube validates channel selection, provider artwork, duration and separate callback", () => {
  assert.deepEqual(selectedChannels([id,id]), [id]);
  assert.throws(() => selectedChannels(["https://untrusted.test"]));
  assert.throws(() => selectedChannels(Array(21).fill(id)));
  assert.equal(durationMinutes("PT1H2M30S"), 63);
  assert.equal(durationMinutes("bad"), null);
  assert.equal(youtubeImage("https://i.ytimg.com/vi/test/mqdefault.jpg"), "https://i.ytimg.com/vi/test/mqdefault.jpg");
  assert.equal(youtubeImage("https://i.ytimg.com.evil.test/a"), null);
  const request = new Request("http://localhost:3081/api/youtube/connect");
  assert.equal(youtubeRedirectUri(request), "http://localhost:3081/api/youtube/callback");
  const saved = { state: "one", verifier: "a".repeat(43), redirectUri: youtubeRedirectUri(request), expires: 2000 };
  assert.throws(() => youtubeCallbackState(saved, new URLSearchParams({state:"wrong",code:"secret"}), saved.redirectUri,1000));
  assert.throws(() => youtubeCallbackState(saved, new URLSearchParams({state:"one",code:"secret"}), saved.redirectUri,2000));
  assert.equal(youtubeCallbackState(saved,new URLSearchParams({state:"one",code:"secret"}),saved.redirectUri,1000).code,"secret");
  assert.equal(sameOriginRequest(new Request("https://daymark.test/api/youtube",{headers:{origin:"https://other.test"}})),false);
  assert.equal(sameOriginRequest(new Request("https://daymark.test/api/youtube",{headers:{origin:"https://daymark.test"}})),true);
  assert.ok(YOUTUBE_SCOPE.endsWith("youtube.readonly"));
});

test("YouTube encrypts tokens, caches bounded feeds, keeps last good data on provider failure and isolates reconnects", async () => {
  process.env.TURSO_DATABASE_URL = `file:${join(await mkdtemp(join(tmpdir(),"daymark-youtube-")),"test.db")}`;
  process.env.SESSION_SECRET = "youtube-test-secret";
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  const original = globalThis.fetch;
  const requests: string[] = [];
  let fail = false;
  globalThis.fetch = async input => {
    const url = String(input); requests.push(url);
    if (fail) return Response.json({error:{errors:[{reason:"quotaExceeded"}],message:"do-not-leak-private-detail"}},{status:403});
    if (url.includes("oauth2.googleapis.com")) return Response.json({access_token:"test-access"});
    if (url.includes("subscriptions?")) return Response.json({items:[{snippet:{title:"Test channel",resourceId:{channelId:id}}}]});
    if (url.includes("channels?")) return Response.json({items:[{contentDetails:{relatedPlaylists:{uploads:"uploads"}}}]});
    if (url.includes("playlistItems?")) return Response.json({items:[{contentDetails:{videoId:"abcdefghijk"}}]});
    if (url.includes("videos?")) return Response.json({items:[{id:"abcdefghijk",snippet:{title:"Test video",channelId:id,channelTitle:"Test channel",publishedAt:"2026-10-16T10:00:00Z",thumbnails:{medium:{url:"https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"}}},contentDetails:{duration:"PT8M30S"},status:{privacyStatus:"public"}}]});
    throw Error("Unexpected endpoint");
  };
  try {
    await saveYouTubeAccount({id,title:"Test account",image:null},"test-refresh-secret");
    const row=(await db().execute("SELECT token FROM youtube_account")).rows[0];
    assert.ok(!String(row.token).includes("test-refresh-secret"));
    await setYouTubeChannels([id]);
    const subscriptions=await youtubeSubscriptions();
    assert.equal(subscriptions.data[0].id,id);
    const feed=await youtubeFeed();
    assert.equal(feed.data.length,1);
    assert.equal(feed.data[0].minutes,9);
    assert.equal(feed.data[0].url,"https://www.youtube.com/watch?v=abcdefghijk");
    const count=requests.length;
    await youtubeFeed();
    assert.equal(requests.length,count,"cached reads must not consume provider quota");
    await db().execute("UPDATE youtube_cache SET expires=0");
    fail=true;
    const stale=await youtubeFeed();
    assert.equal(stale.stale,true);
    assert.equal(stale.data[0].id,"abcdefghijk");
    assert.ok("warning" in stale && !String(stale.warning).includes("do-not-leak"));
    await assert.rejects(youtubeRequest("https://www.googleapis.com/test"),/allowance/);
    fail=false;
    await saveYouTubeAccount({id,title:"Renamed account",image:null},"new-token");
    assert.deepEqual((await youtubeStatus()).selected,[id]);
    await saveYouTubeAccount({id:other,title:"Other account",image:null},"other-token");
    assert.deepEqual((await youtubeStatus()).selected,[]);
    await recordConnectionCheck("youtube",null,"2026-10-16T10:00:00Z");
    await recordConnectionCheck("youtube","Reconnect YouTube.","2026-10-16T11:00:00Z");
    assert.equal((await connectionChecks()).youtube.succeededAt,"2026-10-16T10:00:00Z");
    assert.equal((await connectionChecks()).youtube.error,"Reconnect YouTube.");
    await disconnectYouTube();
    assert.equal((await youtubeStatus()).account,null);
    assert.equal((await db().execute("SELECT * FROM youtube_cache")).rows.length,0);
    assert.ok((SYNC_KEYS as readonly string[]).includes("daymark:youtube"));
    const choice=JSON.stringify({abcdefghijk:{...feed.data[0],saved:true}});
    assert.deepEqual(JSON.parse(joinRecords("daymark:youtube",splitRecords("daymark:youtube",choice))),JSON.parse(choice));
  } finally { globalThis.fetch=original; }
});
after(() => db().close());

/**
 * Reproduces exactly what the app does, so the error you see here is the error
 * the panel would show. Run with your key in the environment — it is never
 * printed, only its verdict.
 */
async function main(){
  const key = process.env.LASTFM_API_KEY;
  const user = process.env.LASTFM_USER ?? "adox23";
  if (!key) { console.log("LASTFM_API_KEY not set in this shell."); return; }
  console.log(`key length ${key.length} (expect 32), user "${user}"`);
  for (const m of ["user.getinfo","user.getrecenttracks","user.gettopartists"]) {
    const q = new URLSearchParams({ method:m, user, api_key:key, format:"json", limit:"1" });
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?${q}`, {headers:{"User-Agent":"daymark/1.0"}});
    const j: any = await r.json();
    console.log(`  ${m.padEnd(22)} http ${r.status} ${j?.error ? `→ error ${j.error}: ${j.message}` : "→ ok"}`);
  }
}
main();

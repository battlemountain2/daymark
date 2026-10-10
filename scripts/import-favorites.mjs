// Import an explicitly selected Finder folder through Daymark's authenticated API.
// Originals are read only. JPEG copies omit EXIF/location metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import nextEnv from '@next/env';
import sharp from 'sharp';
const args=process.argv.slice(2);
const option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const source=option('--source');
const origin=new URL(option('--origin') || 'http://127.0.0.1:3001');
if (!source || !args.includes('--import')) {
  console.log('Usage: node scripts/import-favorites.mjs --source /absolute/Favorites --origin http://127.0.0.1:3001 --import');
  process.exit(source?0:1);
}
if (!path.isAbsolute(source) || origin.username || origin.password || origin.pathname!=='/' || origin.search || origin.hash ||
    !(origin.origin==='https://hey-brayan.vercel.app' || (['127.0.0.1','localhost'].includes(origin.hostname) && origin.protocol==='http:'))) {
  throw Error('Use an absolute folder and the known Daymark site or a local loopback origin.');
}
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.APP_PASSPHRASE) throw Error('APP_PASSPHRASE is missing.');
const login=await fetch(new URL('/api/auth',origin), {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({passphrase:process.env.APP_PASSPHRASE}),signal:AbortSignal.timeout(15000)});
if (!login.ok) throw Error('Daymark authentication failed.');
const cookie=login.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw Error('Daymark did not return a session.');
const before=await fetch(new URL('/api/files',origin),{headers:{cookie},signal:AbortSignal.timeout(15000)});
if (!before.ok) throw Error('This Daymark site does not have private photo storage ready.');
const entries=await fs.readdir(source,{withFileTypes:true});
const allImages=entries.filter(f=>f.isFile() && /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name));
const only=option('--only') ? JSON.parse(option('--only')) : null;
if (only && (!Array.isArray(only) || only.some(name=>typeof name!=='string' || !allImages.some(file=>file.name===name)))) throw Error('--only must name photos in the selected folder.');
const images=only ? allImages.filter(file=>only.includes(file.name)) : allImages;
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-favorites-'));
const run=promisify(execFile), failures=[];
let imported=0, converted=0;
try {
  for (const [index,file] of images.entries()) {
    try {
      let input=path.join(source,file.name);
      if (/\.hei[cf]$/i.test(file.name)) {
        const prepared=path.join(temporary,`${index}.jpg`);
        await run('/usr/bin/sips',['-s','format','jpeg',input,'--out',prepared],{timeout:30000});
        input=prepared; converted++;
      }
      const copy=await sharp(input).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
      if(copy.length>3.5*1024*1024) throw Error('Prepared copy exceeds the upload limit.');
      const response=await fetch(new URL('/api/files',origin),{method:'POST',headers:{cookie,'x-file-name':encodeURIComponent(file.name.replace(/\.[^.]+$/,'.jpg')),'x-file-course':'Favorites'},body:copy,signal:AbortSignal.timeout(60000)});
      if(!response.ok) throw Error(`Upload returned ${response.status}.`);
      imported++;
    } catch (error) { failures.push({file:file.name,error:error.message}); }
    if ((index+1)%10===0 || index+1===images.length) console.log(JSON.stringify({processed:index+1,total:images.length,imported,failed:failures.length}));
  }
  const result=await fetch(new URL('/api/files',origin),{headers:{cookie},signal:AbortSignal.timeout(15000)});
  const data=await result.json();
  if(!result.ok) throw Error('Could not verify the private collection.');
  console.log(JSON.stringify({imported,heicConverted:converted,skippedNonPhotos:entries.filter(f=>f.isFile()).length-allImages.length,privateFavorites:data.files.filter(f=>f.course==='Favorites'&&f.type.startsWith('image/')).length,failures}));
  if(failures.length)process.exitCode=1;
} finally {
  await fs.rm(temporary,{recursive:true,force:true});
}

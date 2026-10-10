// Import explicitly selected PDFs as original private copies, then verify bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import nextEnv from '@next/env';
const args=process.argv.slice(2);
const option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const source=option('--source'),selection=option('--selection');
const origin=new URL(option('--origin')||'http://127.0.0.1:3001');
const course=option('--course')||'HIST 300';
if(!source||!selection||!args.includes('--import'))throw Error('Use --source /absolute/folder --selection /absolute/selected-files.json --course "HIST 300" --origin URL --import.');
if(!path.isAbsolute(source)||!path.isAbsolute(selection)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!(origin.origin==='https://hey-brayan.vercel.app'||(['127.0.0.1','localhost'].includes(origin.hostname)&&origin.protocol==='http:')))throw Error('Use absolute paths and the known Daymark site or a loopback origin.');
const names=JSON.parse(await fs.readFile(selection,'utf8'));
if(!Array.isArray(names)||!names.length||names.some(n=>typeof n!=='string'||path.basename(n)!==n||!n.toLowerCase().endsWith('.pdf')))throw Error('Selection must contain PDF basenames only.');
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.APP_PASSPHRASE)throw Error('APP_PASSPHRASE is missing.');
const login=await fetch(new URL('/api/auth',origin),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({passphrase:process.env.APP_PASSPHRASE}),signal:AbortSignal.timeout(15000)});
const cookie=login.headers.get('set-cookie')?.split(';')[0];
if(!login.ok||!cookie)throw Error('Daymark authentication failed.');
async function request(route,options={}){
 const response=await fetch(new URL(route,origin),{...options,headers:{cookie,...options.headers},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Daymark returned ${response.status}.`);
 return response;
}
const failures=[];
for(const name of names){
 try{
  const bytes=await fs.readFile(path.join(source,name));
  if(bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.length||bytes.length>25*1024*1024)throw Error('Choose a PDF under 25 MB.');
  let data;
  if(bytes.length<=3.5*1024*1024)data=await(await request('/api/files',{method:'POST',headers:{'x-file-name':encodeURIComponent(name),'x-file-course':encodeURIComponent(course)},body:bytes})).json();
  else{
   const start=await(await request('/api/files/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'start',name,course,size:bytes.length})})).json();
   for(let offset=0,part=0;offset<bytes.length;offset+=512*1024,part++)await request(`/api/files/upload?${new URLSearchParams({upload:start.upload,part:String(part)})}`,{method:'PUT',body:bytes.subarray(offset,offset+512*1024)});
   data=await(await request('/api/files/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'finish',upload:start.upload})})).json();
  }
  const stored=Buffer.from(await(await request(`/api/files/${data.id}`)).arrayBuffer());
  const hash=b=>createHash('sha256').update(b).digest('hex');
  if(hash(stored)!==hash(bytes)||data.id!==hash(bytes))throw Error('Stored PDF does not match the original.');
  const anonymous=await fetch(new URL(`/api/files/${data.id}`,origin),{signal:AbortSignal.timeout(15000)});
  if(anonymous.status!==401)throw Error('Private file access check failed.');
  console.log(JSON.stringify({name,bytes:bytes.length,verified:true,private:true}));
 }catch(error){failures.push({name,error:error.message});}
}
console.log(JSON.stringify({selected:names.length,verified:names.length-failures.length,failures}));
if(failures.length)process.exitCode=1;

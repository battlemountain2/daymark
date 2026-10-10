import {isSignedIn} from '@/lib/auth';
import {beginPdfUpload,putPdfPart,finishPdfUpload,PDF_PART_BYTES} from '@/lib/pdf-uploads';
import {listFiles} from '@/lib/private-files';
export const dynamic='force-dynamic';
async function authorized(req:Request){
 if(!await isSignedIn())return new Response(null,{status:401});
 try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==(req.headers.get('host')||new URL(req.url).host))return Response.json({error:'Please upload from Daymark itself.'},{status:403});}catch{return Response.json({error:'Invalid origin.'},{status:403});}
 return null;
}
async function limitedBody(req:Request,limit:number){
 const reader=req.body?.getReader();if(!reader)throw Error('No file supplied.');
 const parts:Uint8Array[]=[];let length=0;
 while(true){const{value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('Upload part is too large.');}parts.push(value);}
 const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;
}
export async function POST(req:Request){
 const rejected=await authorized(req);if(rejected)return rejected;
 try{
  const data=JSON.parse(new TextDecoder().decode(await limitedBody(req,2000)));
  if(data.action==='start'&&typeof data.name==='string'&&typeof data.course==='string'&&typeof data.size==='number')return Response.json({upload:await beginPdfUpload(data.name,data.course,data.size)},{headers:{'Cache-Control':'no-store'}});
  if(data.action==='finish'&&typeof data.upload==='string'){const id=await finishPdfUpload(data.upload);return Response.json({id,files:await listFiles(),storage:process.env.TURSO_DATABASE_URL?.startsWith('file:')?'local':'shared'},{headers:{'Cache-Control':'no-store'}});}
  return Response.json({error:'Invalid upload.'},{status:400});
 }catch{return Response.json({error:'Could not finish this PDF upload. Choose the file again and retry.'},{status:400});}
}
export async function PUT(req:Request){
 const rejected=await authorized(req);if(rejected)return rejected;
 try{const query=new URL(req.url).searchParams;const part=query.get('part');if(part===null||!/^\d+$/.test(part))throw Error();await putPdfPart(query.get('upload')||'',Number(part),await limitedBody(req,PDF_PART_BYTES));return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Could not save this PDF part. Choose the file again and retry.'},{status:400});}
}

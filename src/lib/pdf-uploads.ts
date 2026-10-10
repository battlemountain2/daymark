import {randomUUID} from 'node:crypto';
import {db} from './db';
import {saveFile} from './private-files';
export const PDF_PART_BYTES=512*1024,PDF_MAX_BYTES=25*1024*1024;
const TTL=60*60*1000;
export async function ensurePdfUploads(){await db().batch([
 'CREATE TABLE IF NOT EXISTS pdf_uploads(id TEXT PRIMARY KEY,name TEXT NOT NULL,course TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS pdf_upload_parts(upload_id TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(upload_id,part))',
 {sql:'DELETE FROM pdf_upload_parts WHERE upload_id IN(SELECT id FROM pdf_uploads WHERE created<?)',args:[Date.now()-TTL]},
 {sql:'DELETE FROM pdf_uploads WHERE created<?',args:[Date.now()-TTL]},
],'write');}
export async function beginPdfUpload(name:string,course:string,size:number){
 if(!name.trim()||name.length>240||course.length>80||!Number.isInteger(size)||size<5||size>PDF_MAX_BYTES)throw Error('Choose a PDF under 25 MB.');
 await ensurePdfUploads();
 const id=randomUUID();
 const tx=await db().transaction('write');
 try{const count=await tx.execute('SELECT COUNT(*) AS total FROM pdf_uploads');if(Number(count.rows[0].total)>=5)throw Error('Several uploads are unfinished. Try again later.');await tx.execute({sql:'INSERT INTO pdf_uploads(id,name,course,size,created) VALUES(?,?,?,?,?)',args:[id,name,course,size,Date.now()]});await tx.commit();return id;}catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
async function metadata(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid upload.');const result=await db().execute({sql:'SELECT * FROM pdf_uploads WHERE id=?',args:[id]});const row=result.rows[0];if(!row||Number(row.created)<Date.now()-TTL)throw Error('Upload expired. Choose the PDF again.');return row;}
export async function putPdfPart(id:string,part:number,bytes:Uint8Array){
 const meta=await metadata(id),size=Number(meta.size),parts=Math.ceil(size/PDF_PART_BYTES);
 if(!Number.isInteger(part)||part<0||part>=parts||bytes.length!==Math.min(PDF_PART_BYTES,size-part*PDF_PART_BYTES))throw Error('Incomplete PDF part.');
 if(part===0&&Buffer.from(bytes.subarray(0,5)).toString()!=='%PDF-')throw Error('Choose a PDF.');
 await db().execute({sql:'INSERT INTO pdf_upload_parts(upload_id,part,data) VALUES(?,?,?) ON CONFLICT(upload_id,part) DO UPDATE SET data=excluded.data',args:[id,part,bytes]});
}
export async function finishPdfUpload(id:string){
 const meta=await metadata(id),result=await db().execute({sql:'SELECT part,data FROM pdf_upload_parts WHERE upload_id=? ORDER BY part',args:[id]});
 const size=Number(meta.size),parts=Math.ceil(size/PDF_PART_BYTES);
 if(result.rows.length!==parts||result.rows.some((r,i)=>Number(r.part)!==i))throw Error('Some PDF parts are missing. Choose the PDF again.');
 const bytes=Buffer.concat(result.rows.map(r=>Buffer.from(r.data as ArrayBuffer)));
 if(bytes.length!==size)throw Error('Incomplete PDF.');
 const fileId=await saveFile(bytes,String(meta.name),String(meta.course));
 await db().batch([{sql:'DELETE FROM pdf_upload_parts WHERE upload_id=?',args:[id]},{sql:'DELETE FROM pdf_uploads WHERE id=?',args:[id]}],'write');
 return fileId;
}

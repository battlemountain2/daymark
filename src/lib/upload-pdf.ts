const PART_BYTES=512*1024;
export async function uploadPdf(file:File,course:string,onProgress:(text:string)=>void){
 if(file.type!=='application/pdf'||file.size>25*1024*1024)throw Error('Choose a PDF under 25 MB.');
 async function result(response:Response){const data=await response.json();if(!response.ok)throw Error(data.error||'Could not upload PDF.');return data;}
 if(file.size<=3.5*1024*1024)return result(await fetch('/api/files',{method:'POST',headers:{'x-file-name':encodeURIComponent(file.name),'x-file-course':encodeURIComponent(course)},body:file}));
 const start=await result(await fetch('/api/files/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',name:file.name,course,size:file.size})}));
 for(let offset=0,part=0;offset<file.size;offset+=PART_BYTES,part++){
  onProgress(`Storing PDF · ${Math.round(offset/file.size*100)}%`);
  await result(await fetch(`/api/files/upload?${new URLSearchParams({upload:start.upload,part:String(part)})}`,{method:'PUT',body:file.slice(offset,offset+PART_BYTES)}));
 }
 return result(await fetch('/api/files/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finish',upload:start.upload})}));
}

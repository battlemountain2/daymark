import { createCipheriv,createDecipheriv,createHash,randomBytes } from 'node:crypto';
function key(){if(!process.env.SESSION_SECRET)throw Error('Encryption is not configured');return createHash('sha256').update(`daymark:integrations:${process.env.SESSION_SECRET}`).digest();}
export function seal(value:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function unseal(value:string){const b=Buffer.from(value,'base64url');const cipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');}

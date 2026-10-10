import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seal,unseal} from '../src/lib/integration-crypto';
test('integration tokens roundtrip, use random IVs, and reject tampering',()=>{process.env.SESSION_SECRET='test-secret-not-production';const a=seal('refresh-token'),b=seal('refresh-token');assert.notEqual(a,b);assert.equal(unseal(a),'refresh-token');const bytes=Buffer.from(a,'base64url');bytes[bytes.length-1]^=1;assert.throws(()=>unseal(bytes.toString('base64url')));});
test('changing encryption secret cannot reveal a saved token',()=>{process.env.SESSION_SECRET='old';const token=seal('private');process.env.SESSION_SECRET='new';assert.throws(()=>unseal(token));});

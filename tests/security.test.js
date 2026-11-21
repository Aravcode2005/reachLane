import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {issueToken,validateToken,verifyRazorpaySignature,csv} from '../lib/security.js';
import {companies,previewCompanies,PACK_PRICE_PAISE} from '../lib/data.js';
const secret='some-extremely-long-development-secret-here';
test('access token validates, expires, rejects tampering',()=>{
 const token=issueToken('pay_abc123456',secret,100);
 assert.equal(validateToken(token,secret,101),true);
 assert.equal(validateToken(token,secret,100+30*86400),false);
 assert.equal(validateToken(token+'a',secret,101),false);
 assert.equal(validateToken(token,'wrong',101),false);
});
test('Razorpay signature is order bound',()=>{
 const signature=crypto.createHmac('sha256',secret).update('order_X|pay_Y').digest('hex');
 assert.equal(verifyRazorpaySignature({orderId:'order_X',paymentId:'pay_Y',signature},secret),true);
 assert.equal(verifyRazorpaySignature({orderId:'order_other',paymentId:'pay_Y',signature},secret),false);
});
test('CSV escapes quotes and commas',()=>{assert.equal(csv([['x, y','a"b']]),'"x, y","a""b"\r\n')});
test('curated dataset contains only public professional links',()=>{
 assert.equal(companies.length,13);assert.equal(previewCompanies.length,4);assert.equal(PACK_PRICE_PAISE,1900);
 assert.ok(companies.every(c=>c.source.startsWith('https://')&&c.careers.startsWith('https://')));
 assert.ok(companies.every(c=>!('email' in c)&&!('phone' in c)));
});

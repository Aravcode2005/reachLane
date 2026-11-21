import crypto from 'node:crypto';

export function secureEqualHex(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const ab=Buffer.from(a,'hex'), bb=Buffer.from(b,'hex');
  return ab.length > 0 && ab.length===bb.length && crypto.timingSafeEqual(ab,bb);
}
export function verifyRazorpaySignature({orderId,paymentId,signature},secret){
  if (![orderId,paymentId,signature,secret].every(x=>typeof x==='string' && x.length>0)) return false;
  const expected=crypto.createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
  return secureEqualHex(expected,signature);
}
export function issueToken(paymentId,secret,at=Math.floor(Date.now()/1000)){
  if(!secret || !paymentId) throw new Error('Missing signing data');
  const payload=Buffer.from(JSON.stringify({v:1,scope:'reachlane19',pid:paymentId,iat:at,exp:at+30*24*3600})).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function validateToken(token,secret,at=Math.floor(Date.now()/1000)){
  if (!secret || typeof token!=='string') return false;
  const parts=token.split('.');
  if (parts.length!==2 || parts[0].length>1500 || !/^[\w-]+$/.test(parts[0]) || !/^[\w-]+$/.test(parts[1])) return false;
  const expected=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64url');
  if (expected.length!==parts[1].length || !crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts[1])))return false;
  try{
    const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    return data.v===1 && data.scope==='reachlane19' && typeof data.pid==='string' && data.pid.length>5 && Number.isFinite(data.exp) && at<data.exp && Number.isFinite(data.iat) && data.iat<=at+60;
  }catch{return false}
}
export function csv(rows){return rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\r\n')+'\r\n'}

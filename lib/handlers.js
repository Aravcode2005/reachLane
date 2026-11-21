import crypto from 'node:crypto';
import {companies,previewCompanies,reviewedOn,emailTemplates,trackerHeader,PACK_PRICE_PAISE} from './data.js';
import {verifyRazorpaySignature,issueToken,validateToken,csv} from './security.js';

function setHeaders(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin')}
function json(res,status,data){setHeaders(res);res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
function method(req,res,expected){if(req.method!==expected){res.setHeader('Allow',expected);json(res,405,{error:'Method not allowed'});return false}return true}
function config(){return {keyId:process.env.RAZORPAY_KEY_ID, keySecret:process.env.RAZORPAY_KEY_SECRET,tokenSecret:process.env.ACCESS_TOKEN_SECRET}}
function ready(){const c=config();return Boolean(c.keyId&&c.keySecret&&c.tokenSecret && c.tokenSecret.length>=24)}
async function getBody(req){if(req.body!==undefined) return typeof req.body==='string'?JSON.parse(req.body):req.body;
  let n=0,b='';for await(const chunk of req){n+=chunk.length;if(n>4096)throw new Error('Request too large');b+=chunk.toString()};return b?JSON.parse(b):{}
}
function authorized(req){const token=(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');return validateToken(token,process.env.ACCESS_TOKEN_SECRET)}
async function razorpayRequest(method,path,body){const c=config();const auth=Buffer.from(`${c.keyId}:${c.keySecret}`).toString('base64');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  try{const result=await fetch(`https://api.razorpay.com/v1${path}`,{method,headers:{Authorization:`Basic ${auth}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});const parsed=await result.json();if(!result.ok)throw new Error('Razorpay request failed');return parsed;}finally{clearTimeout(timeout)}
}
export async function catalog(req,res){if(!method(req,res,'GET'))return;json(res,200,{reviewedOn,total:companies.length,paid:authorized(req),items:authorized(req)?companies:previewCompanies});}
export async function status(req,res){if(!method(req,res,'GET'))return;json(res,200,{paymentsConfigured:ready(),pricePaise:PACK_PRICE_PAISE,records:companies.length,reviewedOn});}
export async function createOrder(req,res){if(!method(req,res,'POST'))return;if(!ready())return json(res,503,{error:'Payments are not configured yet. The preview is available.'});
  try{const body=await getBody(req);if(body!==null && (typeof body!=='object' || Array.isArray(body)))return json(res,400,{error:'Invalid request'});
    const receipt=`rl19_${crypto.randomUUID().replace(/-/g,'').slice(0,28)}`;
    const order=await razorpayRequest('POST','/orders',{amount:PACK_PRICE_PAISE,currency:'INR',receipt,notes:{product:'reachlane-19-kit'}});
    if(!order.id || order.amount!==PACK_PRICE_PAISE)throw new Error('Unexpected order');
    json(res,200,{orderId:order.id,amount:order.amount,currency:'INR',keyId:config().keyId});
  }catch{json(res,502,{error:'Unable to start checkout. Please try again.'})}
}
export async function verifyPayment(req,res){if(!method(req,res,'POST'))return;if(!ready())return json(res,503,{error:'Payments not configured'});
  try{const b=await getBody(req);const orderId=b?.razorpay_order_id,paymentId=b?.razorpay_payment_id,signature=b?.razorpay_signature;
    if (![orderId,paymentId,signature].every(x=>typeof x==='string' && x.length>4 && x.length<300))return json(res,400,{error:'Invalid payment response'});
    if(!verifyRazorpaySignature({orderId,paymentId,signature},config().keySecret))return json(res,403,{error:'Invalid payment signature'});
    const payment=await razorpayRequest('GET',`/payments/${encodeURIComponent(paymentId)}`);
    if(payment.id!==paymentId||payment.order_id!==orderId||payment.amount!==PACK_PRICE_PAISE||payment.currency!=='INR'||payment.status!=='captured') return json(res,403,{error:'Payment is not captured yet. Please contact support if charged.'});
    json(res,200,{token:issueToken(paymentId,config().tokenSecret),message:'Kit unlocked for 30 days'});
  }catch{json(res,502,{error:'Payment verification unavailable. Keep your transaction ID for support.'})}
}
export async function download(req,res){if(!method(req,res,'GET'))return;if(!authorized(req))return json(res,401,{error:'Unlock the kit first'});
  const url=new URL(req.url,'http://localhost');const type=url.searchParams.get('type');let content,file,mime;
  if(type==='companies'){content=csv([['Company','Public leader','Position','Industry','Location','Leadership source','Official careers','Research angle','Reviewed on'],...companies.map(c=>[c.company,c.leader,c.role,c.sector,c.location,c.source,c.careers,c.angle,reviewedOn])]);file='reachlane-public-company-guide.csv';mime='text/csv; charset=utf-8';}
  else if(type==='templates'){content=emailTemplates;file='reachlane-outreach-templates.txt';mime='text/plain; charset=utf-8';}
  else if(type==='tracker'){content=csv([trackerHeader,...companies.map(c=>[c.company,'',c.careers,'',reviewedOn,'','Not started',''])]);file='reachlane-application-tracker.csv';mime='text/csv; charset=utf-8';}
  else return json(res,400,{error:'Unknown download'});
  setHeaders(res);res.statusCode=200;res.setHeader('Content-Type',mime);res.setHeader('Content-Disposition',`attachment; filename="${file}"`);res.end(content);
}

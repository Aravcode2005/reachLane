import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalog,status,createOrder,verifyPayment,download} from './lib/handlers.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const port=Number(process.env.PORT||4173);
const api=new Map([['/api/catalog',catalog],['/api/status',status],['/api/create-order',createOrder],['/api/verify-payment',verifyPayment],['/api/download',download]]);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(api.has(pathname))return api.get(pathname)(req,res);
  if(req.method!=='GET') {res.writeHead(405);return res.end('Method not allowed')}
  const rel=pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1);
  const full=path.resolve(root,rel);if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  if(rel.startsWith('.')){res.writeHead(404);return res.end('Not found')}
  const data=await fs.readFile(full);res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'0.0.0.0',()=>console.log(`Reachlane preview running at http://localhost:${port}`));

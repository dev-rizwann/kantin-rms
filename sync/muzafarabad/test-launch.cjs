const assert=require('node:assert/strict'), crypto=require('node:crypto'), fs=require('node:fs');
const {PrismaClient}=require('@prisma/client'), bcrypt=require('/tmp/kashmir-bcrypt.js');
if(new URL(process.env.DATABASE_URL).pathname!=='/kantin_muzafarabad_qa_20261022')throw new Error('Isolated QA database required');
const db=new PrismaClient(),url='http://127.0.0.1:3000/api/sync/kashmir';
const token=crypto.randomBytes(32).toString('hex'),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
async function post(body,status=200){const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});const t=await r.text();assert.equal(r.status,status,t);return JSON.parse(t);}
function permit(overrides={}){const p=Buffer.from(JSON.stringify({purpose:'kantin-muzafarabad-clean-launch-v1',kantinSlug:'kashmir',nonce:crypto.randomUUID(),expiresAt:Date.now()+86400000,...overrides})).toString('base64url');return p+'.'+crypto.createHmac('sha256',process.env.NEXTAUTH_SECRET).update('kantin-muzafarabad-clean-launch-v1:'+p).digest('hex');}
async function main(){
  assert.equal(await db.syncToken.count(),0,'Fresh isolated fixture required');
  await db.reportingBoundary.create({data:{kantinSlug:'kashmir'}});
  for(const slug of ['h8','chak-shahzad','kashmir'])await db.kantin.create({data:{slug,name:slug==='kashmir'?'MUZAFARABAD (AJK)':slug,city:'QA',isLive:slug!=='kashmir'}});
  await db.syncToken.create({data:{kantinSlug:'kashmir',tokenHash:await bcrypt.hash(token,12)}});
  const others=await db.kantin.findMany({where:{slug:{not:'kashmir'}}});
  const source=JSON.parse(fs.readFileSync('/tmp/synthetic-tables.json','utf8'));
  const empty=structuredClone(source);for(const t of ['RECEIPT','CHECKOUT','ITEMSALE','PAYMENT','CANCEL','REFUND','SESSION'])empty[t]=[];
  const cleanup=new Date(Date.now()-60000).toISOString();
  const data={mode:'activate',permit:permit(),instanceId:crypto.randomUUID(),cleanupId:crypto.randomUUID(),cleanupUtc:cleanup,backupAt:new Date(Date.now()-30000).toISOString(),receiptBaseline:1,computerName:'SYNTHETIC-QA',tables:empty};
  assert.equal((await fetch(url)).status,401);
  await post({...data,permit:'invalid'},400);
  await post({...data,permit:permit({kantinSlug:'h8'})},400);
  await post({...data,permit:permit({expiresAt:Date.now()-1})},400);
  await post({...data,tables:source},400);
  await post({...data,backupAt:new Date(Date.now()-90000).toISOString()},400);
  assert.equal((await db.reportingBoundary.findUnique({where:{kantinSlug:'kashmir'}})).firstTradingLocal,null);
  await post({mode:'register',instanceId:data.instanceId,receiptBaseline:1});
  const result=await post(data);assert.equal(result.status,'active');
  await post(data);
  assert.equal(await db.auditLog.count({where:{action:'reporting.activated'}}),1,'Activation replay audit');
  assert.equal(await db.syncBatch.count({where:{kantinSlug:'kashmir'}}),12);
  assert.equal((await db.kantin.findUnique({where:{slug:'kashmir'}})).isLive,true);
  for(const table of ['RECEIPT','CHECKOUT','PAYMENT'])assert.equal((await db.syncBatch.findUnique({where:{id:'kantin-v2:kashmir:'+table}})).rowCount,0);
  await post({...data,instanceId:crypto.randomUUID()},409);
  await post({...data,cleanupId:crypto.randomUUID()},409);
  await post({...data,receiptBaseline:200},409);
  await post({...data,permit:permit()},409);
  const local=new Date(Date.now()+5*3600000).toISOString().slice(0,19);
  for(const [t,rows] of Object.entries(source))for(const row of rows)for(const k of Object.keys(row))if(['opentime','created','saletime','paymenttime','canceltime','refundon','starttime'].includes(k))row[k]=local;
  const upload={mode:'snapshot',instanceId:data.instanceId,backupAt:new Date().toISOString(),firstTradingLocal:result.firstTradingLocal,tables:source};
  await post(upload);await post(upload);
  assert.equal((await db.$queryRaw`SELECT count(*)::int AS n FROM mp_checkout WHERE kantin_slug='kashmir'`)[0].n,1);
  const saved=JSON.stringify(await db.syncBatch.findMany({where:{kantinSlug:'kashmir'},orderBy:{id:'asc'}}));
  await post(data);assert.equal(JSON.stringify(await db.syncBatch.findMany({where:{kantinSlug:'kashmir'},orderBy:{id:'asc'}})),saved,'Activation replay must preserve subsequent sales');
  await post({...upload,backupAt:data.backupAt},409);
  assert.deepEqual(await db.kantin.findMany({where:{slug:{not:'kashmir'}}}),others);
  assert.equal(await db.syncBatch.count({where:{kantinSlug:{not:'kashmir'}}}),0);
  console.log('PASS: HTTPS contract auth, permits/expiry/scope, pending guard, nonempty and stale cleanup rejection, activation, replay safety, baseline, 12-table sync, native SQL reports, QA exclusion and other-outlet isolation.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());

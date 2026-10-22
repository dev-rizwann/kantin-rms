// Run inside the production app. Writes a private file, never prints a credential.
const fs=require('node:fs'),crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
async function main(){
  if(new URL(process.env.DATABASE_URL).pathname!=='/kantin_rms')throw new Error('Expected production Kantin database');
  const b=await db.reportingBoundary.findUnique({where:{kantinSlug:'kashmir'}});
  const k=await db.kantin.findUnique({where:{slug:'kashmir'}});
  if(!b||b.firstTradingLocal||k?.name!=='MUZAFARABAD (AJK)'||await db.syncBatch.count({where:{kantinSlug:'kashmir'}}))throw new Error('Expected pending, empty Muzafarabad reporting');
  const purpose='kantin-muzafarabad-clean-launch-v1',expiresAt=Date.now()+7*86400000;
  const value={purpose,kantinSlug:'kashmir',nonce:crypto.randomUUID(),expiresAt};
  const payload=Buffer.from(JSON.stringify(value)).toString('base64url');
  if(!process.env.NEXTAUTH_SECRET||process.env.NEXTAUTH_SECRET.length<32)throw new Error('Signing not configured');
  const launchPermit=payload+'.'+crypto.createHmac('sha256',process.env.NEXTAUTH_SECRET).update(purpose+':'+payload).digest('hex');
  fs.writeFileSync('/tmp/muzafarabad-launch-permit.json',JSON.stringify({launchPermit,expiresUtc:new Date(expiresAt).toISOString()}),{flag:'wx',mode:0o600});
  console.log('Muzafarabad-only permit issued privately. Reporting remains disabled. Expires '+new Date(expiresAt).toISOString());
}
main().catch(e=>{console.error(e.name);process.exitCode=1}).finally(()=>db.$disconnect());

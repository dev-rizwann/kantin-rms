const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client'),bcrypt=require('/tmp/kashmir-bcrypt.js');
if(new URL(process.env.DATABASE_URL).pathname!=='/kantin_muzafarabad_qa_20261022')throw new Error('Isolated QA database required');
const db=new PrismaClient();
async function main(){
  assert.ok((await db.reportingBoundary.findUnique({where:{kantinSlug:'kashmir'}})).firstTradingLocal);
  const email='launch-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex');
  await db.user.create({data:{email,name:'Synthetic launch QA',role:'ADMIN',passwordHash:await bcrypt.hash(password,12)}});
  const jar=new Map(),base='http://127.0.0.1:3000';
  const save=r=>r.headers.getSetCookie().forEach(s=>{const p=s.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1))});
  const cookies=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
  const csrf=await fetch(base+'/api/auth/csrf');save(csrf);
  const {csrfToken}=await csrf.json();
  const login=await fetch(base+'/api/auth/callback/credentials',{method:'POST',headers:{cookie:cookies(),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken,email,password,callbackUrl:base+'/',json:'true'}),redirect:'manual'});save(login);
  assert.ok((await db.user.findUnique({where:{email}})).lastLoginAt);
  for(const path of ['/','/kashmir','/kashmir/menu','/kashmir/daily','/kashmir/cashiers','/h8','/chak-shahzad']){
    const r=await fetch(base+path,{headers:{cookie:cookies()},redirect:'manual'}),html=await r.text();
    assert.equal(r.status,200,path);assert.ok(!html.includes('"digest":'),path);
    if(path==='/'||path.startsWith('/kashmir'))assert.ok(html.includes('MUZAFARABAD (AJK)'),path);
  }
  console.log('PASS: actual synthetic login, live Muzafarabad landing/overview/menu/daily/cashier pages and both other outlets render.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());

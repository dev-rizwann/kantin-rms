import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { Launch, prepareLaunch, verifyLaunchPermit } from "./reporting-launch"
import { REPORT_COLUMNS } from "./reporting-snapshot"
const secret="synthetic-only-".repeat(4), now=Date.now()
function permit(overrides={}) {
  const payload=Buffer.from(JSON.stringify({purpose:"kantin-muzafarabad-clean-launch-v1",kantinSlug:"kashmir",nonce:randomUUID(),expiresAt:now+86400000,...overrides})).toString("base64url")
  return payload+"."+createHmac("sha256",secret).update("kantin-muzafarabad-clean-launch-v1:"+payload).digest("hex")
}
const tables=Object.fromEntries(Object.keys(REPORT_COLUMNS).map(t=>[t,[]]))
const data=Launch.parse({mode:"activate",permit:permit(),instanceId:randomUUID(),cleanupId:randomUUID(),cleanupUtc:new Date(now-60000).toISOString(),backupAt:new Date(now-30000).toISOString(),computerName:"SYNTHETIC-QA",receiptBaseline:203,tables})
assert.equal(prepareLaunch(data,secret,now).firstTradingLocal,new Date(now-60000+5*3600000).toISOString().slice(0,19))
assert.throws(()=>verifyLaunchPermit(data.permit,secret+"x",now))
assert.throws(()=>verifyLaunchPermit(data.permit+".extra",secret,now))
assert.throws(()=>verifyLaunchPermit(permit({expiresAt:now-1}),secret,now))
assert.throws(()=>verifyLaunchPermit(permit({kantinSlug:"h8"}),secret,now))
assert.throws(()=>verifyLaunchPermit(permit({purpose:"login"}),secret,now))
assert.throws(()=>prepareLaunch({...data,backupAt:new Date(now-90000).toISOString()},secret,now))
assert.throws(()=>prepareLaunch({...data,cleanupUtc:new Date(now+600000).toISOString()},secret,now))
for(const table of ["RECEIPT","CHECKOUT","ITEMSALE","PAYMENT","CANCEL","REFUND"]){
  assert.throws(()=>prepareLaunch({...data,tables:{...tables,[table]:[{id:1}]}},secret,now))
}
assert.throws(()=>prepareLaunch({...data,tables:{}},secret,now))
console.log("PASS: launch permits, scope, expiry, tampering, timestamps, clean financial snapshot and Pakistan boundary")

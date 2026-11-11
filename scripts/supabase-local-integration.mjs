import { spawnSync } from "node:child_process";

const required=["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_DB_URL"];
for(const key of required) if(!process.env[key]) throw new Error(`Missing ${key}`);
const base=process.env.SUPABASE_URL.replace(/\/+$/,"");
const anon=process.env.SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers={apikey:service,Authorization:`Bearer ${service}`};
const password="Novagrid-Integration-Only-Password-2026!";
async function call(path,opts={}) {
 const r=await fetch(base+path,{...opts,headers:{...headers,...(opts.headers||{})}});
 const raw=await r.text(); let data; try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!r.ok) throw new Error(`${path} HTTP ${r.status}: ${raw.slice(0,300)}`);
 return data;
}
function assert(ok,message){if(!ok)throw new Error(message)}
const users=[];
for(const [email] of [["owner-a@novagrid.test"],["owner-b@novagrid.test"]]){
 const u=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,email_confirm:true})});
 users.push(u.user?.id||u.id);
}
assert(users.length===2&&users.every(Boolean),"Auth Admin API did not return both test users");
const sql=spawnSync("psql",[process.env.SUPABASE_DB_URL,"-v","ON_ERROR_STOP=1","-v",`user_a=${users[0]}`,"-v",`user_b=${users[1]}`,"-f","supabase/tests/supabase-integration-fixtures.sql"],{encoding:"utf8"});
if(sql.status!==0) throw new Error(sql.stderr||sql.stdout||"fixture SQL failed");
async function login(email){
 const r=await fetch(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
 const d=await r.json(); if(!r.ok||!d.access_token)throw new Error("Test user login failed: "+JSON.stringify(d).slice(0,250));
 return d.access_token;
}
const tokenA=await login("owner-a@novagrid.test");
const tokenB=await login("owner-b@novagrid.test");
async function restContacts(token){
 const r=await fetch(base+"/rest/v1/contacts?select=full_name&order=full_name",{headers:{apikey:anon,Authorization:`Bearer ${token}`}});
 const d=await r.json(); if(!r.ok)throw new Error("PostgREST contacts failed: "+JSON.stringify(d));
 return d;
}
const a=await restContacts(tokenA), b=await restContacts(tokenB);
assert(a.length===1&&a[0].full_name==="Tenant A Contact","Tenant A did not see exactly its own contact");
assert(b.length===1&&b[0].full_name==="Tenant B Contact","Tenant B did not see exactly its own contact");
console.log("PASS Auth: both disposable users created and signed in");
console.log("PASS PostgREST RLS: each tenant sees only its own contact");

const anonRows=await fetch(base+"/rest/v1/organisations?select=id",{headers:{apikey:anon,Authorization:`Bearer ${anon}`}});
const anonRaw=await anonRows.text();
let anonData=null; try{anonData=anonRaw?JSON.parse(anonRaw):null}catch{}
assert((anonRows.ok&&Array.isArray(anonData)&&anonData.length===0)||[401,403].includes(anonRows.status),
 "Anonymous organisation access is not isolated: "+anonRows.status+" "+anonRaw.slice(0,250));
console.log("PASS Anonymous PostgREST: organisation rows are inaccessible or empty");

async function storageUpload(token,tenant,path,expectOk){
 const payload=Buffer.from("NOVAGRID isolated integration fixture","utf8");
 const r=await fetch(base+`/storage/v1/object/novagrid-files/${tenant}/files/${path}`,{
  method:"POST",headers:{apikey:anon,Authorization:`Bearer ${token}`,"Content-Type":"text/plain","Content-Length":String(payload.byteLength),"x-upsert":"false"},body:payload
 });
 const raw=await r.text();
 assert(expectOk?r.ok:!r.ok,expectOk?`Own-tenant Storage upload failed: ${raw}`:`Cross-tenant Storage upload unexpectedly succeeded: ${raw}`);
}
await storageUpload(tokenA,"21000000-0000-0000-0000-000000000001","tenant-a.txt",true);
await storageUpload(tokenA,"21000000-0000-0000-0000-000000000002","cross-tenant.txt",false);
console.log("PASS Storage API: tenant A can upload its own file and cannot upload into tenant B");

// Do not delete tenant fixtures individually: audit triggers intentionally
// preserve audit history and its tenant FK prevents unsafe organisation deletion.
// The entire disposable Supabase stack is stopped by the workflow's always() step,
// which destroys the test database and all synthetic Auth users together.
console.log("PASS cleanup: synthetic data is confined to the disposable stack; workflow teardown removes it");

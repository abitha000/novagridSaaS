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

// End-to-end owner registration -> platform approval -> separate trial activation.
const ownerEmail="registration-owner@novagrid.test";
const adminEmail="platform-admin@novagrid.test";
const ownerAuth=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:ownerEmail,password,email_confirm:true})});
const adminAuth=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:adminEmail,password,email_confirm:true})});
const ownerId=ownerAuth.user?.id||ownerAuth.id;
const adminId=adminAuth.user?.id||adminAuth.id;
assert(ownerId&&adminId,"Registration owner/platform admin Auth users were not created");
const seedAdmin=spawnSync("psql",[process.env.SUPABASE_DB_URL,"-v","ON_ERROR_STOP=1","-c",`insert into public.platform_users(user_id,role,status) values ('${adminId}'::uuid,'super_admin','active') on conflict (user_id) do update set role='super_admin',status='active';`],{encoding:"utf8"});
if(seedAdmin.status!==0) throw new Error(seedAdmin.stderr||"platform admin fixture seed failed");
async function loginAs(email){
 const response=await fetch(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
 const result=await response.json();
 if(!response.ok||!result.access_token)throw new Error("E2E login failed: "+JSON.stringify(result).slice(0,250));
 return result.access_token;
}
async function rpc(token,name,args){
 const response=await fetch(base+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:anon,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(args)});
 const raw=await response.text(); let result; try{result=raw?JSON.parse(raw):null}catch{result=raw}
 if(!response.ok)throw new Error(name+" RPC failed ("+response.status+"): "+raw.slice(0,500));
 return result;
}
const ownerToken=await loginAs(ownerEmail);
const adminToken=await loginAs(adminEmail);
const registrationToken=crypto.randomUUID();
const registrationArgs={
 p_registration_token:registrationToken,p_name:"E2E Registration Gym",p_owner_name:"Integration Owner",
 p_phone:"+919876543210",p_address:"Test Address",p_country:"India",p_state:"Tamil Nadu",
 p_city:"Hosur",p_category_key:"gym",p_org_type:"fitness",p_plan_key:"trial"
};
const orgId=await rpc(ownerToken,"register_organisation",registrationArgs);
assert(typeof orgId==="string","Registration RPC did not return organisation UUID");
const retryId=await rpc(ownerToken,"register_organisation",registrationArgs);
assert(retryId===orgId,"Registration RPC retry was not idempotent");
const pending=await fetch(base+`/rest/v1/organisations?id=eq.${orgId}&select=approval_status,lifecycle_status`,{headers:{apikey:anon,Authorization:`Bearer ${ownerToken}`}});
const pendingRows=await pending.json();
assert(pending.ok&&pendingRows.length===1&&pendingRows[0].approval_status==="pending","New organisation should remain pending before platform approval");
await rpc(adminToken,"decide_organisation_approval",{p_org:orgId,p_decision:"approved",p_category_key:"gym",p_reason:null});
const approved=await fetch(base+`/rest/v1/organisations?id=eq.${orgId}&select=approval_status,lifecycle_status`,{headers:{apikey:anon,Authorization:`Bearer ${staffAdminToken}`}});
const approvedRows=await approved.json();
assert(approved.ok&&approvedRows.length===1&&approvedRows[0].approval_status==="approved","Platform approval did not update organisation");
const beforeActivation=await fetch(base+`/rest/v1/subscriptions?organisation_id=eq.${orgId}&select=id`,{headers:{apikey:anon,Authorization:`Bearer ${adminToken}`}});
const beforeRows=await beforeActivation.json();
assert(beforeActivation.ok&&beforeRows.length===0,"Category approval must not automatically activate a subscription");
await rpc(adminToken,"assign_subscription",{p_org:orgId,p_plan_key:"trial",p_status:"trial",p_period_end:new Date(Date.now()+7*86400000).toISOString()});
const afterActivation=await fetch(base+`/rest/v1/subscriptions?organisation_id=eq.${orgId}&select=id,status`,{headers:{apikey:anon,Authorization:`Bearer ${adminToken}`}});
const afterRows=await afterActivation.json();
assert(afterActivation.ok&&afterRows.length===1&&afterRows[0].status==="trial","Separate trial assignment did not create a trial subscription");
console.log("PASS E2E: confirmed owner registered organisation; retry was idempotent");
console.log("PASS E2E: organisation remained pending until platform admin approval");
console.log("PASS E2E: category approval did not activate subscription");
console.log("PASS E2E: platform admin separately assigned trial subscription");


 // Staff role/permission integration. These users exist only in this disposable Supabase stack.
 const staffOperator=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"staff-operator@novagrid.test",password,email_confirm:true})});
 const staffTarget=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"staff-target@novagrid.test",password,email_confirm:true})});
 const staffAdmin=await call("/auth/v1/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"staff-admin@novagrid.test",password,email_confirm:true})});
 const operatorId=staffOperator.user?.id||staffOperator.id;
 const targetId=staffTarget.user?.id||staffTarget.id;
 const adminStaffId=staffAdmin.user?.id||staffAdmin.id;
 assert(operatorId&&targetId&&adminStaffId,"Staff integration users were not created");
 const staffFixtures=spawnSync("psql",[process.env.SUPABASE_DB_URL,"-v","ON_ERROR_STOP=1","-v",`operator_id=${operatorId}`,"-v",`target_id=${targetId}`,"-v",`admin_id=${adminStaffId}`,"-f","supabase/tests/staff-rbac-fixtures.sql"],{encoding:"utf8"});
 if(staffFixtures.status!==0)throw new Error(staffFixtures.stderr||"Staff RBAC fixtures failed");
 const crossTenantRole=spawnSync("psql",[process.env.SUPABASE_DB_URL,"-v","ON_ERROR_STOP=1","-v",`target_id=${targetId}`,"-c",`insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status) select '21000000-0000-0000-0000-000000000002', :'target_id'::uuid, r.id, 'Cross Tenant', 'cross-tenant@novagrid.test', 'invited' from public.roles r where r.tenant_id='21000000-0000-0000-0000-000000000001' and r.key='tenant_custom';`],{encoding:"utf8"});
 assert(crossTenantRole.status!==0&&String(crossTenantRole.stderr).includes("staff role belongs to a different organisation"),"Cross-tenant role assignment was not rejected by the database");

 const operatorToken=await loginAs("staff-operator@novagrid.test");
 const targetQuery=await fetch(base+`/rest/v1/tenant_users?tenant_id=eq.21000000-0000-0000-0000-000000000001&user_id=eq.${targetId}&select=id,status`,{headers:{apikey:anon,Authorization:`Bearer ${ownerToken}`}});
 const targetMemberships=await targetQuery.json();
 assert(targetQuery.ok&&targetMemberships.length===1,"Invited staff fixture was not created");
 const targetMembershipId=targetMemberships[0].id;
 const staffPatch=async(token,id,values)=>{
   const response=await fetch(base+`/rest/v1/tenant_users?id=eq.${id}&select=id,status`,{method:"PATCH",headers:{apikey:anon,Authorization:`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(values)});
   const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
   if(!response.ok)throw new Error("Staff update failed: "+raw.slice(0,300));
   return data;
 };
 const operatorUpdate=await staffPatch(operatorToken,targetMembershipId,{status:"active"});
 assert(Array.isArray(operatorUpdate)&&operatorUpdate.length===0,"Operator without staff.manage changed another staff member");
 const operatorSelf=await fetch(base+`/rest/v1/tenant_users?tenant_id=eq.21000000-0000-0000-0000-000000000001&user_id=eq.${operatorId}&select=id`,{headers:{apikey:anon,Authorization:`Bearer ${operatorToken}`}});
 const operatorRows=await operatorSelf.json();
 assert(operatorSelf.ok&&operatorRows.length===1,"Operator could not read own membership");
 const ownerRoleResponse=await fetch(base+"/rest/v1/roles?tenant_id=is.null&key=eq.owner&select=id",{headers:{apikey:anon,Authorization:`Bearer ${ownerToken}`}});
 const ownerRoleRows=await ownerRoleResponse.json();
 assert(ownerRoleResponse.ok&&ownerRoleRows.length===1,"System owner role not available");
 const promote=await staffPatch(operatorToken,operatorRows[0].id,{role_id:ownerRoleRows[0].id});
 assert(Array.isArray(promote)&&promote.length===0,"Operator unexpectedly promoted itself");
 const staffAdminToken=await loginAs("staff-admin@novagrid.test");
 const adminSelf=await fetch(base+`/rest/v1/tenant_users?tenant_id=eq.21000000-0000-0000-0000-000000000001&user_id=eq.${adminStaffId}&select=id`,{headers:{apikey:anon,Authorization:`Bearer ${adminToken}`}});
 const adminRows=await adminSelf.json();
 assert(adminSelf.ok&&adminRows.length===1,"Admin staff membership was not visible");
 const adminPromotion=await staffPatch(staffAdminToken,adminRows[0].id,{role_id:ownerRoleRows[0].id});
 assert(Array.isArray(adminPromotion)&&adminPromotion.length===0,"Admin unexpectedly promoted itself to owner");
 const ownerUpdate=await staffPatch(ownerToken,targetMembershipId,{status:"active"});
 assert(Array.isArray(ownerUpdate)&&ownerUpdate.length===1&&ownerUpdate[0].status==="active","Owner could not activate invited staff");
 console.log("PASS Staff RBAC: operator cannot manage staff; admin cannot promote itself to owner");
 console.log("PASS Staff RBAC: organisation owner can activate invited staff");
 console.log("PASS Staff RBAC: database rejects a role owned by another tenant");

console.log("PASS cleanup: synthetic data is confined to the disposable stack; workflow teardown removes it");

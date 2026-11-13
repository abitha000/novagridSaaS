import { createHash, randomBytes } from "node:crypto";
const base=process.env.SUPABASE_URL.replace(/\/+$/,""),anon=process.env.SUPABASE_ANON_KEY;
const mailpit=(process.env.MAILPIT_URL||"http://127.0.0.1:54324").replace(/\/+$/,"");
const assert=(v,m)=>{if(!v)throw new Error(m)};
const email="signup-e2e-owner@novagrid.test",password=randomBytes(24).toString("base64url")+"Aa1!";
const callback="http://localhost:3000/?auth_callback=signup",verifier=randomBytes(32).toString("base64url");
const challenge=createHash("sha256").update(verifier).digest("base64url");
const pending={token:crypto.randomUUID(),input:{name:"Email Flow Gym",ownerName:"Email Flow Owner",phone:"+919876543210",address:"Test",country:"India",state:"Tamil Nadu",city:"Hosur",categoryKey:"gym",orgType:"fitness",planKey:"trial"}};
const q=new URLSearchParams({redirect_to:callback});
const signup=await fetch(base+"/auth/v1/signup?"+q,{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password,data:{full_name:pending.input.ownerName,pending_registration:pending},code_challenge:challenge,code_challenge_method:"s256"})});
const sd=await signup.json();assert(signup.ok,"Signup failed: "+JSON.stringify(sd).slice(0,250));assert(!sd.access_token,"Confirmation was not required");
let msg;for(let n=0;n<40&&!msg;n++){const r=await fetch(mailpit+"/api/v1/messages?start=0&limit=50");assert(r.ok,"Local email inbox unavailable");const d=await r.json();msg=(d.messages||[]).find(m=>(m.To||[]).some(t=>(t.Address||"").toLowerCase()===email));if(!msg)await new Promise(x=>setTimeout(x,500))}
assert(msg,"Confirmation email not delivered");const mr=await fetch(mailpit+"/api/v1/message/"+encodeURIComponent(msg.ID));assert(mr.ok,"Email message could not be read");const m=await mr.json();
const body=[m.Text||"",m.HTML||""].join("\n").replace(/&amp;/g,"&");
const link=(body.match(/https?:\/\/[^\s<>"']+/g)||[]).map(x=>x.replace(/[),.]+$/,"")).find(x=>x.includes("/auth/v1/verify?"));assert(link,"Verification link missing");
const v=await fetch(link,{redirect:"manual"});assert([302,303,307,308].includes(v.status),"Verification did not redirect");const dest=new URL(v.headers.get("location"));assert(dest.origin==="http://localhost:3000"&&dest.searchParams.get("auth_callback")==="signup","Wrong signup callback destination");
const code=dest.searchParams.get("code");assert(code,"PKCE code missing");
const ex=await fetch(base+"/auth/v1/token?grant_type=pkce",{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({auth_code:code,code_verifier:verifier})});const session=await ex.json();assert(ex.ok&&session.access_token&&session.user?.email_confirmed_at,"PKCE confirmation exchange failed");assert(session.user.user_metadata.pending_registration.token===pending.token,"Pending registration metadata lost");
const a=pending.input,args={p_registration_token:pending.token,p_name:a.name,p_owner_name:a.ownerName,p_phone:a.phone,p_address:a.address,p_country:a.country,p_state:a.state,p_city:a.city,p_category_key:a.categoryKey,p_org_type:a.orgType,p_plan_key:a.planKey};
async function register(){const r=await fetch(base+"/rest/v1/rpc/register_organisation",{method:"POST",headers:{apikey:anon,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify(args)});const raw=await r.text();assert(r.ok,"Registration RPC failed: "+raw.slice(0,250));return JSON.parse(raw)}
const org=await register();assert(typeof org==="string","Organisation ID missing");assert(await register()===org,"Retry was not idempotent");
const mr2=await fetch(base+"/rest/v1/tenant_users?tenant_id=eq."+org+"&user_id=eq."+session.user.id+"&select=id,status",{headers:{apikey:anon,Authorization:"Bearer "+session.access_token}});const members=await mr2.json();assert(mr2.ok&&members.length===1&&members[0].status==="active","Owner membership missing");
console.log("PASS: email delivery, verification callback, PKCE session, organisation creation, owner membership and idempotent retry");

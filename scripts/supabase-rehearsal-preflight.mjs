#!/usr/bin/env node
/**
 * Non-destructive preflight against a disposable, isolated Supabase rehearsal project.
 * Never run against production. Does not create users, rows, buckets, or files.
 */
const required = ["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","EXPECTED_PROJECT_REF","CONFIRM_REHEARSAL_PROJECT_REF","PRODUCTION_PROJECT_REF"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);

const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
const projectRef = new URL(base).hostname.split(".")[0];
if (projectRef !== process.env.EXPECTED_PROJECT_REF) throw new Error("SUPABASE_URL does not match EXPECTED_PROJECT_REF.");
if (projectRef === process.env.PRODUCTION_PROJECT_REF) throw new Error("Refusing to run against the production project.");
if (process.env.CONFIRM_REHEARSAL_PROJECT_REF !== projectRef) throw new Error("Explicit project-ref confirmation does not match target.");

const anonHeaders = { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` };
const adminHeaders = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
const checks = [];
async function check(name, fn) {
  try { const detail = await fn(); checks.push({name,ok:true,detail}); }
  catch (error) { checks.push({name,ok:false,detail:error.message}); }
}
async function request(path, headers, options={}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: {...headers, ...(options.headers||{})} });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0,240)}`);
  return body ? JSON.parse(body) : null;
}

await check("NOVAGRID schema version is 10", async () => {
  const version = await request("/rest/v1/rpc/novagrid_schema_version", anonHeaders, {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  if (Number(version) !== 10) throw new Error(`Expected schema version 10, received ${JSON.stringify(version)}`);
  return `schema version ${version}`;
});

await check("Anonymous role cannot enumerate organisation data", async () => {
  const rows = await request("/rest/v1/organisations?select=id&limit=1", anonHeaders);
  if (!Array.isArray(rows)) throw new Error("Unexpected PostgREST response shape.");
  if (rows.length !== 0) throw new Error("Anonymous request returned organisation rows; inspect RLS and grants immediately.");
  return "No organisation rows exposed to anon.";
});

await check("Private tenant file bucket exists and is not public", async () => {
  const bucket = await request("/storage/v1/bucket/novagrid-files", adminHeaders);
  if (bucket.public === true) throw new Error("novagrid-files is public.");
  return `Bucket exists; public=${String(bucket.public)}`;
});

await check("Service-role key is not the anon key", async () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY) throw new Error("Service-role and anon keys are identical.");
  return "Distinct credentials supplied.";
});

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
console.log(`Target project: ${projectRef}`);
if (checks.some(x => !x.ok)) process.exitCode = 1;

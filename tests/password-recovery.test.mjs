import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, POST } from '../app/api/readiness-account/route.ts';

function configure(t) {
  const previous=[process.env.COW_GROWTH_EVENT_URL,process.env.COW_GROWTH_EVENT_KEY];
  process.env.COW_GROWTH_EVENT_URL='https://cow.example.invalid/api/growth/events';process.env.COW_GROWTH_EVENT_KEY='test-service-key';
  t.after(()=>{for(const [i,name] of ['COW_GROWTH_EVENT_URL','COW_GROWTH_EVENT_KEY'].entries()){if(previous[i]===undefined)delete process.env[name];else process.env[name]=previous[i];}});
}
const request=(body,headers={})=>new Request('https://mysocialimpact.org/api/readiness-account',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
test('capability check is anonymous, read-only and fails closed for older backends',async t=>{
  configure(t);t.mock.method(globalThis,'fetch',async(_url,init)=>{assert.deepEqual(JSON.parse(init.body),{action:'reset-status'});return Response.json({available:true});});
  assert.deepEqual(await (await GET(new Request('https://mysocialimpact.org/api/readiness-account?feature=password-reset'))).json(),{available:true});
});
test('recovery request forwards only allowlisted fields and trusted-header IP, never body overrides',async t=>{
  configure(t);t.mock.method(globalThis,'fetch',async(url,init)=>{assert.equal(String(url),'https://cow.example.invalid/api/growth/accounts');assert.deepEqual(JSON.parse(init.body),{action:'request-reset',email:'person@example.org',clientIp:'192.0.2.20'});return Response.json({ok:true},{status:202});});
  const result=await POST(request({action:'request-reset',email:'person@example.org',clientIp:'fake',returnUrl:'https://evil.example',from:'bad',sessionToken:'bad'},{'x-forwarded-for':'192.0.2.20, 10.0.0.1'}));
  assert.equal(result.status,202);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'no-store');
});
test('cross-site reset mutation is rejected before any service request',async t=>{
  configure(t);const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('must not reach');});
  assert.equal((await POST(request({action:'request-reset',email:'person@example.org'},{origin:'https://evil.example'}))).status,403);assert.equal(fetch.mock.callCount(),0);
});
test('successful reset clears old session cookie without automatic login',async t=>{
  configure(t);t.mock.method(globalThis,'fetch',async()=>Response.json({ok:true,sessionToken:'must-never-return',token:'private',account:{email:'private'},password:'private'}));
  const result=await POST(request({action:'reset-password',token:'a'.repeat(64),password:'New password'}));
  assert.match(result.headers.get('set-cookie'),/Max-Age=0/);assert.deepEqual(await result.json(),{ok:true});
});
test('reset email failures and password mutations are not retried',async t=>{
  configure(t);const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json({error:'unavailable'},{status:503}));
  assert.equal((await POST(request({action:'request-reset',email:'person@example.org'}))).status,503);assert.equal(fetch.mock.callCount(),1);
});
test('existing unauthenticated session behaviour is unchanged',async()=>{
  assert.deepEqual(await(await GET(new Request('https://mysocialimpact.org/api/readiness-account'))).json(),{signedIn:false});
});
test('invalid JSON object shapes and oversize reset payloads are rejected before calling Cow',async t=>{
  configure(t);const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('must not reach');});
  for(const body of [null,[],"string"])assert.equal((await POST(request(body))).status,400);
  assert.equal((await POST(request({action:'request-reset',email:'a'.repeat(5000)}))).status,413);
  assert.equal(fetch.mock.callCount(),0);
});
test('older Cow capability responses fail closed without exposing upstream account data',async t=>{
  configure(t);t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Unsupported account action.',account:{email:'private'}},{status:400}));
  assert.deepEqual(await(await GET(new Request('https://mysocialimpact.org/api/readiness-account?feature=password-reset'))).json(),{available:false});
});

test('product progress falls back to the existing private account record on an older Cow deployment',async t=>{
  configure(t);const calls=[];t.mock.method(globalThis,'fetch',async(_url,init)=>{
    const body=JSON.parse(init.body);calls.push(body);
    if(body.action==='load-product'||body.action==='save-product')return Response.json({error:'Unsupported account action.'},{status:400});
    if(body.action==='load')return Response.json({account:{id:'account-1'},progress:{state:{currentStage:2},__sorpPlatformProducts:{}}});
    if(body.action==='save')return Response.json({account:{id:'account-1'}});
    throw Error(`unexpected ${body.action}`);
  });
  const result=await POST(request({action:'save-product',productId:'social-impact-excellence',status:'in_progress',data:{answers:[1,2,3]}},{cookie:'msi_sorp_session=session-token'}));
  assert.equal(result.status,200);assert.deepEqual((await result.json()).productProgress.data,{answers:[1,2,3]});
  assert.deepEqual(calls.map(call=>call.action),['save-product','load','save']);
  assert.deepEqual(calls[2].progress.state,{currentStage:2});
  assert.deepEqual(calls[2].progress.__sorpPlatformProducts['social-impact-excellence'].data,{answers:[1,2,3]});
});

test('ordinary readiness saves retain compatibility-stored platform progress',async t=>{
  configure(t);const calls=[];t.mock.method(globalThis,'fetch',async(_url,init)=>{
    const body=JSON.parse(init.body);calls.push(body);
    if(body.action==='load')return Response.json({progress:{__sorpPlatformProducts:{'social-impact-excellence':{status:'complete',data:{score:4}}}}});
    if(body.action==='save')return Response.json({account:{id:'account-1'}});
    throw Error(`unexpected ${body.action}`);
  });
  const result=await POST(request({action:'save',progress:{state:{currentStage:4}}},{cookie:'msi_sorp_session=session-token'}));
  assert.equal(result.status,200);assert.deepEqual(calls.map(call=>call.action),['load','save']);
  assert.deepEqual(calls[1].progress.__sorpPlatformProducts['social-impact-excellence'].data,{score:4});
});

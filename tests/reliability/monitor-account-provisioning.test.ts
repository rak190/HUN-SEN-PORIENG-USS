import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {provisionSchoolAccount} from '../../lib/accounts/provision-school-account';
type Profile={id:string;username:string;school_id:string;role:string};
function fixture(mode:'success'|'profile-failure'|'migration-missing'|'assignment-conflict'|'lost-response'|'cleanup-failure'|'unknown-state'|'auth-network'='success',unknownState=false){
  const auth=new Map<string,string>(),profiles=new Map<string,Profile>(),deleted:string[]=[],banned:string[]=[],audit:unknown[]=[],requests:Record<string,unknown>[]=[];
  const admin={from:(table:string)=>{
    const filters:Record<string,string>={};
    const query={select:()=>query,eq:(key:string,value:string)=>{filters[key]=value;return query;},maybeSingle:async()=>{
      if((mode==='unknown-state'||unknownState)&&Object.hasOwn(filters,'id'))return{data:null,error:{code:'NETWORK'}};
      return{data:[...profiles.values()].find(row=>Object.entries(filters).every(([key,value])=>row[key as keyof Profile]===value))||null,error:null};
    },insert:async(value:unknown)=>{if(table==='audit_logs')audit.push(value);return{error:null};}};return query;
  },auth:{admin:{createUser:async(value:{id:string;email:string;password:string;user_metadata:unknown})=>{auth.set(value.id,value.email);requests.push(value);return mode==='auth-network'?{data:{user:null},error:{message:'Network response lost',code:'NETWORK'}}:{data:{user:{id:value.id}},error:null};},deleteUser:async(id:string)=>{if(mode==='cleanup-failure')return{error:{code:'NETWORK'}};deleted.push(id);auth.delete(id);profiles.delete(id);return{error:null};},updateUserById:async(id:string)=>{banned.push(id);return{error:null};}}}};
  const session={rpc:async(name:string,args:{p_auth_id:string;p_input:{username:string;role:string}})=>{
    assert.equal(name,'provision_school_profile');requests.push(args as unknown as Record<string,unknown>);
    if(['success','lost-response'].includes(mode))profiles.set(args.p_auth_id,{id:args.p_auth_id,username:args.p_input.username,role:args.p_input.role,school_id:'a'});
    if(mode==='success')return{data:{success:true,school:'A'},error:null};
    return{data:null,error:{code:mode==='migration-missing'?'PGRST202':mode==='assignment-conflict'?'40001':'XX000'}};
  }};
  return{admin:admin as unknown as SupabaseClient,session:session as unknown as SupabaseClient,auth,profiles,deleted,banned,audit,requests};
}
const input={username:'monitor.one',fullName:'Synthetic Monitor',role:'monitor',monitorClassId:'00000000-0000-4000-8000-000000000020',previousMonitorId:null,phone:'012345678'};
test('account provisioning: one shared atomic profile path returns generated credentials only on verified success',async()=>{
  const f=fixture();const account=await provisionSchoolAccount(input,f.admin,f.session,'a','admin');
  assert.equal(account.role,'monitor');assert.match(account.generatedPassword!,/^\d{6}$/);assert.equal(account.school,'A');assert.equal(f.deleted.length,0);
  const rpc=f.requests[1] as {p_input:Record<string,unknown>};assert.equal(rpc.p_input.monitorClassId,input.monitorClassId);assert.equal(rpc.p_input.previousMonitorId,null);assert.equal('password' in rpc.p_input,false);assert.equal('school_id' in rpc.p_input,false);assert.equal('actor_id' in rpc.p_input,false);
  await assert.rejects(provisionSchoolAccount(input,f.admin,f.session,'a','admin'),/មានរួចហើយ/);assert.equal(f.auth.size,1,'No duplicate or orphan account');
});
test('profile failure, missing migrations and assignment conflict compensate only the newly created Auth UUID',async()=>{
  for(const mode of ['profile-failure','migration-missing','assignment-conflict','auth-network'] as const){const f=fixture(mode);await assert.rejects(provisionSchoolAccount(input,f.admin,f.session,'a','admin'));assert.equal(f.deleted.length,1);assert.equal(f.auth.size,0);assert.equal(f.profiles.size,0);}
});
test('a lost successful transaction response is recovered without deleting the committed account',async()=>{
  const f=fixture('lost-response');const account=await provisionSchoolAccount(input,f.admin,f.session,'a','admin');assert.equal(f.profiles.has(account.id),true);assert.equal(f.deleted.length,0);assert.equal(f.banned.length,0);
});
test('unavailable compensation or unknown state is quarantined and surfaced for administrator recovery',async()=>{
  for(const mode of ['cleanup-failure','unknown-state'] as const){const f=fixture(mode);await assert.rejects(provisionSchoolAccount(input,f.admin,f.session,'a','admin'));assert.equal(f.banned.length,1);assert.equal(f.audit.length,1);const details=JSON.stringify(f.audit);assert.ok(!details.includes('password'));assert.ok(!details.includes(input.fullName));}
  const lostAuth=fixture('auth-network',true);await assert.rejects(provisionSchoolAccount(input,lostAuth.admin,lostAuth.session,'a','admin'),/លេខយោង/);assert.equal(lostAuth.banned.length,1,'A lost Auth response plus unavailable profile check still attempts quarantine of only the requested UUID');assert.equal(lostAuth.deleted.length,0);assert.equal(lostAuth.audit.length,1);
});
test('principal role escalation and invalid account data are rejected before any Auth provisioning',async()=>{
  const f=fixture();await assert.rejects(provisionSchoolAccount({...input,role:'admin'},f.admin,f.session,'a','principal'));await assert.rejects(provisionSchoolAccount({...input,role:'administrator'},f.admin,f.session,'a','admin'));assert.equal(f.auth.size,0);
});

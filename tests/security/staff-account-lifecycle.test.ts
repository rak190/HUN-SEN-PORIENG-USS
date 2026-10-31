import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clientFixture} from '../helpers/client-fixture';
type StaffActions={deleteStaffPermanentlyAction:(id:string)=>Promise<unknown>;resetStaffPasswordAction:(id:string,password?:string)=>Promise<unknown>;updateStaffProfileAction:(id:string,updates:{role?:string})=>Promise<unknown>;toggleStaffStatusAction:(id:string,active:boolean)=>Promise<unknown>};
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('staff actions preserve tenant boundaries, last-admin protection and Monitor history before using Auth admin APIs',async()=>{
  const actor={user:{id:id(1)},role:'monitor',profile:{is_active:true,school_id:'a'}};
  const profiles=[{id:id(1),role:'admin',school_id:'a',is_active:true},{id:id(2),role:'monitor',school_id:'a',is_active:true},{id:id(3),role:'monitor',school_id:'b',is_active:true},{id:id(4),role:'admin',school_id:'a',is_active:false}];
  let attendanceCount=1,assigned=true,adminCreates=0;
  const calls:string[]=[],audits:Record<string,unknown>[]=[];
  const service={from:(table:string)=>{
    const filters:Record<string,unknown>={};let isOr=false;
    const result=()=>{
      if(table==='profiles'){const rows=profiles.filter(p=>Object.entries(filters).every(([key,value])=>p[key as keyof typeof p]===value));return{data:rows,count:rows.length,error:null};}
      if(table==='attendance_records')return{data:[],count:attendanceCount,error:null};
      if(table==='classes')return{data:[],count:isOr&&assigned?1:0,error:null};
      return{data:[],count:0,error:null};
    };
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters[key]=value;return query;},or:()=>{isOr=true;return query;},in:()=>query,single:async()=>{const response=result();return{...response,data:response.data[0]||null};},insert:async(value:Record<string,unknown>)=>{audits.push(value);return{error:null};},then:(resolve:(value:unknown)=>void)=>Promise.resolve(result()).then(resolve)};
    return query;
  },auth:{admin:{deleteUser:async(target:string)=>{calls.push('delete:'+target);return{error:null};},updateUserById:async(target:string)=>{calls.push('update:'+target);return{error:null};}}}};
  Object.assign(globalThis,{staffLifecycle:{actor,service,create:()=>{adminCreates++;return service;}}});
  const actions=await clientFixture<StaffActions>('app/(dashboard)/admin/teachers/actions.ts',{
    '@/lib/auth-server':'export const getServerAuth=async()=>globalThis.staffLifecycle.actor;',
    '@/lib/supabase/admin':'export const createAdminClient=()=>globalThis.staffLifecycle.create();',
    '@/lib/supabase/server':'export const createClient=async()=>globalThis.staffLifecycle.service;',
  });
  const legacy=await clientFixture<{DELETE:(request:Request,context:{params:Promise<{id:string}>})=>Promise<Response>;PATCH:(request:Request,context:{params:Promise<{id:string}>})=>Promise<Response>}>('app/api/admin/users/[id]/route.ts',{
    '@/lib/auth-server':'export const getServerAuth=async()=>globalThis.staffLifecycle.actor;',
    '@/lib/supabase/admin':'export const createAdminClient=()=>globalThis.staffLifecycle.create();',
    '@/lib/supabase/server':'export const createClient=async()=>globalThis.staffLifecycle.service;',
  });
  const context=(target:string)=>({params:Promise.resolve({id:target})});
  const deletion=(target:string)=>legacy.DELETE(new Request('http://localhost/api/admin/users/'+target+'?force=true',{method:'DELETE'}),context(target));
  assert.equal((await deletion(id(2))).status,403);
  assert.equal((await legacy.PATCH(new Request('http://localhost/api/admin/users/'+id(2),{method:'PATCH',body:JSON.stringify({role:'admin'})}),context(id(2)))).status,403);
  await assert.rejects(actions.deleteStaffPermanentlyAction(id(2)));await assert.rejects(actions.resetStaffPasswordAction(id(2)));await assert.rejects(actions.updateStaffProfileAction(id(2),{role:'admin'}));await assert.rejects(actions.toggleStaffStatusAction(id(2),true));assert.equal(adminCreates,0,'Monitor rejection precedes privileged client creation');
  actor.role='admin';
  assert.equal((await deletion(id(3))).status,403,'Legacy API must not allow a foreign-school deletion');
  assert.equal((await deletion(id(2))).status,403,'Legacy API must preserve assignment and recorded attendance history');
  await assert.rejects(actions.resetStaffPasswordAction(id(3)),/សាលានេះ/);assert.deepEqual(calls,[]);
  await assert.rejects(actions.deleteStaffPermanentlyAction(id(4)),/ចុងក្រោយ/);assert.deepEqual(calls,[]);
  await assert.rejects(actions.deleteStaffPermanentlyAction(id(2)),/ប្រវត្តិទិន្នន័យ/);assert.deepEqual(calls,[]);
  attendanceCount=0;await assert.rejects(actions.deleteStaffPermanentlyAction(id(2)),/ប្រវត្តិទិន្នន័យ/);assigned=false;
  await actions.deleteStaffPermanentlyAction(id(2));assert.deepEqual(calls,['delete:'+id(2)]);assert.equal(audits[0].school_id,'a');
  actor.profile.is_active=false;await assert.rejects(actions.resetStaffPasswordAction(id(2)));assert.equal(calls.length,1);
});

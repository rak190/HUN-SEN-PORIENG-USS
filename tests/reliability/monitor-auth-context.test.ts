import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {JSDOM} from 'jsdom';
import {clientFixture} from '../helpers/client-fixture';
type ClassRow={id:string;school_id:string;academic_year_id:string;is_archived:boolean;monitor_id:string|null;teacher_id:string|null;name:string};
type Session={user:{id:string;user_metadata:{role:string}}}|null;
type AuthView={authStatus:string;profile:{role:string}|null;activeClass:ClassRow|null;classes:ClassRow[];login:(name:string,password:string,expectedRole?:string)=>Promise<{error?:string;role?:string}>;logout:()=>Promise<void>;refreshClasses:()=>Promise<void>};
test('actual AuthProvider: database role, school/year class resolution, reassignment, session recovery, inactive refresh and logout',async()=>{
  const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost/monitor/attendance'});
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','localStorage'])Object.defineProperty(globalThis,key,{value:(dom.window as unknown as Record<string,unknown>)[key],configurable:true,writable:true});
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  let session:Session=null;
  const listeners=new Set<(event:string,session:Session)=>void>();
  const profile={id:'monitor1',username:'monitor1',role:'monitor',school_id:'a',is_active:true};
  const year={id:'year-a',school_id:'a',is_active:true,status:'active',created_at:''};
  const classes:ClassRow[]=[
    {id:'a',name:'8A',school_id:'a',academic_year_id:'year-a',is_archived:false,monitor_id:'monitor1',teacher_id:'teacher'},
    {id:'b',name:'8B',school_id:'a',academic_year_id:'year-a',is_archived:false,monitor_id:null,teacher_id:'monitor1'},
    {id:'foreign',name:'8A',school_id:'b',academic_year_id:'year-a',is_archived:false,monitor_id:'monitor1',teacher_id:null},
    {id:'old',name:'8A',school_id:'a',academic_year_id:'old-year',is_archived:false,monitor_id:'monitor1',teacher_id:null},
    {id:'archived',name:'8Z',school_id:'a',academic_year_id:'year-a',is_archived:true,monitor_id:'monitor1',teacher_id:null},
  ];
  let profileReads=0,classNetworkError=false,pageMounts=0;
  const emit=(event:string)=>listeners.forEach(listener=>listener(event,session));
  const db={auth:{
    getSession:async()=>({data:{session}}),
    onAuthStateChange:(fn:(event:string,session:Session)=>void)=>{listeners.add(fn);queueMicrotask(()=>fn('INITIAL_SESSION',session));return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
    signInWithPassword:async()=>{session={user:{id:'monitor1',user_metadata:{role:'admin'}}};queueMicrotask(()=>emit('SIGNED_IN'));return{data:session,error:null};},
    signOut:async()=>{session=null;emit('SIGNED_OUT');return{error:null};},
  },from:(table:string)=>{
    const filters:Record<string,unknown>={};
    const data=()=>{
      if(table==='profiles'){profileReads++;return[profile];}
      if(table==='academic_years')return[year];
      if(table==='classes')return classes;
      return[];
    };
    const rows=()=>data().filter(row=>Object.entries(filters).every(([key,value])=>(row as unknown as Record<string,unknown>)[key]===value));
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters[key]=value;return query;},order:()=>query,limit:()=>query,maybeSingle:async()=>({data:rows()[0]||null,error:null}),then:(resolve:(value:unknown)=>void)=>{if(table==='classes'&&classNetworkError)throw new Error('Network unavailable');return Promise.resolve({data:structuredClone(rows()),error:null}).then(resolve);}};
    return query;
  }};
  Object.assign(globalThis,{monitorAuthDatabase:db});
  const auth=await clientFixture<{AuthProvider:React.ComponentType<React.PropsWithChildren>;useAuth:()=>AuthView}>('lib/auth-context.tsx',{'./supabase/client':'export const createClient=()=>globalThis.monitorAuthDatabase;'});
  const observed:{current:AuthView|null}={current:null};
  function StatefulPage(){React.useEffect(()=>{pageMounts++;},[]);return React.createElement('div',null,'Draft page');}
  function Consumer(){observed.current=auth.useAuth();return observed.current.authStatus==='authenticated'?React.createElement(StatefulPage):React.createElement('div',null,observed.current.authStatus);}
  const {render,waitFor,act,cleanup}=await import('@testing-library/react');
  const mount=()=>render(React.createElement(auth.AuthProvider,null,React.createElement(Consumer)));
  try{
    mount();await waitFor(()=>assert.equal(observed.current?.authStatus,'unauthenticated'));
    let login:{error?:string;role?:string}|undefined;
    await act(async()=>{login=await observed.current!.login('monitor1','synthetic-password','monitor');});
    assert.equal(login?.role,'monitor','Never authorize from mutable Auth user_metadata');
    await waitFor(()=>assert.equal(observed.current?.activeClass?.id,'a'));
    assert.deepEqual(observed.current?.classes.map(row=>row.id),['a']);
    profile.role='teacher';
    await act(async()=>{emit('TOKEN_REFRESHED');});await waitFor(()=>assert.equal(observed.current?.profile?.role,'teacher'));
    await waitFor(()=>assert.equal(observed.current?.activeClass?.id,'b'));
    const teacherReads=profileReads;profile.role='monitor';
    await act(async()=>{emit('TOKEN_REFRESHED');});await waitFor(()=>assert.equal(observed.current?.profile?.role,'monitor'));
    await waitFor(()=>assert.equal(observed.current?.activeClass?.id,'a'));
    assert.ok(profileReads>teacherReads,'A previous Teacher session must not retain privileges after a database role change');
    classes[0].monitor_id=null;classes[1].monitor_id='monitor1';
    await act(async()=>{await observed.current!.refreshClasses();});assert.equal(observed.current?.activeClass?.id,'b');
    const mounts=pageMounts;await act(async()=>{dom.window.dispatchEvent(new dom.window.Event('focus'));});await waitFor(()=>assert.equal(observed.current?.authStatus,'authenticated'));assert.equal(pageMounts,mounts,'Focus/session verification must not unmount a page with drafts');
    classNetworkError=true;await act(async()=>{await observed.current!.refreshClasses();});assert.equal(observed.current?.activeClass?.id,'b','A network failure must not discard a verified same-user context');classNetworkError=false;
    cleanup();mount();await waitFor(()=>assert.equal(observed.current?.activeClass?.id,'b','Reload recovers the authoritative assignment'));
    classes[1].monitor_id=null;
    await act(async()=>{await observed.current!.refreshClasses();});assert.deepEqual(observed.current?.classes,[]);assert.equal(observed.current?.activeClass,null,'No teacher_id or all-school fallback for an unassigned Monitor');
    const reads=profileReads;profile.is_active=false;
    await act(async()=>{emit('TOKEN_REFRESHED');});await waitFor(()=>assert.equal(observed.current?.authStatus,'error'));assert.ok(profileReads>reads,'Token refresh rechecks an active Monitor profile');assert.equal(observed.current?.activeClass,null);
    await act(async()=>{login=await observed.current!.login('monitor1','synthetic-password','monitor');});assert.ok(login?.error,'Inactive accounts cannot log in even when the Auth layer returns a user');
    profile.is_active=true;classes[0].monitor_id='monitor1';
    await act(async()=>{login=await observed.current!.login('monitor1','synthetic-password','monitor');});await waitFor(()=>assert.equal(observed.current?.activeClass?.id,'a'));
    await act(async()=>{await observed.current!.logout();});assert.equal(observed.current?.activeClass,null);assert.deepEqual(observed.current?.classes,[]);assert.equal(observed.current?.profile,null);assert.equal(observed.current?.authStatus,'unauthenticated');
  }finally{cleanup();dom.window.close();}
});

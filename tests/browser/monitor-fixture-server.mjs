/** Local UI fixture only. No Supabase connection or real account/student data.
 * Run after npm run build: node tests/browser/monitor-fixture-server.mjs
 * Then use the Playwright CLI script documented in docs/MONITOR_ROLE_READINESS.md.
 */
import {build} from 'esbuild';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';
import Attendance from './app/(dashboard)/monitor/attendance/page';
import Missing from './app/(dashboard)/monitor/missing/page';
import Teachers from './app/(dashboard)/admin/teachers/page';
import Classes from './app/(dashboard)/admin/classes/page';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Phnom_Penh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const roster=Array.from({length:50},(_,i)=>({id:'student-'+i,name:'សិស្សសាកល្បង '+String(i+1).padStart(2,'0'),gender:i%2?'M':'F'}));
const classes=[{id:'a',name:'8A',grade:'8',academic_year_id:'year',teacher_id:'teacher',monitor_id:'monitor1',is_archived:false},{id:'b',name:'8B',grade:'8',academic_year_id:'year',teacher_id:'teacher',monitor_id:'monitor2',is_archived:false}];
const users=[{id:'monitor1',name:'Monitor One',username:'one',role:'monitor',is_active:true,status:'សកម្ម',created_at:''},{id:'monitor2',name:'Monitor Two',username:'two',role:'monitor',is_active:true,status:'សកម្ម',created_at:''},{id:'inactive',name:'Inactive Monitor',username:'inactive',role:'monitor',is_active:false,status:'បានផ្អាក',created_at:''},{id:'teacher',name:'Teacher',username:'teacher',role:'teacher',is_active:true,status:'សកម្ម',created_at:''}];
let records=JSON.parse(sessionStorage.getItem('monitor-fixture-records')||'[]');
const workspace=()=>({students:roster,records,missingDays:records.length===roster.length?[]:[today],canRecord:true,today});
globalThis.monitorFixture={auth:{activeClass:classes[0],classesLoading:false,authError:null},failNext:false,calls:0,assignments:[],load:async()=>({success:true,workspace:workspace()}),save:async input=>{globalThis.monitorFixture.calls++;await new Promise(r=>setTimeout(r,400));if(globalThis.monitorFixture.failNext){globalThis.monitorFixture.failNext=false;return{success:false,error:'បណ្ដាញដាច់។ ទិន្នន័យព្រាងនៅរក្សាទុក។'};}records=input.records.map(r=>({...r,updated_at:new Date().toISOString()}));sessionStorage.setItem('monitor-fixture-records',JSON.stringify(records));return{success:true,workspace:workspace()};},assign:async input=>{globalThis.monitorFixture.assignments.push(input);if(input.previousClassId)classes.find(c=>c.id===input.previousClassId).monitor_id=null;classes.find(c=>c.id===input.classId).monitor_id=input.monitorId;return{success:true};}};
globalThis.fetch=async(input,init)=>{const url=String(input);if(init?.method==='POST')return new Response(JSON.stringify({users:[],errors:[]}));if(url.includes('academic-years'))return new Response(JSON.stringify({academicYears:[{id:'year',name:'2026-2027',is_active:true}]}));if(url.includes('/api/admin/classes'))return new Response(JSON.stringify({classes}));return new Response(JSON.stringify({users:users.map(u=>({...u,monitor_classes:classes.filter(c=>c.monitor_id===u.id)})),monitorClasses:classes}));};
const Page=location.pathname.includes('/admin/teachers')?Teachers:location.pathname.includes('/admin/classes')?Classes:location.pathname.includes('/missing')?Missing:Attendance;
createRoot(document.getElementById('root')).render(<Page/>);
`;
const stubs={
  '@/lib/auth-context':'export const useAuth=()=>globalThis.monitorFixture.auth;',
  'next/navigation':'export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>location.href=url});',
  '@/app/(dashboard)/attendance/actions':'export const loadAttendanceWorkspaceAction=(...a)=>globalThis.monitorFixture.load(...a);export const submitMonitorAttendanceAction=(...a)=>globalThis.monitorFixture.save(...a);',
  '../monitors/actions':'export const assignClassMonitorAction=(...a)=>globalThis.monitorFixture.assign(...a);',
  './actions':'export const toggleStaffStatusAction=async()=>({});export const resetStaffPasswordAction=async()=>({});export const deleteStaffPermanentlyAction=async()=>({});export const updateStaffProfileAction=async()=>({});',
};
(async()=>{
  const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'local-fixtures',setup(b){b.onResolve({filter:/.*/},args=>Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}));}}]});
  const cssDir=path.join(root,'.next/static/css');
  if(!fs.existsSync(cssDir))throw new Error('Run npm run build before browser QA.');
  const css=fs.readdirSync(cssDir).filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join(cssDir,name),'utf8')).join('\n');
  const staticRoot=path.resolve(root,'.next/static');
  http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(bundle.outputFiles[0].contents);return;}
    if(url.pathname==='/fixture.css'){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(css);return;}
    if(url.pathname.startsWith('/_next/static/')){const target=path.resolve(staticRoot,'.'+decodeURIComponent(url.pathname.slice('/_next/static'.length)));if(!target.startsWith(staticRoot+path.sep)||!fs.existsSync(target)){res.writeHead(404).end();return;}res.setHeader('Content-Type',target.endsWith('.woff2')?'font/woff2':'application/octet-stream');fs.createReadStream(target).pipe(res);return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="km"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Monitor local QA — synthetic data</title><link rel="stylesheet" href="/fixture.css"><body style="margin:0;background:#f8fafc"><div id="root"></div><script src="/fixture.js"></script></body></html>');
  }).listen(4187,'127.0.0.1',()=>console.log('Synthetic Monitor QA: http://127.0.0.1:4187/monitor/attendance'));
})();

import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {JSDOM} from 'jsdom';
import {clientFixture} from '../helpers/client-fixture';
type Assignment={classId:string;yearId:string;monitorId:string|null;previousMonitorId:string|null;previousClassId:string|null};
test('existing Admin account/class grids: searchable Monitor selection, confirmations, creation payload and canonical failure recovery',async()=>{
  const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost/admin/teachers'});
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','MouseEvent'])Object.defineProperty(globalThis,key,{value:(dom.window as unknown as Record<string,unknown>)[key],configurable:true,writable:true});
  let confirmation=true,failAssignment=false;
  const assignments:Assignment[]=[],created:Record<string,unknown>[]=[],alerts:string[]=[];
  const classes=[{id:'class-a',name:'8A',monitor_id:'monitor1',academic_year_id:'year-a',grade:'8',teacher_id:'teacher1',is_archived:false},{id:'class-b',name:'8B',monitor_id:'monitor2',academic_year_id:'year-a',grade:'8',teacher_id:'teacher1',is_archived:false}];
  const accounts=[{id:'monitor1',name:'Monitor One',username:'one',role:'monitor',roleKh:'ប្រធានថ្នាក់',is_active:true,status:'សកម្ម',created_at:''},{id:'monitor2',name:'Monitor Two',username:'two',role:'monitor',roleKh:'ប្រធានថ្នាក់',is_active:true,status:'សកម្ម',created_at:''},{id:'inactive',name:'Inactive Monitor',username:'inactive',role:'monitor',roleKh:'ប្រធានថ្នាក់',is_active:false,status:'បានផ្អាក',created_at:''},{id:'teacher1',name:'Teacher',username:'teacher',role:'teacher',roleKh:'គ្រូ',is_active:true,status:'សកម្ម',created_at:''}];
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,alert:(message:string)=>alerts.push(message),monitorAdminActions:{assign:async(value:Assignment)=>{assignments.push(value);if(failAssignment)throw new Error('ការចាត់ថ្នាក់បានផ្លាស់ប្ដូរ។');if(value.previousClassId){classes.find(c=>c.id===value.previousClassId)!.monitor_id='';}classes.find(c=>c.id===value.classId)!.monitor_id=value.monitorId||'';return{success:true};}}});
  dom.window.confirm=()=>confirmation;
  Object.assign(globalThis,{confirm:()=>confirmation});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init)=>{
    const url=String(input);
    if(init?.method==='POST'){created.push(JSON.parse(String(init.body)));return new Response(JSON.stringify({users:[],errors:[]}),{status:200});}
    if(url.includes('academic-years'))return new Response(JSON.stringify({academicYears:[{id:'year-a',name:'2026-2027',is_active:true}]}));
    if(url.includes('/api/admin/classes'))return new Response(JSON.stringify({classes}));
    return new Response(JSON.stringify({users:accounts.map(a=>({...a,monitor_classes:classes.filter(c=>c.monitor_id===a.id)})),monitorClasses:classes}));
  };
  const stubs={'../monitors/actions':'export const assignClassMonitorAction=(...args)=>globalThis.monitorAdminActions.assign(...args);','./actions':'export const toggleStaffStatusAction=async()=>({success:true});export const resetStaffPasswordAction=async()=>({});export const deleteStaffPermanentlyAction=async()=>({});export const updateStaffProfileAction=async()=>({});'};
  const Teacher=(await clientFixture<{default:React.ComponentType}>('app/(dashboard)/admin/teachers/page.tsx',stubs)).default;
  const Classes=(await clientFixture<{default:React.ComponentType}>('app/(dashboard)/admin/classes/page.tsx',stubs)).default;
  const {render,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
  try{
    const view=render(React.createElement(Teacher));
    let combo=await view.findByRole('combobox',{name:'ថ្នាក់ដែលទទួលបន្ទុក Monitor One'}) as HTMLInputElement;
    await waitFor(()=>assert.equal(combo.value,'8A'));confirmation=false;
    fireEvent.focus(combo);fireEvent.change(combo,{target:{value:'8B'}});fireEvent.click(view.getByRole('option',{name:'8B · មានប្រធានថ្នាក់'}));assert.equal(assignments.length,0);assert.equal(combo.value,'8A','A cancelled confirmation must not display an unsaved class');
    confirmation=true;fireEvent.focus(combo);fireEvent.change(combo,{target:{value:'8B'}});fireEvent.click(view.getByRole('option',{name:'8B · មានប្រធានថ្នាក់'}));
    await waitFor(()=>assert.equal(assignments.length,1));
    assert.deepEqual(assignments[0],{classId:'class-b',yearId:'year-a',monitorId:'monitor1',previousMonitorId:'monitor2',previousClassId:'class-a'});
    combo=await view.findByRole('combobox',{name:'ថ្នាក់ដែលទទួលបន្ទុក Monitor One'}) as HTMLInputElement;await waitFor(()=>assert.equal(combo.value,'8B'));
    fireEvent.click(view.getByRole('button',{name:'ដកការចាត់ ថ្នាក់ដែលទទួលបន្ទុក Monitor One'}));await waitFor(()=>assert.equal(assignments.length,2));assert.equal(assignments[1].monitorId,null);
    await view.findByRole('combobox',{name:'ថ្នាក់ដែលទទួលបន្ទុក Monitor One'});
    const draftRole=view.container.querySelector('select[data-col="1"][data-row="4"]') || [...view.container.querySelectorAll('select[data-col="1"]')].at(-5);
    assert.ok(draftRole);fireEvent.change(draftRole,{target:{value:'monitor'}});
    const draft=view.getByRole('combobox',{name:'ថ្នាក់ដែលទទួលបន្ទុកថ្មី 1'});
    fireEvent.focus(draft);fireEvent.change(draft,{target:{value:'8A'}});fireEvent.click(view.getByRole('option',{name:'8A · ទំនេរ'}));
    const row=(draftRole as HTMLElement).closest('tr')!;
    fireEvent.change(row.querySelector('input[data-col="0"]')!,{target:{value:'New Monitor'}});
    fireEvent.change(row.querySelector('input[data-col="4"]')!,{target:{value:'new.monitor'}});
    fireEvent.click(view.getByRole('button',{name:/រក្សាទុកគណនី \(1\)/}));
    await waitFor(()=>assert.equal(created.length,1));assert.equal((created[0].users as Record<string,unknown>[])[0].monitorClassId,'class-a');
    cleanup();
    classes[0].monitor_id='monitor1';classes[1].monitor_id='monitor2';failAssignment=true;
    const directory=render(React.createElement(Classes));
    const monitor=await directory.findByRole('combobox',{name:'ប្រធានថ្នាក់ 8A'}) as HTMLInputElement;
    fireEvent.focus(monitor);fireEvent.change(monitor,{target:{value:'Inactive Monitor'}});assert.equal(directory.queryByRole('option',{name:/Inactive Monitor/}),null,'Inactive accounts are not eligible options');
    fireEvent.change(monitor,{target:{value:'Monitor Two'}});fireEvent.click(directory.getByRole('option',{name:'Monitor Two · មានថ្នាក់រួចហើយ'}));
    await waitFor(()=>assert.ok(alerts.includes('ការចាត់ថ្នាក់បានផ្លាស់ប្ដូរ។')));
    const restored=await directory.findByRole('combobox',{name:'ប្រធានថ្នាក់ 8A'}) as HTMLInputElement;await waitFor(()=>assert.equal(restored.value,'Monitor One','A failed save reloads the canonical assignment'));
  }finally{globalThis.fetch=originalFetch;cleanup();dom.window.close();}
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { clientFixture } from '../helpers/client-fixture';
import { phnomPenhToday, type AttendanceWorkspace } from '../../lib/attendance/types';
import type { SubmitMonitorAttendancePayload } from '../../app/(dashboard)/attendance/actions';
type Services={auth:{activeClass:{id:string;academic_year_id:string;name:string}|null;authError:null};load:()=>Promise<{success:boolean;workspace?:AttendanceWorkspace;error?:string}>;save:(payload:SubmitMonitorAttendancePayload)=>Promise<{success:boolean;workspace?:AttendanceWorkspace;error?:string}>};
const stubs={
  '@/lib/auth-context':'export const useAuth=()=>globalThis.monitorFixture.auth;',
  'next/navigation':"export const useSearchParams=()=>new URLSearchParams();export const useRouter=()=>({push:()=>{}});",
  '@/app/(dashboard)/attendance/actions':'export const loadAttendanceWorkspaceAction=(...args)=>globalThis.monitorFixture.load(...args);export const submitMonitorAttendanceAction=(...args)=>globalThis.monitorFixture.save(...args);',
};
test('actual Monitor pages: four statuses, safe network failure, duplicate-click guard, reload and missing-day state',async()=>{
  const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost/monitor/attendance'});
  for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Event','MouseEvent'])Object.defineProperty(globalThis,key,{value:(dom.window as unknown as Record<string,unknown>)[key],configurable:true,writable:true});
  let confirmResult=true;
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,confirm:()=>confirmResult});
  const workspace:AttendanceWorkspace={students:Array.from({length:40},(_,i)=>({id:`student-${i}`,name:`Student ${i}`,gender:'F'})),records:[],missingDays:[phnomPenhToday()],canRecord:true,today:phnomPenhToday()};
  let calls=0,received:SubmitMonitorAttendancePayload|undefined,release:((value:{success:boolean;error:string})=>void)|undefined;
  const fixture:Services={auth:{activeClass:{id:'class-a',academic_year_id:'year-a',name:'8A'},authError:null},load:async()=>({success:true,workspace:structuredClone(workspace)}),save:async payload=>{calls++;received=payload;return new Promise(resolve=>{release=resolve;});}};
  Object.assign(globalThis,{monitorFixture:fixture});
  const Page=(await clientFixture<{default:React.ComponentType}>('app/(dashboard)/monitor/attendance/page.tsx',stubs)).default;
  const Missing=(await clientFixture<{default:React.ComponentType}>('app/(dashboard)/monitor/missing/page.tsx',stubs)).default;
  const {render,fireEvent,waitFor,cleanup,act}=await import('@testing-library/react');
  try{
    const view=render(React.createElement(Page));
    await view.findByText('Student 39');
    let present=view.getAllByRole('button',{name:'វត្តមាន (វ)'});
    assert.equal(present.length,40);
    fireEvent.click(present[0]);assert.ok(view.getByRole('button',{name:'អត់ច្បាប់ (អ.ច)'}));
    fireEvent.click(view.getByRole('button',{name:'អត់ច្បាប់ (អ.ច)'}));assert.ok(view.getByRole('button',{name:'មកយឺត (យ)'}));
    fireEvent.click(view.getByRole('button',{name:'មកយឺត (យ)'}));assert.ok(view.getByRole('button',{name:'ច្បាប់ (ច)'}));
    present=view.getAllByRole('button',{name:'វត្តមាន (វ)'});fireEvent.click(present[0]);fireEvent.click(view.getByRole('button',{name:'អត់ច្បាប់ (អ.ច)'}));
    fireEvent.click(view.getAllByRole('button',{name:'វត្តមាន (វ)'})[0]);
    confirmResult=false;
    const date=view.getByLabelText('កាលបរិច្ឆេទវត្តមាន') as HTMLInputElement;
    const originalDate=date.value;fireEvent.change(date,{target:{value:'2026-10-01'}});assert.equal(date.value,originalDate);
    const before=new dom.window.Event('beforeunload',{cancelable:true});dom.window.dispatchEvent(before);assert.equal(before.defaultPrevented,true);
    const submit=view.getByRole('button',{name:'បញ្ជូនទៅគ្រូបន្ទុកថ្នាក់'});
    fireEvent.click(submit);fireEvent.click(submit);assert.equal(calls,1);
    assert.equal((submit as HTMLButtonElement).disabled,true);
    await act(async()=>release?.({success:false,error:'បណ្ដាញដាច់។ ទិន្នន័យព្រាងនៅរក្សាទុក។'}));
    await view.findByText('បណ្ដាញដាច់។ ទិន្នន័យព្រាងនៅរក្សាទុក។');
    assert.ok(view.getByRole('button',{name:'ច្បាប់ (ច)'}));assert.ok(view.getByRole('button',{name:'មកយឺត (យ)'}));assert.ok(view.getByRole('button',{name:'អត់ច្បាប់ (អ.ច)'}));
    fixture.save=async payload=>{received=payload;workspace.records=payload.records.map(record=>({student_id:record.student_id,status:record.status,updated_at:'2026-10-30T00:00:00+00:00'}));workspace.missingDays=[];return{success:true,workspace:structuredClone(workspace)};};
    fireEvent.click(view.getByRole('button',{name:'បញ្ជូនទៅគ្រូបន្ទុកថ្នាក់'}));
    await view.findByText('បញ្ជូនវត្តមានប្រចាំថ្ងៃទៅកាន់គ្រូដោយជោគជ័យ!');
    assert.equal(received?.records.length,40);assert.equal(received?.records[0].status,'permission');assert.equal(received?.records[1].status,'late');assert.equal(received?.records[2].status,'absent');assert.equal(received?.records[3].status,'present');
    assert.ok(received?.records.every(row=>row.previous_updated_at===null));
    cleanup();
    const reloadView=render(React.createElement(Page));await reloadView.findByRole('button',{name:'មកយឺត (យ)'});assert.ok(reloadView.getByRole('button',{name:'ច្បាប់ (ច)'}));
    cleanup();
    const missing=render(React.createElement(Missing));await missing.findByText('ល្អណាស់!');cleanup();
    fixture.auth.activeClass=null;
    const unassigned=render(React.createElement(Missing));await unassigned.findByText(/មិនទាន់បានចាត់ថ្នាក់ឱ្យអ្នកទេ/);assert.equal(unassigned.queryByText('ល្អណាស់!'),null);cleanup();
    fixture.auth.activeClass={id:'class-a',academic_year_id:'year-a',name:'8A'};fixture.load=async()=>({success:false,error:'មិនអាចផ្ទុកវត្តមានបានទេ។'});
    const failed=render(React.createElement(Page));await failed.findByText('មិនអាចផ្ទុកវត្តមានបានទេ។');await waitFor(()=>assert.equal((failed.getByRole('button',{name:'បញ្ជូនទៅគ្រូបន្ទុកថ្នាក់'}) as HTMLButtonElement).disabled,true));
  }finally{cleanup();dom.window.close();}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {JSDOM} from 'jsdom';
import {clientFixture} from '../helpers/client-fixture';
import {phnomPenhToday} from '../../lib/attendance/types';

test('Teacher form detects stale manual summaries, counts complete Monitor days and explicitly reconciles zero-record students',async()=>{
  const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost/attendance'});
  for(const key of ['window','document','navigator','HTMLElement','Node','Event'])Object.defineProperty(globalThis,key,{value:(dom.window as unknown as Record<string,unknown>)[key],configurable:true,writable:true});
  const students=['a','b','c'].map(id=>({id,full_name:'Student '+id,gender:'F',student_id_number:id}));
  const summaries=[{student_id:'a',absent_count:9,permission_count:0,late_count:0},{student_id:'b',absent_count:0,permission_count:5,late_count:0},{student_id:'c',absent_count:4,permission_count:0,late_count:0},{student_id:'transferred',absent_count:7}];
  const records=[{student_id:'a',date:phnomPenhToday(),status:'L'},{student_id:'b',date:phnomPenhToday(),status:'E'},{student_id:'transferred',date:phnomPenhToday(),status:'A'}];
  const auth={activeClass:{id:'class',academic_year_id:'year',name:'8A'},user:{id:'teacher'},profile:{role:'teacher',school_id:'school'},activeAcademicYear:{id:'year'}};
  const filters:{table:string;key:string;value:unknown}[]=[];
  const db={from:(table:string)=>{
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.push({table,key,value});return query;},order:()=>query,gte:()=>query,lte:()=>query,then:(resolve:(value:unknown)=>void)=>Promise.resolve({data:structuredClone(table==='active_class_rosters'?students:table==='monthly_attendance_summaries'?summaries:records),error:null}).then(resolve)};
    return query;
  }};
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,confirm:()=>true,teacherMonitorFixture:{auth,db}});
  const Form=(await clientFixture<{default:React.ComponentType}>('components/attendance/MonthlyAttendanceForm.tsx',{
    '@/lib/auth-context':'export const useAuth=()=>globalThis.teacherMonitorFixture.auth;',
    '@/lib/supabase/client':'export const createClient=()=>globalThis.teacherMonitorFixture.db;',
    '@/lib/cache/client-cache':'export const buildCacheKey=()=>"fixture";export const getOrFetchScoped=async(key,fetcher)=>({data:await fetcher()});export const invalidateClassAttendance=()=>{};',
    'next/link':'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children);}',
  })).default;
  const {render,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
  try{
    const view=render(React.createElement(Form));
    await view.findByText(/សង្ខេបកែដោយគ្រូខុសនឹងវត្តមានប្រចាំថ្ងៃ៖ 3 នាក់/);
    assert.equal(view.queryByText('Student transferred'),null);
    const card=view.getByText('កំណត់ត្រាប្រធានថ្នាក់').parentElement!;
    assert.equal(card.querySelector('span.text-2xl')?.textContent,'0','A partial date is not a completed class submission');
    assert.ok(filters.some(f=>f.table==='active_class_rosters'&&f.key==='academic_year_id'&&f.value==='year'));
    assert.ok(filters.some(f=>f.table==='attendance_records'&&f.key==='academic_year_id'&&f.value==='year'));
    fireEvent.click(view.getByRole('button',{name:'យកចំនួនតាមវត្តមានប្រចាំថ្ងៃ'}));
    await waitFor(()=>assert.equal((view.container.querySelector('#input-0-0') as HTMLInputElement).value,''));
    assert.equal((view.container.querySelector('#input-1-1') as HTMLInputElement).value,'1','E means permission');
    assert.equal((view.container.querySelector('#input-2-0') as HTMLInputElement).value,'','Explicit reconciliation clears obsolete manual counts even without a daily record');
    assert.equal(view.queryByRole('button',{name:'យកចំនួនតាមវត្តមានប្រចាំថ្ងៃ'}),null);
  }finally{cleanup();dom.window.close();}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarMonthBounds,dailyAttendanceCounts,attendanceHistory,attendanceCoverage} from '../../lib/attendance/summary';
test('all canonical and legacy statuses agree across daily records, history and monthly counts',()=>{
  const records=['P','A','L','E','present','absent','late','permission'].map((status,i)=>({student_id:'s1',date:`2026-11-${String(i+1).padStart(2,'0')}`,status}));
  assert.deepEqual(dailyAttendanceCounts(records),{s1:{absent_count:2,permission_count:2,late_count:2}});
  assert.throws(()=>dailyAttendanceCounts([...records,records[0]]),/ស្ទួន/);
  assert.throws(()=>dailyAttendanceCounts([{student_id:'s1',date:'2026-11-01',status:'unknown'}]));
  const history=attendanceHistory([{student_id:'s1',date:'2026-11-02',status:'present',updated_at:'2026-11-02T09:00:00Z'}],['s1','s2']);
  assert.equal(history[0].status,'draft');assert.equal(history[0].submitted_student_count,1);
  assert.equal(attendanceHistory([...records],['s1']).every(row=>row.status==='submitted'),true);
  const transferred=attendanceHistory([{student_id:'s1',date:'2026-11-02',status:'present'},{student_id:'transferred',date:'2026-11-02',status:'present'}],['s1','s2']);
  assert.equal(transferred[0].status,'draft','A former student record must not disguise a missing current student');
  assert.equal(transferred[0].submitted_student_count,1);
});
test('month boundaries use valid exact dates across February, leap years and December',()=>{
  assert.deepEqual(calendarMonthBounds('2026-02'),{start:'2026-02-01',end:'2026-02-28',next:'2026-03-01'});
  assert.equal(calendarMonthBounds('2028-02').end,'2028-02-29');assert.equal(calendarMonthBounds('2026-11').end,'2026-11-30');assert.equal(calendarMonthBounds('2026-12').next,'2027-01-01');assert.throws(()=>calendarMonthBounds('2026-13'));
});
test('Admin compliance never treats a partial class or a single recorded day as 100% attendance submission',()=>{
  const dates=['2026-11-02','2026-11-03'];
  const partial=[{student_id:'a',date:dates[0],status:'present'}];
  assert.deepEqual(attendanceCoverage(partial,['a','b'],dates),{required:2,completed:0,rate:0});
  assert.deepEqual(attendanceCoverage([...partial,{student_id:'b',date:dates[0],status:'absent'}],['a','b'],dates),{required:2,completed:1,rate:50});
  assert.equal(attendanceCoverage([],['a','b'],[]).rate,null);
});

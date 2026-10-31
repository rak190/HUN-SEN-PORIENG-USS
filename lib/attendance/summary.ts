import { normalizeAttendance } from './types';
export type DailyRecord={student_id:string;date:string;status:string;updated_at?:string|null;recorded_by?:string|null};
export type AttendanceCounts={absent_count:number;permission_count:number;late_count:number};
export function dailyAttendanceCounts(records:DailyRecord[]):Record<string,AttendanceCounts>{
  const sums:Record<string,AttendanceCounts>={};
  const seen=new Set<string>();
  for(const record of records){
    const key=`${record.student_id}:${record.date}`;
    if(seen.has(key))throw new Error('វត្តមានស្ទួន។ សូមឱ្យអ្នកគ្រប់គ្រងពិនិត្យ។');
    seen.add(key);const status=normalizeAttendance(record.status);
    if(!status)throw new Error('ស្ថានភាពវត្តមានមិនត្រឹមត្រូវ។');
    const counts=sums[record.student_id]||={absent_count:0,permission_count:0,late_count:0};
    if(status==='absent')counts.absent_count++;
    if(status==='permission')counts.permission_count++;
    if(status==='late')counts.late_count++;
  }
  return sums;
}
export function calendarMonthBounds(month:string){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('ខែមិនត្រឹមត្រូវ។');
  const [year,index]=month.split('-').map(Number);
  return {start:`${month}-01`,end:new Date(Date.UTC(year,index,0)).toISOString().slice(0,10),next:new Date(Date.UTC(year,index,1)).toISOString().slice(0,10)};
}
export function attendanceHistory(records:DailyRecord[],studentIds:string[],teacherId?:string|null){
  const roster=new Set(studentIds),expected=roster.size;
  const byDate=new Map<string,DailyRecord[]>();
  for(const row of records)byDate.set(row.date,[...(byDate.get(row.date)||[]),row]);
  return [...byDate].sort(([a],[b])=>b.localeCompare(a)).map(([date,rows])=>{
    const count=new Set(rows.filter(row=>roster.has(row.student_id)).map(row=>row.student_id)).size;
    return{id:date,attendance_date:date,status:expected>0&&count===expected?'submitted':'draft',expected_student_count:expected,submitted_student_count:count,submitted_at:rows.map(row=>row.updated_at||'').sort().at(-1)||null,review_comment:null,submitter:rows.every(row=>row.recorded_by===teacherId)?'គ្រូបន្ទុកថ្នាក់':'ប្រធានថ្នាក់ / អ្នកកត់ត្រាវត្តមាន'};
  });
}
export function attendanceCoverage(records:DailyRecord[],studentIds:string[],schoolDates:string[]){
  const required=new Set([...schoolDates,...records.map(row=>row.date)]);
  const byDate=new Map<string,Set<string>>();
  for(const row of records)byDate.set(row.date,new Set([...(byDate.get(row.date)||[]),row.student_id]));
  const completed=[...required].filter(date=>studentIds.length>0&&studentIds.every(id=>byDate.get(date)?.has(id))).length;
  return{required:studentIds.length?required.size:0,completed,rate:studentIds.length&&required.size?Math.round(completed/required.size*100):null};
}

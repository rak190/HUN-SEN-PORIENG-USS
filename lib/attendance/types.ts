export type AttendanceStatus='present'|'absent'|'late'|'permission';
export type AttendanceRow={student_id:string;status:string;updated_at:string|null;root_cause?:string|null};
export type AttendanceWorkspace={students:Array<{id:string;name:string;gender:string}>;records:AttendanceRow[];missingDays:string[];canRecord:boolean;today:string};
export const phnomPenhToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Phnom_Penh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function normalizeAttendance(status:string):AttendanceStatus|null {
  if(status==='present'||status==='P')return 'present';
  if(['absent','A','unexcused'].includes(status))return 'absent';
  if(['permission','E','excused'].includes(status))return 'permission';
  if(status==='late'||status==='L')return 'late';
  return null;
}

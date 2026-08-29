'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RoomDistribution, AllocationConfig } from '@/lib/exam-allocation-engine';

/**
 * Fetches all physical exam rooms
 */
export async function getExamRooms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam_rooms')
    .select('*')
    .order('room_number', { ascending: true });

  if (error) {
    console.error('Error fetching exam rooms:', error);
    return [];
  }

  // Sort numerically by room_number
  return (data || []).sort((a, b) => {
    const nA = parseInt(a.room_number, 10) || 0;
    const nB = parseInt(b.room_number, 10) || 0;
    return nA - nB;
  });
}

/**
 * Fetches all exam events
 */
export async function getExamEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching exam events:', error);
    return [];
  }
  return data || [];
}

/**
 * Creates or updates an Exam Event
 */
export async function saveExamEvent(payload: {
  id?: string;
  title: string;
  academic_year: string;
  period: string;
  exam_date?: string;
  target_students_per_room: number;
  distribution_method: string;
  student_ordering: string;
  mixing_mode: string;
  status?: string;
}) {
  const supabase = await createClient();

  if (payload.id) {
    const { data, error } = await supabase
      .from('exam_events')
      .update({
        title: payload.title,
        academic_year: payload.academic_year,
        period: payload.period,
        exam_date: payload.exam_date,
        target_students_per_room: payload.target_students_per_room,
        distribution_method: payload.distribution_method,
        student_ordering: payload.student_ordering,
        mixing_mode: payload.mixing_mode,
        status: payload.status || 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/exam-rooms');
    return data;
  } else {
    const { data, error } = await supabase
      .from('exam_events')
      .insert({
        title: payload.title,
        academic_year: payload.academic_year,
        period: payload.period,
        exam_date: payload.exam_date,
        target_students_per_room: payload.target_students_per_room,
        distribution_method: payload.distribution_method,
        student_ordering: payload.student_ordering,
        mixing_mode: payload.mixing_mode,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/exam-rooms');
    return data;
  }
}

/**
 * Loads all active students with class information for candidate allocation
 */
export async function getEligibleCandidates(gradeFilter?: string, trackFilter?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('id, student_id_number, desk_number, full_name, gender, dob, class_id, classes(id, name, grade, track)')
    .eq('is_active', true);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching candidates:', error);
    return [];
  }

  let list = (data || []).map((s: any) => ({
    id: s.id,
    student_id: s.id,
    full_name: s.full_name,
    student_id_number: s.student_id_number,
    desk_number: s.desk_number,
    gender: s.gender,
    dob: s.dob,
    class_id: s.class_id,
    class_name: s.classes?.name || '',
    grade: s.classes?.grade || '',
    track: s.classes?.track || null,
  }));

  if (gradeFilter && gradeFilter !== 'all') {
    list = list.filter(c => String(c.grade) === gradeFilter);
  }

  if (trackFilter && trackFilter !== 'all') {
    list = list.filter(c => (c.track || '').toLowerCase() === trackFilter.toLowerCase());
  }

  return list;
}

/**
 * Fetches existing seat assignments for an exam event
 */
export async function getExamSeatAssignments(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam_seat_assignments')
    .select('*, exam_rooms(id, room_number, building, capacity), students(id, student_id_number, desk_number, full_name, gender, dob, class_id, classes(id, name, grade, track))')
    .eq('exam_event_id', eventId)
    .order('exam_order_number', { ascending: true });

  if (error) {
    console.error('Error fetching seat assignments:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    exam_event_id: row.exam_event_id,
    student_id: row.student_id,
    exam_room_id: row.exam_room_id,
    room_number: row.exam_rooms?.room_number || '',
    exam_order_number: row.exam_order_number,
    seat_number: row.seat_number,
    status: row.status,
    note: row.note,
    candidate: {
      id: row.students?.id,
      student_id: row.students?.id,
      full_name: row.students?.full_name,
      student_id_number: row.students?.student_id_number,
      desk_number: row.students?.desk_number,
      gender: row.students?.gender,
      dob: row.students?.dob,
      class_id: row.students?.class_id,
      class_name: row.students?.classes?.name || '',
      grade: row.students?.classes?.grade || '',
      track: row.students?.classes?.track || null
    }
  }));
}

/**
 * Saves or updates draft/published seat assignments in Supabase
 */
export async function saveSeatAssignments(
  eventId: string,
  distributions: RoomDistribution[],
  config: AllocationConfig
) {
  const supabase = await createClient();

  // 1. Prepare flat assignment rows
  const assignmentRows: any[] = [];
  distributions.forEach(dist => {
    dist.candidates.forEach(item => {
      assignmentRows.push({
        exam_event_id: eventId,
        student_id: item.candidate.student_id,
        exam_room_id: dist.roomId,
        exam_order_number: item.examOrderNumber,
        seat_number: item.seatNumber,
        status: item.status || 'registered'
      });
    });
  });

  // 2. Delete existing assignments for this event
  const { error: delErr } = await supabase
    .from('exam_seat_assignments')
    .delete()
    .eq('exam_event_id', eventId);

  if (delErr) {
    throw new Error('កំហុសក្នុងការសម្អាតទិន្នន័យចាស់៖ ' + delErr.message);
  }

  // 3. Batch insert in chunks of 200
  const chunkSize = 200;
  for (let i = 0; i < assignmentRows.length; i += chunkSize) {
    const chunk = assignmentRows.slice(i, i + chunkSize);
    const { error: insErr } = await supabase
      .from('exam_seat_assignments')
      .insert(chunk);

    if (insErr) {
      throw new Error('កំហុសក្នុងការរក្សាទុកកៅអីប្រឡង៖ ' + insErr.message);
    }
  }

  // 4. Update Event config
  await supabase
    .from('exam_events')
    .update({
      distribution_method: config.method,
      student_ordering: config.ordering,
      mixing_mode: config.mixingMode,
      target_students_per_room: config.targetPerRoom || 25,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  revalidatePath('/admin/exam-rooms');
  return { success: true, count: assignmentRows.length };
}

/**
 * Updates individual candidate exam status (absent / transferred / withdrawn)
 */
export async function updateCandidateExamStatus(
  assignmentId: string,
  newStatus: 'registered' | 'absent' | 'transferred' | 'withdrawn',
  note?: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('exam_seat_assignments')
    .update({
      status: newStatus,
      note: note || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  if (error) throw error;
  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

/**
 * Changes exam event status (draft -> published -> locked)
 */
export async function updateExamEventStatus(eventId: string, newStatus: 'draft' | 'published' | 'locked') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('exam_events')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (error) throw error;
  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

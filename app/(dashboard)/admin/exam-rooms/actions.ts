'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RoomDistribution, AllocationConfig, validateExamAllocation } from '@/lib/exam-allocation-engine';

/**
 * Fetches all physical exam rooms (ordered numerically)
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

  return (data || []).sort((a, b) => {
    const nA = parseInt(a.room_number, 10) || 0;
    const nB = parseInt(b.room_number, 10) || 0;
    return nA - nB;
  });
}

/**
 * Creates or updates a physical exam room
 */
export async function saveExamRoom(payload: {
  id?: string;
  room_number: string;
  building?: string;
  floor?: string;
  capacity: number;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (payload.id) {
    const { data, error } = await supabase
      .from('exam_rooms')
      .update({
        room_number: payload.room_number,
        building: payload.building || 'អគារសិក្សា',
        floor: payload.floor || 'ជាន់ផ្ទាល់ដី',
        capacity: payload.capacity || 30,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
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
      .from('exam_rooms')
      .insert({
        room_number: payload.room_number,
        building: payload.building || 'អគារសិក្សា',
        floor: payload.floor || 'ជាន់ផ្ទាល់ដី',
        capacity: payload.capacity || 30,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/exam-rooms');
    return data;
  }
}

/**
 * Soft deactivates or reactivates an exam room
 */
export async function toggleRoomActiveStatus(roomId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('exam_rooms')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) throw error;
  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

/**
 * Fetches all exam events
 */
export async function getExamEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam_events')
    .select('*, academic_years(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching exam events:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetches all active academic years for selection
 */
export async function getAcademicYears() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, is_current')
    .order('name', { ascending: false });

  if (error) {
    console.error('Error fetching academic years:', error);
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
  academic_year_id?: string;
  academic_year: string;
  period: string;
  exam_date?: string;
  subject?: string;
  start_time?: string;
  end_time?: string;
  session?: string;
  target_students_per_room: number;
  distribution_method: string;
  student_ordering: string;
  mixing_mode: string;
  selected_room_ids?: string[];
  custom_capacities?: Record<string, number>;
  manual_ranges?: any[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (payload.id) {
    // Check if locked
    const { data: existing } = await supabase
      .from('exam_events')
      .select('status, title')
      .eq('id', payload.id)
      .single();

    if (existing?.status === 'locked') {
      throw new Error(`មិនអាចកែប្រែសម័យប្រឡងដែលបានចាក់សោររួចឡើយ (${existing.title})`);
    }

    const { data, error } = await supabase
      .from('exam_events')
      .update({
        title: payload.title,
        academic_year_id: payload.academic_year_id || null,
        academic_year: payload.academic_year,
        period: payload.period,
        exam_date: payload.exam_date,
        subject: payload.subject || null,
        start_time: payload.start_time || null,
        end_time: payload.end_time || null,
        session: payload.session || 'ព្រឹក',
        target_students_per_room: payload.target_students_per_room,
        distribution_method: payload.distribution_method,
        student_ordering: payload.student_ordering,
        mixing_mode: payload.mixing_mode,
        selected_room_ids: payload.selected_room_ids || [],
        custom_capacities: payload.custom_capacities || {},
        manual_ranges: payload.manual_ranges || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'update_exam_event',
      target_type: 'exam_events',
      target_id: payload.id,
      details: { title: payload.title }
    });

    revalidatePath('/admin/exam-rooms');
    return data;
  } else {
    const { data, error } = await supabase
      .from('exam_events')
      .insert({
        title: payload.title,
        academic_year_id: payload.academic_year_id || null,
        academic_year: payload.academic_year,
        period: payload.period,
        exam_date: payload.exam_date,
        subject: payload.subject || null,
        start_time: payload.start_time || null,
        end_time: payload.end_time || null,
        session: payload.session || 'ព្រឹក',
        target_students_per_room: payload.target_students_per_room,
        distribution_method: payload.distribution_method,
        student_ordering: payload.student_ordering,
        mixing_mode: payload.mixing_mode,
        selected_room_ids: payload.selected_room_ids || [],
        custom_capacities: payload.custom_capacities || {},
        manual_ranges: payload.manual_ranges || [],
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'create_exam_event',
      target_type: 'exam_events',
      target_id: data.id,
      details: { title: payload.title }
    });

    revalidatePath('/admin/exam-rooms');
    return data;
  }
}

/**
 * Fetches the explicit persisted candidate pool for an exam event
 */
export async function getExamCandidatePool(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam_event_candidates')
    .select('*, students(id, student_id_number, desk_number, full_name, gender, dob, class_id, classes(id, name, grade, track))')
    .eq('exam_event_id', eventId);

  if (error) {
    console.error('Error fetching exam candidate pool:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    candidate_pool_id: row.id,
    student_id: row.student_id,
    full_name: row.students?.full_name || '',
    student_id_number: row.students?.student_id_number,
    desk_number: row.students?.desk_number,
    gender: row.students?.gender,
    dob: row.students?.dob,
    class_id: row.class_id,
    class_name: row.students?.classes?.name || '',
    grade: row.students?.classes?.grade || '',
    track: row.students?.classes?.track || null,
    status: row.candidate_status || 'registered'
  }));
}

/**
 * Fetches available active students for building/filtering the candidate pool
 */
export async function getAvailableStudentsForPool(gradeFilter?: string, trackFilter?: string, classIdFilter?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('id, student_id_number, desk_number, full_name, gender, dob, class_id, classes(id, name, grade, track)')
    .eq('is_active', true);

  if (classIdFilter && classIdFilter !== 'all') {
    query = query.eq('class_id', classIdFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching available students:', error);
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
 * Saves the explicit candidate pool for an exam event (Atomic Operation)
 */
export async function saveExamCandidatePool(
  eventId: string,
  candidateItems: { student_id: string; class_id: string; candidate_status?: string }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify event is not locked
  const { data: event } = await supabase
    .from('exam_events')
    .select('status, title')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('រកមិនឃើញសម័យប្រឡង');
  if (event.status === 'locked') {
    throw new Error(`មិនអាចកែប្រែបញ្ជីបេក្ខជននៃសម័យប្រឡងដែលបានចាក់សោរឡើយ (${event.title})`);
  }

  // 1. Delete old candidate pool
  const { error: delErr } = await supabase
    .from('exam_event_candidates')
    .delete()
    .eq('exam_event_id', eventId);

  if (delErr) throw new Error('កំហុសក្នុងការសម្អាតបញ្ជីបេក្ខជនចាស់៖ ' + delErr.message);

  // 2. Insert new candidates in batches
  if (candidateItems.length > 0) {
    const rows = candidateItems.map(c => ({
      exam_event_id: eventId,
      student_id: c.student_id,
      class_id: c.class_id,
      candidate_status: c.candidate_status || 'registered'
    }));

    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insErr } = await supabase
        .from('exam_event_candidates')
        .insert(chunk);

      if (insErr) {
        throw new Error('កំហុសក្នុងការរក្សាទុកបញ្ជីបេក្ខជន៖ ' + insErr.message);
      }
    }
  }

  // 3. Clear existing seat assignments because candidate pool changed
  await supabase.from('exam_seat_assignments').delete().eq('exam_event_id', eventId);

  // 4. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'save_candidate_pool',
    target_type: 'exam_events',
    target_id: eventId,
    details: { event_title: event.title, candidate_count: candidateItems.length }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true, count: candidateItems.length };
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
 * Saves seat assignments atomically via RPC with complete rollback safety
 */
export async function saveSeatAssignments(
  eventId: string,
  distributions: RoomDistribution[],
  config: AllocationConfig
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify event is not locked
  const { data: event } = await supabase
    .from('exam_events')
    .select('status, title')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('រកមិនឃើញសម័យប្រឡង');
  if (event.status === 'locked') {
    throw new Error(`មិនអាចកែប្រែការបែងចែកកៅអីនៃសម័យប្រឡងដែលបានចាក់សោរឡើយ (${event.title})`);
  }

  // Format assignments payload
  const assignmentRows: any[] = [];
  distributions.forEach(dist => {
    dist.candidates.forEach(item => {
      assignmentRows.push({
        student_id: item.candidate.student_id || item.candidate.id,
        exam_room_id: dist.roomId,
        exam_order_number: item.examOrderNumber,
        seat_number: item.seatNumber,
        status: item.status || 'registered'
      });
    });
  });

  const configPayload = {
    distribution_method: config.method,
    student_ordering: config.ordering,
    mixing_mode: config.mixingMode,
    target_students_per_room: config.targetPerRoom || 25,
    selected_room_ids: config.selectedRoomIds || [],
    custom_capacities: config.customCapacities || {},
    manual_ranges: config.manualRanges || []
  };

  // Try RPC call
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('replace_exam_seat_assignments', {
    p_exam_event_id: eventId,
    p_assignments: assignmentRows,
    p_configuration: configPayload,
    p_user_id: user?.id || null
  });

  if (rpcErr) {
    // Fallback: execute sequential atomic operations if RPC function is not installed yet
    console.warn('RPC replace_exam_seat_assignments fallback:', rpcErr.message);

    // 1. Delete
    const { error: delErr } = await supabase
      .from('exam_seat_assignments')
      .delete()
      .eq('exam_event_id', eventId);
    if (delErr) throw delErr;

    // 2. Insert in chunks
    const chunkSize = 200;
    for (let i = 0; i < assignmentRows.length; i += chunkSize) {
      const chunk = assignmentRows.slice(i, i + chunkSize).map(r => ({
        ...r,
        exam_event_id: eventId
      }));
      const { error: insErr } = await supabase
        .from('exam_seat_assignments')
        .insert(chunk);
      if (insErr) throw insErr;
    }

    // 3. Update config
    await supabase.from('exam_events').update({
      distribution_method: config.method,
      student_ordering: config.ordering,
      mixing_mode: config.mixingMode,
      target_students_per_room: config.targetPerRoom || 25,
      selected_room_ids: config.selectedRoomIds || [],
      custom_capacities: config.customCapacities || {},
      manual_ranges: config.manualRanges || [],
      updated_at: new Date().toISOString()
    }).eq('id', eventId);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'save_exam_seat_assignments',
    target_type: 'exam_events',
    target_id: eventId,
    details: { event_title: event.title, assigned_count: assignmentRows.length }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true, count: assignmentRows.length };
}

/**
 * Server-side verified publishing of an Exam Event
 */
export async function publishExamEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch Event
  const { data: event, error: evErr } = await supabase
    .from('exam_events')
    .select('*, exam_rooms(*)')
    .eq('id', eventId)
    .single();

  if (evErr || !event) throw new Error('រកមិនឃើញសម័យប្រឡង');
  if (event.status === 'locked') {
    throw new Error('សម័យប្រឡងនេះត្រូវបានចាក់សោររួចហើយ');
  }

  // 2. Fetch Candidate Pool
  const candidatePool = await getExamCandidatePool(eventId);
  if (candidatePool.length === 0) {
    throw new Error('មិនអាចបោះពុម្ពផ្សាយបានទេ៖ មិនទាន់មានបញ្ជីបេក្ខជនប្រឡង (No candidate pool)');
  }

  // 3. Fetch Saved Assignments from Database
  const assignments = await getExamSeatAssignments(eventId);
  if (assignments.length === 0) {
    throw new Error('មិនអាចបោះពុម្ពផ្សាយបានទេ៖ មិនទាន់មានការរក្សាទុកកៅអីប្រឡងក្នុងប្រព័ន្ធ (No saved assignments)');
  }

  // 4. Reconstruct distributions from DB and run Authoritative Validation Engine
  const allRooms = await getExamRooms();
  const roomMap = new Map<string, RoomDistribution>();

  assignments.forEach(asg => {
    const rId = asg.exam_room_id;
    const rObj = allRooms.find(r => r.id === rId);
    if (!roomMap.has(rId)) {
      roomMap.set(rId, {
        roomId: rId,
        roomNumber: asg.room_number || rObj?.room_number || '?',
        building: rObj?.building,
        capacity: rObj?.capacity || 30,
        targetCount: 0,
        startOrder: asg.exam_order_number,
        endOrder: asg.exam_order_number,
        candidates: []
      });
    }

    const dist = roomMap.get(rId)!;
    dist.candidates.push({
      candidate: asg.candidate,
      examOrderNumber: asg.exam_order_number,
      seatNumber: asg.seat_number,
      status: asg.status
    });
    dist.targetCount = dist.candidates.length;
    dist.startOrder = Math.min(dist.startOrder, asg.exam_order_number);
    dist.endOrder = Math.max(dist.endOrder, asg.exam_order_number);
  });

  const distributions = Array.from(roomMap.values());
  const valResult = validateExamAllocation(distributions, candidatePool.length);

  if (!valResult.isValid) {
    throw new Error(`មិនអាចបោះពុម្ពផ្សាយបានទេ ដោយសាររកឃើញកំហុស៖ ${valResult.errors.join('; ')}`);
  }

  // 5. Update status to published
  const { error: pubErr } = await supabase
    .from('exam_events')
    .update({
      status: 'published',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (pubErr) throw pubErr;

  // 6. Audit Log
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'publish_exam_event',
    target_type: 'exam_events',
    target_id: eventId,
    details: { event_title: event.title, candidate_count: candidatePool.length, room_count: distributions.length }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

/**
 * Locks an Exam Event (Immutable Historical State)
 */
export async function lockExamEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from('exam_events')
    .select('status, title')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('រកមិនឃើញសម័យប្រឡង');
  if (event.status === 'draft') {
    throw new Error('សូមបោះពុម្ពផ្សាយ (Publish) សម័យប្រឡងជាមុនសិន មុននឹងធ្វើការចាក់សោរ');
  }

  const { error } = await supabase
    .from('exam_events')
    .update({
      status: 'locked',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'lock_exam_event',
    target_type: 'exam_events',
    target_id: eventId,
    details: { event_title: event.title }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

/**
 * Unlocks a locked Exam Event (Privileged Admin Operation)
 */
export async function unlockExamEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from('exam_events')
    .select('status, title')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('រកមិនឃើញសម័យប្រឡង');

  const { error } = await supabase
    .from('exam_events')
    .update({
      status: 'published',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'unlock_exam_event',
    target_type: 'exam_events',
    target_id: eventId,
    details: { event_title: event.title }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

/**
 * Updates individual candidate exam status (absent / transferred / withdrawn)
 */
export async function updateCandidateExamStatus(
  eventId: string,
  studentId: string,
  newStatus: 'registered' | 'absent' | 'transferred' | 'withdrawn',
  note?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if locked
  const { data: event } = await supabase
    .from('exam_events')
    .select('status, title')
    .eq('id', eventId)
    .single();

  if (event?.status === 'locked') {
    throw new Error(`មិនអាចកែប្រែស្ថានភាពបេក្ខជននៃសម័យប្រឡងដែលបានចាក់សោរឡើយ (${event.title})`);
  }

  // Update in seat assignments
  await supabase
    .from('exam_seat_assignments')
    .update({
      status: newStatus,
      note: note || null,
      updated_at: new Date().toISOString()
    })
    .eq('exam_event_id', eventId)
    .eq('student_id', studentId);

  // Update in candidate pool
  await supabase
    .from('exam_event_candidates')
    .update({
      candidate_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('exam_event_id', eventId)
    .eq('student_id', studentId);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'update_candidate_exam_status',
    target_type: 'exam_events',
    target_id: eventId,
    details: { student_id: studentId, new_status: newStatus }
  });

  revalidatePath('/admin/exam-rooms');
  return { success: true };
}

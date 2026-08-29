/**
 * Exam Room & Candidate Allocation Engine
 * Tailored for Hun Sen Porieng Upper Secondary School Real Exam Workflows
 */

export type DistributionMethod = 'fixed_capacity' | 'custom_capacity' | 'manual_split' | 'auto_balanced';
export type StudentOrdering = 'name' | 'desk_number' | 'student_id' | 'random';
export type MixingMode = 'keep_classes' | 'mix_classes' | 'balanced_classes';
export type CandidateStatus = 'registered' | 'absent' | 'transferred' | 'withdrawn';

export interface ExamHeaderMetadata {
  kingdom?: string;
  motto?: string;
  ministry?: string;
  school?: string;
  title_prefix?: string;
  exam_date_label?: string;
}

export interface ExamRoom {
  id: string;
  room_number: string;
  building?: string;
  floor?: string;
  capacity: number;
  is_active: boolean;
}

export interface ExamCandidate {
  id: string;
  student_id: string;
  full_name: string;
  student_id_number?: string;
  desk_number?: string; // Classroom desk number (NEVER OVERWRITTEN)
  gender?: string;
  dob?: string;
  class_id: string;
  class_name: string;
  grade: string | number;
  track?: string | null;
  status?: CandidateStatus;
}

export interface ExamSeatAssignment {
  id?: string;
  exam_event_id: string;
  student_id: string;
  exam_room_id: string;
  room_number: string;
  exam_order_number: number; // Global continuous exam order (1 ... N)
  seat_number: number;       // Room-level seat (1 ... R)
  status: CandidateStatus;
  note?: string;
  candidate?: ExamCandidate;
}

export interface RoomDistribution {
  roomId: string;
  roomNumber: string;
  building?: string;
  capacity: number;
  targetCount: number;
  startOrder: number;
  endOrder: number;
  candidates: {
    candidate: ExamCandidate;
    examOrderNumber: number;
    seatNumber: number;
    status: CandidateStatus;
  }[];
}

export interface AllocationConfig {
  method: DistributionMethod;
  targetPerRoom?: number;
  customCapacities?: number[];
  manualRanges?: { start: number; end: number }[];
  ordering: StudentOrdering;
  mixingMode: MixingMode;
  startingOrderNumber?: number;
}

/**
 * Sorts and arranges candidates according to ordering and class mixing policies
 */
export function prepareCandidatePool(
  candidates: ExamCandidate[],
  ordering: StudentOrdering = 'name',
  mixingMode: MixingMode = 'keep_classes'
): ExamCandidate[] {
  const pool = [...candidates];

  // Helper sort function
  const sortComparator = (a: ExamCandidate, b: ExamCandidate): number => {
    if (ordering === 'name') {
      return a.full_name.localeCompare(b.full_name, 'km');
    }
    if (ordering === 'desk_number') {
      const dA = parseInt(a.desk_number || '0', 10);
      const dB = parseInt(b.desk_number || '0', 10);
      if (dA && dB) return dA - dB;
      return a.full_name.localeCompare(b.full_name, 'km');
    }
    if (ordering === 'student_id') {
      const idA = a.student_id_number || '';
      const idB = b.student_id_number || '';
      return idA.localeCompare(idB);
    }
    if (ordering === 'random') {
      return 0.5 - Math.random();
    }
    return a.full_name.localeCompare(b.full_name, 'km');
  };

  if (mixingMode === 'keep_classes') {
    // Group by class first, then apply ordering inside each class
    const classGroups: Record<string, ExamCandidate[]> = {};
    pool.forEach(c => {
      const clsKey = c.class_name || 'General';
      if (!classGroups[clsKey]) classGroups[clsKey] = [];
      classGroups[clsKey].push(c);
    });

    const sortedClasses = Object.keys(classGroups).sort((a, b) => a.localeCompare(b));
    const result: ExamCandidate[] = [];
    sortedClasses.forEach(cls => {
      const group = classGroups[cls].sort(sortComparator);
      result.push(...group);
    });
    return result;
  }

  if (mixingMode === 'mix_classes') {
    // Interleave classes (Round-Robin) to prevent adjacent students from the same class
    const classGroups: Record<string, ExamCandidate[]> = {};
    pool.forEach(c => {
      const clsKey = c.class_name || 'General';
      if (!classGroups[clsKey]) classGroups[clsKey] = [];
      classGroups[clsKey].push(c);
    });

    Object.keys(classGroups).forEach(k => {
      classGroups[k].sort(sortComparator);
    });

    const keys = Object.keys(classGroups);
    const result: ExamCandidate[] = [];
    let hasMore = true;
    let idx = 0;

    while (hasMore) {
      hasMore = false;
      for (const k of keys) {
        if (idx < classGroups[k].length) {
          result.push(classGroups[k][idx]);
          hasMore = true;
        }
      }
      idx++;
    }
    return result;
  }

  // General single pool sort
  return pool.sort(sortComparator);
}

/**
 * Calculates student count per room based on the chosen Distribution Method
 */
export function calculateRoomSizes(
  totalCandidates: number,
  availableRooms: ExamRoom[],
  config: AllocationConfig
): number[] {
  const roomCount = availableRooms.length;
  if (roomCount === 0 || totalCandidates === 0) return [];

  switch (config.method) {
    case 'fixed_capacity': {
      const target = config.targetPerRoom || 25;
      const counts: number[] = [];
      let remaining = totalCandidates;

      for (let i = 0; i < roomCount; i++) {
        if (remaining <= 0) break;
        const count = Math.min(remaining, target);
        counts.push(count);
        remaining -= count;
      }
      return counts;
    }

    case 'custom_capacity': {
      const custom = config.customCapacities || [];
      const counts: number[] = [];
      let remaining = totalCandidates;

      for (let i = 0; i < roomCount; i++) {
        if (remaining <= 0) break;
        const cap = custom[i] !== undefined ? custom[i] : (config.targetPerRoom || 25);
        const count = Math.min(remaining, cap);
        counts.push(count);
        remaining -= count;
      }
      return counts;
    }

    case 'manual_split': {
      const ranges = config.manualRanges || [];
      const counts: number[] = [];

      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const count = Math.max(0, r.end - r.start + 1);
        counts.push(count);
      }
      return counts;
    }

    case 'auto_balanced':
    default: {
      // Balanced distribution: e.g. 209 candidates in 8 rooms -> 27, 26, 26, 26, 26, 26, 26, 26
      const base = Math.floor(totalCandidates / roomCount);
      let remainder = totalCandidates % roomCount;
      const counts: number[] = [];

      for (let i = 0; i < roomCount; i++) {
        const count = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        counts.push(count);
      }
      return counts;
    }
  }
}

/**
 * Executes full room allocation and assigns continuous Global Exam Desk Numbers
 */
export function executeAllocation(
  candidates: ExamCandidate[],
  availableRooms: ExamRoom[],
  config: AllocationConfig
): RoomDistribution[] {
  // 1. Prepare ordered candidate pool
  const orderedCandidates = prepareCandidatePool(candidates, config.ordering, config.mixingMode);
  
  // 2. Calculate room sizes
  const roomSizes = calculateRoomSizes(orderedCandidates.length, availableRooms, config);
  
  // 3. Distribute into rooms with sequential Global Exam Desk Numbers
  const distributions: RoomDistribution[] = [];
  let candidateCursor = 0;
  let currentOrderNumber = config.startingOrderNumber || 1;

  for (let i = 0; i < roomSizes.length; i++) {
    const room = availableRooms[i];
    if (!room) break;

    const count = roomSizes[i];
    const roomCandidates = orderedCandidates.slice(candidateCursor, candidateCursor + count);
    candidateCursor += count;

    const startOrder = currentOrderNumber;
    const assignedList = roomCandidates.map((cand, sIdx) => {
      const examOrder = currentOrderNumber++;
      return {
        candidate: cand,
        examOrderNumber: examOrder,
        seatNumber: sIdx + 1,
        status: (cand.status || 'registered') as CandidateStatus
      };
    });
    const endOrder = roomCandidates.length > 0 ? currentOrderNumber - 1 : startOrder;

    distributions.push({
      roomId: room.id,
      roomNumber: room.room_number,
      building: room.building,
      capacity: room.capacity,
      targetCount: count,
      startOrder,
      endOrder,
      candidates: assignedList
    });
  }

  return distributions;
}

/**
 * Shifts candidates between rooms when Admin drags or edits room boundaries
 */
export function shiftRoomBoundary(
  distributions: RoomDistribution[],
  fromRoomIdx: number,
  toRoomIdx: number,
  candidateCount: number = 1
): RoomDistribution[] {
  const cloned = JSON.parse(JSON.stringify(distributions)) as RoomDistribution[];
  if (fromRoomIdx < 0 || fromRoomIdx >= cloned.length || toRoomIdx < 0 || toRoomIdx >= cloned.length) {
    return distributions;
  }

  const fromRoom = cloned[fromRoomIdx];
  const toRoom = cloned[toRoomIdx];

  if (fromRoom.candidates.length < candidateCount) return distributions;

  // Move candidate(s)
  if (fromRoomIdx < toRoomIdx) {
    // Moving from earlier room to later room (take from tail of fromRoom to head of toRoom)
    const moving = fromRoom.candidates.splice(fromRoom.candidates.length - candidateCount, candidateCount);
    toRoom.candidates.unshift(...moving);
  } else {
    // Moving from later room to earlier room (take from head of fromRoom to tail of toRoom)
    const moving = fromRoom.candidates.splice(0, candidateCount);
    toRoom.candidates.push(...moving);
  }

  // Recalculate sequential global exam order
  return recalculateSequentialOrder(cloned);
}

/**
 * Re-indexes all global exam order numbers sequentially across all rooms
 */
export function recalculateSequentialOrder(
  distributions: RoomDistribution[],
  startingOrder: number = 1
): RoomDistribution[] {
  let currentOrder = startingOrder;

  return distributions.map(dist => {
    const startOrder = currentOrder;
    const updatedCandidates = dist.candidates.map((item, sIdx) => {
      const orderNum = currentOrder++;
      return {
        ...item,
        examOrderNumber: orderNum,
        seatNumber: sIdx + 1
      };
    });
    const endOrder = dist.candidates.length > 0 ? currentOrder - 1 : startOrder;

    return {
      ...dist,
      targetCount: updatedCandidates.length,
      startOrder,
      endOrder,
      candidates: updatedCandidates
    };
  });
}

/**
 * Pre-Publish Validation Engine
 */
export function validateExamAllocation(
  distributions: RoomDistribution[],
  totalCandidatesCount: number
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  let assignedCount = 0;
  const seenStudentIds = new Set<string>();
  const seenOrderNumbers = new Set<number>();

  distributions.forEach(dist => {
    // Check Room Capacity
    if (dist.candidates.length > dist.capacity) {
      errors.push(`បន្ទប់លេខ ${dist.roomNumber} ផ្ទុកសិស្សលើសចំណុះ (ជាក់ស្តែង: ${dist.candidates.length}, ចំណុះអតិបរមា: ${dist.capacity})`);
    }

    if (dist.candidates.length === 0) {
      warnings.push(`បន្ទប់លេខ ${dist.roomNumber} គ្មានសិស្សប្រឡងឡើយ`);
    }

    dist.candidates.forEach(item => {
      assignedCount++;

      // Check Duplicates
      if (seenStudentIds.has(item.candidate.student_id)) {
        errors.push(`សិស្សឈ្មោះ ${item.candidate.full_name} (${item.candidate.student_id_number || item.candidate.student_id}) ត្រូវបានចាត់តាំងច្រើនដង`);
      }
      seenStudentIds.add(item.candidate.student_id);

      // Check Order Number Duplicates
      if (seenOrderNumbers.has(item.examOrderNumber)) {
        errors.push(`លេខតុប្រឡង ${item.examOrderNumber} ស្ទួនគ្នាក្នុងប្រព័ន្ធ`);
      }
      seenOrderNumbers.add(item.examOrderNumber);
    });
  });

  if (assignedCount !== totalCandidatesCount) {
    warnings.push(`ចំនួនសិស្សត្រូវបានចាត់តាំង (${assignedCount} នាក់) មិនស្មើចំនួនសិស្សសរុប (${totalCandidatesCount} នាក់)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Exam Room & Candidate Allocation Engine (Production Grade)
 * Unified business logic for Hun Sen Porieng Upper Secondary School Examination System
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
  capacity: number;          // Hard physical capacity limit
  targetCount: number;       // Target or assigned count
  startOrder: number;        // Global order start
  endOrder: number;          // Global order end
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
  customCapacities?: Record<string, number> | number[];
  manualRanges?: { roomId: string; start: number; end: number }[];
  ordering: StudentOrdering;
  mixingMode: MixingMode;
  startingOrderNumber?: number;
  selectedRoomIds?: string[];
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

  // Comparator function
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

  // 1. Group by Class first
  if (mixingMode === 'keep_classes') {
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

  // 2. Interleave classes (Round-Robin Mix)
  if (mixingMode === 'mix_classes') {
    const classGroups: Record<string, ExamCandidate[]> = {};
    pool.forEach(c => {
      const clsKey = c.class_name || 'General';
      if (!classGroups[clsKey]) classGroups[clsKey] = [];
      classGroups[clsKey].push(c);
    });

    Object.keys(classGroups).forEach(k => {
      classGroups[k].sort(sortComparator);
    });

    const keys = Object.keys(classGroups).sort();
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

  // 3. Balanced Classes (Proportional Distribution across all rooms)
  if (mixingMode === 'balanced_classes') {
    const classGroups: Record<string, ExamCandidate[]> = {};
    pool.forEach(c => {
      const clsKey = c.class_name || 'General';
      if (!classGroups[clsKey]) classGroups[clsKey] = [];
      classGroups[clsKey].push(c);
    });

    Object.keys(classGroups).forEach(k => {
      classGroups[k].sort(sortComparator);
    });

    // We interleave proportionately
    const sortedClasses = Object.keys(classGroups).sort();
    const result: ExamCandidate[] = [];
    let remainingTotal = pool.length;

    while (remainingTotal > 0) {
      for (const cls of sortedClasses) {
        if (classGroups[cls].length > 0) {
          result.push(classGroups[cls].shift()!);
          remainingTotal--;
        }
      }
    }
    return result;
  }

  // Default single pool sort
  return pool.sort(sortComparator);
}

/**
 * Calculates student count per room based on the chosen Distribution Method with strict physical capacity limits
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
        if (remaining <= 0) {
          counts.push(0);
          continue;
        }
        const roomPhysicalCap = availableRooms[i].capacity || 30;
        // Strict invariant: count <= roomPhysicalCap
        const count = Math.min(remaining, Math.min(target, roomPhysicalCap));
        counts.push(count);
        remaining -= count;
      }
      return counts;
    }

    case 'custom_capacity': {
      const custom = config.customCapacities || {};
      const counts: number[] = [];
      let remaining = totalCandidates;

      for (let i = 0; i < roomCount; i++) {
        if (remaining <= 0) {
          counts.push(0);
          continue;
        }
        const room = availableRooms[i];
        let requestedCap = config.targetPerRoom || 25;

        if (Array.isArray(custom)) {
          if (custom[i] !== undefined) requestedCap = custom[i];
        } else if (typeof custom === 'object' && custom !== null) {
          if (custom[room.id] !== undefined) requestedCap = custom[room.id];
          else if (custom[room.room_number] !== undefined) requestedCap = custom[room.room_number];
        }

        // Strict invariant: cap <= physical capacity
        const actualCap = Math.min(requestedCap, room.capacity || 30);
        const count = Math.min(remaining, actualCap);
        counts.push(count);
        remaining -= count;
      }
      return counts;
    }

    case 'manual_split': {
      const ranges = config.manualRanges || [];
      const counts: number[] = [];

      for (let i = 0; i < roomCount; i++) {
        const room = availableRooms[i];
        const r = ranges.find(rg => rg.roomId === room.id) || ranges[i];
        if (r && r.start > 0 && r.end >= r.start) {
          const rangeCount = r.end - r.start + 1;
          // Invariant: cannot exceed physical room capacity
          const validCount = Math.min(rangeCount, room.capacity || 30);
          counts.push(validCount);
        } else {
          counts.push(0);
        }
      }
      return counts;
    }

    case 'auto_balanced':
    default: {
      // Balanced distribution with capacity cap protection
      const counts: number[] = new Array(roomCount).fill(0);
      let remaining = totalCandidates;

      // Iteratively distribute 1 candidate at a time to rooms that have space
      while (remaining > 0) {
        let allocatedInPass = false;
        for (let i = 0; i < roomCount; i++) {
          if (remaining <= 0) break;
          const room = availableRooms[i];
          if (counts[i] < (room.capacity || 30)) {
            counts[i]++;
            remaining--;
            allocatedInPass = true;
          }
        }
        if (!allocatedInPass) {
          // Total physical capacity of all available rooms is insufficient
          break;
        }
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
  // 0. Filter rooms to selected pool if specified
  let targetRooms = availableRooms.filter(r => r.is_active);
  if (config.selectedRoomIds && config.selectedRoomIds.length > 0) {
    targetRooms = targetRooms.filter(r => config.selectedRoomIds!.includes(r.id));
  }

  if (targetRooms.length === 0 || candidates.length === 0) {
    return [];
  }

  // 1. Prepare ordered candidate pool
  const orderedCandidates = prepareCandidatePool(candidates, config.ordering, config.mixingMode);
  
  // 2. Calculate room sizes respecting capacity limits
  const roomSizes = calculateRoomSizes(orderedCandidates.length, targetRooms, config);
  
  // 3. Distribute into rooms with sequential Global Exam Desk Numbers
  const distributions: RoomDistribution[] = [];
  let candidateCursor = 0;
  let currentOrderNumber = config.startingOrderNumber || 1;

  for (let i = 0; i < targetRooms.length; i++) {
    const room = targetRooms[i];
    const count = roomSizes[i] || 0;

    const roomCandidates = orderedCandidates.slice(candidateCursor, candidateCursor + count);
    candidateCursor += count;

    const startOrder = roomCandidates.length > 0 ? currentOrderNumber : currentOrderNumber;
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
 * Moves a specific student to any selected room
 */
export function moveCandidateToRoom(
  distributions: RoomDistribution[],
  studentId: string,
  targetRoomId: string
): RoomDistribution[] {
  const cloned = JSON.parse(JSON.stringify(distributions)) as RoomDistribution[];
  
  let foundCandidateItem: any = null;
  let sourceDist: RoomDistribution | null = null;

  // Find candidate in source room
  for (const dist of cloned) {
    const idx = dist.candidates.findIndex(c => c.candidate.student_id === studentId || c.candidate.id === studentId);
    if (idx !== -1) {
      sourceDist = dist;
      foundCandidateItem = dist.candidates.splice(idx, 1)[0];
      break;
    }
  }

  if (!foundCandidateItem) return distributions;

  // Find target room and add candidate
  const targetDist = cloned.find(d => d.roomId === targetRoomId);
  if (!targetDist) return distributions;

  targetDist.candidates.push(foundCandidateItem);

  // Recalculate global order sequentially
  return recalculateSequentialOrder(cloned);
}

/**
 * Swaps two students between rooms or seats
 */
export function swapCandidates(
  distributions: RoomDistribution[],
  studentIdA: string,
  studentIdB: string
): RoomDistribution[] {
  const cloned = JSON.parse(JSON.stringify(distributions)) as RoomDistribution[];
  
  let itemA: any = null;
  let distA: RoomDistribution | null = null;
  let idxA = -1;

  let itemB: any = null;
  let distB: RoomDistribution | null = null;
  let idxB = -1;

  for (const dist of cloned) {
    const fA = dist.candidates.findIndex(c => c.candidate.student_id === studentIdA || c.candidate.id === studentIdA);
    if (fA !== -1) { distA = dist; idxA = fA; itemA = dist.candidates[fA]; }

    const fB = dist.candidates.findIndex(c => c.candidate.student_id === studentIdB || c.candidate.id === studentIdB);
    if (fB !== -1) { distB = dist; idxB = fB; itemB = dist.candidates[fB]; }
  }

  if (!itemA || !itemB || !distA || !distB) return distributions;

  // Swap candidate objects while retaining seat structure
  const candA = itemA.candidate;
  const statusA = itemA.status;

  itemA.candidate = itemB.candidate;
  itemA.status = itemB.status;

  itemB.candidate = candA;
  itemB.status = statusA;

  return recalculateSequentialOrder(cloned);
}

/**
 * Shifts candidates between rooms (boundary movement)
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

  if (fromRoomIdx < toRoomIdx) {
    const moving = fromRoom.candidates.splice(fromRoom.candidates.length - candidateCount, candidateCount);
    toRoom.candidates.unshift(...moving);
  } else {
    const moving = fromRoom.candidates.splice(0, candidateCount);
    toRoom.candidates.push(...moving);
  }

  return recalculateSequentialOrder(cloned);
}

/**
 * Unified Authoritative Validation Engine
 * Enforces strict production rules for UI, Save, Publish, and Export
 */
export function validateExamAllocation(
  distributions: RoomDistribution[],
  totalCandidatesCount: number
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalCandidatesCount === 0) {
    errors.push('មិនទាន់មានបេក្ខជនក្នុងបញ្ជីសម័យប្រឡងនៅឡើយទេ (No candidate pool)');
    return { isValid: false, errors, warnings };
  }

  if (distributions.length === 0) {
    errors.push('មិនទាន់មានការបែងចែកបន្ទប់ប្រឡងនៅឡើយទេ (No rooms allocated)');
    return { isValid: false, errors, warnings };
  }

  let assignedCount = 0;
  const seenStudentIds = new Set<string>();
  const seenOrderNumbers = new Set<number>();
  const seenRoomSeats = new Set<string>();

  distributions.forEach(dist => {
    // 1. Strict Physical Room Capacity Check
    if (dist.candidates.length > dist.capacity) {
      errors.push(`បន្ទប់លេខ ${dist.roomNumber} ផ្ទុកសិស្សលើសចំណុះអតិបរមា (ជាក់ស្តែង: ${dist.candidates.length}, អតិបរមា: ${dist.capacity})`);
    }

    if (dist.candidates.length === 0) {
      warnings.push(`បន្ទប់លេខ ${dist.roomNumber} គ្មានសិស្សប្រឡងឡើយ`);
    }

    dist.candidates.forEach(item => {
      assignedCount++;

      // 2. Duplicate Student Check
      const stdId = item.candidate.student_id || item.candidate.id;
      if (seenStudentIds.has(stdId)) {
        errors.push(`សិស្សឈ្មោះ ${item.candidate.full_name} (${item.candidate.student_id_number || stdId}) ត្រូវបានចាត់តាំងស្ទួនគ្នាក្នុងបន្ទប់ប្រឡង`);
      }
      seenStudentIds.add(stdId);

      // 3. Duplicate Order Number Check
      if (seenOrderNumbers.has(item.examOrderNumber)) {
        errors.push(`លេខតុប្រឡង ${item.examOrderNumber} ស្ទួនគ្នាក្នុងប្រព័ន្ធ`);
      }
      seenOrderNumbers.add(item.examOrderNumber);

      // 4. Duplicate Room Seat Check
      const seatKey = `${dist.roomId}_${item.seatNumber}`;
      if (seenRoomSeats.has(seatKey)) {
        errors.push(`កៅអីលេខ ${item.seatNumber} ក្នុងបន្ទប់ ${dist.roomNumber} ស្ទួនគ្នា`);
      }
      seenRoomSeats.add(seatKey);
    });
  });

  // 5. Complete Assignment Check (Invariant: assignedCount === totalCandidatesCount)
  if (assignedCount !== totalCandidatesCount) {
    errors.push(`ចំនួនបេក្ខជនត្រូវបានចាត់តាំង (${assignedCount} នាក់) មិនគ្រប់ចំនួនបេក្ខជនសរុប (${totalCandidatesCount} នាក់)`);
  }

  // 6. Sequential Continuity Check
  const sortedOrders = Array.from(seenOrderNumbers).sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      errors.push(`លេខតុប្រឡងមិនមានលក្ខណៈបន្តបន្ទាប់គ្នា (ចន្លោះប្រហោងនៅលេខ ${i + 1})`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

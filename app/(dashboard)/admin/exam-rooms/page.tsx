'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Calendar, Download, Save, Plus, 
  CheckCircle2, AlertCircle, RefreshCw, Layers, Sliders,
  ArrowRight, Search, ShieldCheck, Lock, Unlock, Printer, Eye,
  Sparkles, Check, ChevronRight, AlertTriangle, Settings2, Edit3, UserCheck, Power
} from 'lucide-react';
import { 
  getExamRooms, 
  getExamEvents, 
  getExamCandidatePool,
  getExamSeatAssignments, 
  saveSeatAssignments, 
  publishExamEvent,
  lockExamEvent,
  unlockExamEvent,
  toggleRoomActiveStatus,
  updateCandidateExamStatus
} from './actions';
import { 
  ExamRoom, 
  ExamCandidate, 
  RoomDistribution, 
  AllocationConfig, 
  DistributionMethod, 
  StudentOrdering, 
  MixingMode, 
  executeAllocation, 
  shiftRoomBoundary, 
  moveCandidateToRoom,
  swapCandidates,
  recalculateSequentialOrder, 
  validateExamAllocation,
  CandidateStatus 
} from '@/lib/exam-allocation-engine';
import { ExamExportModal } from '@/components/admin/exam-rooms/ExamExportModal';
import { RoomCandidateDrawer } from '@/components/admin/exam-rooms/RoomCandidateDrawer';
import { ExamEventModal } from '@/components/admin/exam-rooms/ExamEventModal';
import { CandidatePoolModal } from '@/components/admin/exam-rooms/CandidatePoolModal';
import { PhysicalRoomModal } from '@/components/admin/exam-rooms/PhysicalRoomModal';

export default function ExamRoomsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'allocation' | 'rooms_inventory'>('allocation');

  // Master Data
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [candidatePool, setCandidatePool] = useState<ExamCandidate[]>([]);

  // Studio Controls & Config
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('fixed_capacity');
  const [targetPerRoom, setTargetPerRoom] = useState<number>(25);
  const [studentOrdering, setStudentOrdering] = useState<StudentOrdering>('name');
  const [mixingMode, setMixingMode] = useState<MixingMode>('keep_classes');
  const [customCapacities, setCustomCapacities] = useState<Record<string, number>>({});
  const [manualRanges, setManualRanges] = useState<{ roomId: string; start: number; end: number }[]>([]);

  // Distributions State
  const [distributions, setDistributions] = useState<RoomDistribution[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals & Drawers
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCandidatePoolModalOpen, setIsCandidatePoolModalOpen] = useState(false);
  const [isPhysicalRoomModalOpen, setIsPhysicalRoomModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number>(0);

  // 1. Initial Load
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [dbRooms, dbEvents] = await Promise.all([
          getExamRooms(),
          getExamEvents()
        ]);

        setRooms(dbRooms);
        setEvents(dbEvents);

        if (dbEvents && dbEvents.length > 0) {
          const first = dbEvents[0];
          setSelectedEventId(first.id);
          setSelectedEvent(first);
          setDistributionMethod(first.distribution_method || 'fixed_capacity');
          setTargetPerRoom(first.target_students_per_room || 25);
          setStudentOrdering(first.student_ordering || 'name');
          setMixingMode(first.mixing_mode || 'keep_classes');
          setCustomCapacities(first.custom_capacities || {});
          setManualRanges(first.manual_ranges || []);
        }
      } catch (err) {
        console.error('Error initializing exam rooms page:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Load Candidate Pool & Seat Assignments when Event Changes
  useEffect(() => {
    if (!selectedEventId) return;
    const curEvent = events.find(e => e.id === selectedEventId);
    setSelectedEvent(curEvent || null);

    async function loadEventData() {
      setLoading(true);
      try {
        const [pool, savedAssignments] = await Promise.all([
          getExamCandidatePool(selectedEventId),
          getExamSeatAssignments(selectedEventId)
        ]);

        setCandidatePool(pool);

        if (savedAssignments && savedAssignments.length > 0) {
          // Reconstruct RoomDistribution array from saved assignments in database
          const roomMap = new Map<string, RoomDistribution>();
          
          savedAssignments.forEach(asg => {
            const rId = asg.exam_room_id;
            const rObj = rooms.find(r => r.id === rId);
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
              status: asg.status as CandidateStatus
            });
            dist.targetCount = dist.candidates.length;
            dist.startOrder = Math.min(dist.startOrder, asg.exam_order_number);
            dist.endOrder = Math.max(dist.endOrder, asg.exam_order_number);
          });

          const restored = Array.from(roomMap.values()).sort((a, b) => {
            const nA = parseInt(a.roomNumber, 10) || 0;
            const nB = parseInt(b.roomNumber, 10) || 0;
            return nA - nB;
          });

          setDistributions(restored);
          setHasUnsavedChanges(false);
        } else if (pool.length > 0) {
          // Candidate pool exists, generate in-memory draft allocation
          handleRunAllocation(pool, curEvent);
        } else {
          setDistributions([]);
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        console.error('Error loading event data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEventData();
  }, [selectedEventId]);

  // Execute Allocation on candidate pool
  const handleRunAllocation = (poolOverride?: ExamCandidate[], eventOverride?: any) => {
    const currentPool = poolOverride || candidatePool;
    if (currentPool.length === 0) return;

    const event = eventOverride || selectedEvent;
    const selectedRoomIds = event?.selected_room_ids || [];

    const config: AllocationConfig = {
      method: distributionMethod,
      targetPerRoom,
      customCapacities,
      manualRanges,
      ordering: studentOrdering,
      mixingMode: mixingMode,
      selectedRoomIds: selectedRoomIds.length > 0 ? selectedRoomIds : undefined,
      startingOrderNumber: 1
    };

    const newDistributions = executeAllocation(currentPool, rooms, config);
    setDistributions(newDistributions);
    setHasUnsavedChanges(true);
  };

  // Shift Boundary
  const handleShiftBoundary = (fromRoomIdx: number, toRoomIdx: number, count: number) => {
    if (selectedEvent?.status === 'locked') return;
    const updated = shiftRoomBoundary(distributions, fromRoomIdx, toRoomIdx, count);
    setDistributions(updated);
    setHasUnsavedChanges(true);
  };

  // Move Candidate to Any Room
  const handleMoveCandidate = (studentId: string, targetRoomId: string) => {
    if (selectedEvent?.status === 'locked') return;
    const updated = moveCandidateToRoom(distributions, studentId, targetRoomId);
    setDistributions(updated);
    setHasUnsavedChanges(true);
  };

  // Swap Candidates
  const handleSwapCandidates = (studentIdA: string, studentIdB: string) => {
    if (selectedEvent?.status === 'locked') return;
    const updated = swapCandidates(distributions, studentIdA, studentIdB);
    setDistributions(updated);
    setHasUnsavedChanges(true);
  };

  // Update Status
  const handleCandidateStatusChange = async (studentId: string, newStatus: CandidateStatus) => {
    if (selectedEvent?.status === 'locked') {
      alert('សម័យប្រឡងនេះត្រូវបានចាក់សោររួចហើយ មិនអាចកែប្រែស្ថានភាពបានទេ');
      return;
    }

    // Update in-memory
    const updated = distributions.map(dist => ({
      ...dist,
      candidates: dist.candidates.map(item => {
        if (item.candidate.student_id === studentId || item.candidate.id === studentId) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    }));
    setDistributions(updated);
    setHasUnsavedChanges(true);

    // Save directly to server if not dirty
    try {
      await updateCandidateExamStatus(selectedEventId, studentId, newStatus);
    } catch (e: any) {
      console.warn('Deferred status save:', e.message);
    }
  };

  // Save Assignments
  const handleSaveAssignments = async () => {
    if (!selectedEventId || distributions.length === 0) return;
    setSaving(true);
    try {
      const config: AllocationConfig = {
        method: distributionMethod,
        targetPerRoom,
        customCapacities,
        manualRanges,
        ordering: studentOrdering,
        mixingMode,
        selectedRoomIds: selectedEvent?.selected_room_ids || [],
        startingOrderNumber: 1
      };
      await saveSeatAssignments(selectedEventId, distributions, config);
      setHasUnsavedChanges(false);
      alert('បានរក្សាទុកការបែងចែកកៅអីប្រឡងដោយជោគជ័យ (Atomic Save Success)!');
    } catch (e: any) {
      alert('កំហុសក្នុងការរក្សាទុក៖ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Publish with Server Validation
  const handlePublish = async () => {
    if (!selectedEventId) return;
    if (hasUnsavedChanges) {
      alert('សូមចុច "រក្សាទុកការបែងចែក" ជាមុនសិន មុននឹងធ្វើការបោះពុម្ពផ្សាយ');
      return;
    }

    if (!confirm(`តើអ្នកពិតជាចង់បោះពុម្ពផ្សាយសម័យប្រឡង "${selectedEvent?.title}" មែនទេ?`)) return;

    setPublishing(true);
    try {
      await publishExamEvent(selectedEventId);
      setSelectedEvent((prev: any) => ({ ...prev, status: 'published' }));
      setEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, status: 'published' } : e));
      alert('បានបោះពុម្ពផ្សាយសម័យប្រឡងដោយជោគជ័យ!');
    } catch (e: any) {
      alert('មិនអាចបោះពុម្ពផ្សាយបានទេ៖ ' + e.message);
    } finally {
      setPublishing(false);
    }
  };

  // Lock Event
  const handleLock = async () => {
    if (!selectedEventId) return;
    if (!confirm('ការចាក់សោរនឹងការពារមិនឱ្យមានការកែប្រែទិន្នន័យកៅអីប្រឡង ឬបញ្ជីបេក្ខជនឡើយ។ តើអ្នកចង់បន្តមែនទេ?')) return;

    try {
      await lockExamEvent(selectedEventId);
      setSelectedEvent((prev: any) => ({ ...prev, status: 'locked' }));
      setEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, status: 'locked' } : e));
      alert('បានចាក់សោរសម័យប្រឡងដោយជោគជ័យ!');
    } catch (e: any) {
      alert('កំហុសក្នុងការចាក់សោរ៖ ' + e.message);
    }
  };

  // Unlock Event
  const handleUnlock = async () => {
    if (!selectedEventId) return;
    if (!confirm('តើអ្នកពិតជាចង់ដោះសោរសម័យប្រឡងនេះដើម្បីកែប្រែឡើងវិញមែនទេ?')) return;

    try {
      await unlockExamEvent(selectedEventId);
      setSelectedEvent((prev: any) => ({ ...prev, status: 'published' }));
      setEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, status: 'published' } : e));
      alert('បានដោះសោរដោយជោគជ័យ!');
    } catch (e: any) {
      alert('កំហុស៖ ' + e.message);
    }
  };

  // Toggle Physical Room Active
  const handleToggleRoomActive = async (roomId: string, currentActive: boolean) => {
    try {
      await toggleRoomActiveStatus(roomId, !currentActive);
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, is_active: !currentActive } : r));
    } catch (e: any) {
      alert('កំហុសក្នុងការប្តូរស្ថានភាពបន្ទប់៖ ' + e.message);
    }
  };

  // Authoritative Validation
  const validation = validateExamAllocation(distributions, candidatePool.length);
  const totalAssigned = distributions.reduce((sum, d) => sum + d.candidates.length, 0);
  const isLocked = selectedEvent?.status === 'locked';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#155EEF]/10 text-[#155EEF] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                រៀបចំបន្ទប់ប្រឡង & បញ្ជីបេក្ខជន (Exam Room Allocation)
              </h1>
              <p className="text-slate-500 font-bold text-xs mt-0.5">
                បែងចែកកៅអីប្រឡង ៥៣ បន្ទប់ និងទាញយកបញ្ជីឈ្មោះតាមលំនាំស្តង់ដារ វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Event Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-slate-200">
            <span className="text-xs font-bold text-slate-500">សម័យប្រឡង៖</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="appearance-none bg-transparent text-slate-800 py-1 pr-4 focus:outline-none font-black text-xs cursor-pointer"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.academic_year})</option>
              ))}
            </select>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              title="បង្កើតសម័យប្រឡងថ្មី"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate Pool Button */}
          <button
            onClick={() => setIsCandidatePoolModalOpen(true)}
            disabled={isLocked}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl text-xs transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Users className="w-4 h-4 text-[#155EEF]" /> បញ្ជីបេក្ខជន ({candidatePool.length})
          </button>

          {/* Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={distributions.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> ទាញយក Excel ៨ សន្លឹក / PDF
          </button>

          {/* Save Draft Button */}
          <button
            onClick={handleSaveAssignments}
            disabled={saving || isLocked || distributions.length === 0}
            className={`px-4 py-2 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 ring-2 ring-amber-400 animate-pulse'
                : 'bg-[#155EEF] hover:bg-blue-700 shadow-sm shadow-blue-500/20'
            }`}
          >
            <Save className="w-4 h-4" /> {saving ? 'កំពុងរក្សាទុក...' : (hasUnsavedChanges ? 'រក្សាទុកការកែប្រែ *' : 'រក្សាទុកការបែងចែក')}
          </button>

          {/* Publish / Lock Buttons */}
          {selectedEvent?.status === 'published' ? (
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> បានបោះពុម្ពផ្សាយ
              </span>
              <button
                onClick={handleLock}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="ចាក់សោរសម័យប្រឡង"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" /> ចាក់សោរ
              </button>
            </div>
          ) : isLocked ? (
            <button
              onClick={handleUnlock}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="ចុចដើម្បីដោះសោរ"
            >
              <Unlock className="w-4 h-4 text-amber-400" /> សម័យប្រឡងបានចាក់សោរ (ដោះសោរ)
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing || hasUnsavedChanges || !validation.isValid || candidatePool.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" /> {publishing ? 'កំពុងបោះពុម្ព...' : 'បោះពុម្ពផ្សាយ (Publish)'}
            </button>
          )}
        </div>
      </header>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#155EEF] rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-3xl font-black">{candidatePool.length}</span>
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </span>
          </div>
          <p className="text-xs font-bold text-blue-100 mt-2">បេក្ខជនក្នុងបញ្ជីផ្លូវការ (Pool)</p>
        </div>

        <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-3xl font-black">{distributions.length}</span>
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </span>
          </div>
          <p className="text-xs font-bold text-emerald-100 mt-2">បន្ទប់ប្រឡងត្រូវបានបែងចែក</p>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-3xl font-black">
              {distributions.length > 0 ? (totalAssigned / distributions.length).toFixed(1) : 0}
            </span>
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-white" />
            </span>
          </div>
          <p className="text-xs font-bold text-indigo-100 mt-2">មធ្យមភាគសិស្ស / បន្ទប់</p>
        </div>

        <div className="bg-amber-500 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-3xl font-black">
              {distributions[0]?.startOrder || 1} - {distributions[distributions.length - 1]?.endOrder || totalAssigned}
            </span>
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
          </div>
          <p className="text-xs font-bold text-amber-100 mt-2">ជួរលេខតុបន្តបន្ទាប់ (Global Desks)</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('allocation')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'allocation'
              ? 'bg-[#155EEF] text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> ផ្ទាំងបែងចែកកៅអី (Allocation Studio)
        </button>

        <button
          onClick={() => setActiveTab('rooms_inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'rooms_inventory'
              ? 'bg-[#155EEF] text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> គ្រប់គ្រងបន្ទប់សិក្សា ៥៣ បន្ទប់ ({rooms.length})
        </button>
      </div>

      {/* TAB 1: ALLOCATION STUDIO */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          {/* If Candidate Pool is Empty */}
          {candidatePool.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 bg-blue-50 text-[#155EEF] rounded-3xl flex items-center justify-center mx-auto shadow-2xs">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">មិនទាន់បានជ្រើសរើសបេក្ខជនសម្រាប់សម័យប្រឡងនេះ</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 max-w-md mx-auto">
                  សម័យប្រឡងនីមួយៗតម្រូវឱ្យជ្រើសរើសបញ្ជីបេក្ខជនច្បាស់លាស់ (Persisted Pool) មុននឹងអាចដំណើរការបែងចែកបន្ទប់ប្រឡងបាន។
                </p>
              </div>
              <button
                onClick={() => setIsCandidatePoolModalOpen(true)}
                disabled={isLocked}
                className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> ជ្រើសរើសបញ្ជីបេក្ខជនឥឡូវនេះ
              </button>
            </div>
          ) : (
            <>
              {/* Allocation Config Bar */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#155EEF]" />
                    <h3 className="text-xs font-black text-slate-800">ការកំណត់យុទ្ធសាស្ត្រចែកបន្ទប់ (Allocation Controls)</h3>
                    {hasUnsavedChanges && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md">
                        មានការកែប្រែមិនទាន់ Save
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRunAllocation()}
                    disabled={isLocked}
                    className="px-4 py-1.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-lg text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> ដំណើរការចែកកៅអីឡើងវិញ (Re-Calculate)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Method Selector */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-600">វិធីសាស្ត្រចែកបន្ទប់</label>
                    <select
                      value={distributionMethod}
                      disabled={isLocked}
                      onChange={(e) => setDistributionMethod(e.target.value as DistributionMethod)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] disabled:opacity-60"
                    >
                      <option value="fixed_capacity">Method A: ចំណុះកំណត់ថេរ (Fixed)</option>
                      <option value="custom_capacity">Method B: ចំណុះតាមបន្ទប់ (Custom)</option>
                      <option value="manual_split">Method C: កំណត់ Range (Manual)</option>
                      <option value="auto_balanced">Method D: ចែកស្មើគ្នា (Balanced)</option>
                    </select>
                  </div>

                  {/* Target Capacity */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-600">ចំនួនសិស្ស / បន្ទប់ (Target)</label>
                    <input
                      type="number"
                      min={10}
                      max={45}
                      disabled={isLocked}
                      value={targetPerRoom}
                      onChange={(e) => setTargetPerRoom(parseInt(e.target.value, 10) || 25)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] disabled:opacity-60"
                    />
                  </div>

                  {/* Ordering */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-600">លំដាប់តម្រៀបសិស្ស</label>
                    <select
                      value={studentOrdering}
                      disabled={isLocked}
                      onChange={(e) => setStudentOrdering(e.target.value as StudentOrdering)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] disabled:opacity-60"
                    >
                      <option value="name">តាមឈ្មោះខ្មែរ (A-Z)</option>
                      <option value="desk_number">តាមលេខតុក្នុងថ្នាក់</option>
                      <option value="student_id">តាមអត្តលេខសិស្ស</option>
                      <option value="random">ច្របល់ចៃដន្យ (Random)</option>
                    </select>
                  </div>

                  {/* Mixing */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-600">ការច្របល់ថ្នាក់</label>
                    <select
                      value={mixingMode}
                      disabled={isLocked}
                      onChange={(e) => setMixingMode(e.target.value as MixingMode)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] disabled:opacity-60"
                    >
                      <option value="keep_classes">រក្សាជាក្រុមថ្នាក់ (Keep Classes)</option>
                      <option value="mix_classes">ច្របល់ឆ្លាស់ថ្នាក់ (Mix Round-Robin)</option>
                      <option value="balanced_classes">ចែកសមាមាត្រស្មើគ្នា (Balanced)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Validation Banner */}
              {(!validation.isValid || validation.warnings.length > 0) && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  !validation.isValid ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="font-black flex items-center gap-1.5">
                    {!validation.isValid ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    <span>{!validation.isValid ? 'រកឃើញកំហុសនៃការបែងចែកកៅអីប្រឡង (Publish ត្រូវបានរារាំង)៖' : 'ការក្រើនរំលឹកសុវត្ថិភាព៖'}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 font-bold pl-2">
                    {validation.errors.map((err, i) => (
                      <li key={`err-${i}`} className="text-rose-700">{err}</li>
                    ))}
                    {validation.warnings.map((warn, i) => (
                      <li key={`warn-${i}`} className="text-amber-700">{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {distributions.map((dist, idx) => {
                  const isOver = dist.candidates.length > dist.capacity;

                  return (
                    <div
                      key={dist.roomId}
                      className={`bg-white rounded-2xl border-2 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                        isOver ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200/80 hover:border-blue-300'
                      }`}
                    >
                      <div>
                        {/* Card Top */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] font-black text-base rounded-xl flex items-center justify-center">
                              {dist.roomNumber}
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-slate-900">បន្ទប់លេខ {dist.roomNumber}</h4>
                              <span className="text-[11px] font-bold text-slate-400">{dist.building || 'អគារសិក្សា'}</span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                            isOver
                              ? 'bg-rose-100 text-rose-800'
                              : (dist.candidates.length >= dist.capacity ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                          }`}>
                            {dist.candidates.length} / {dist.capacity}
                          </span>
                        </div>

                        {/* Desk Range Badge */}
                        <div className="mt-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">លេខតុប្រឡង៖</span>
                          <strong className="font-black text-[#155EEF]">
                            {dist.startOrder} ដល់ {dist.endOrder}
                          </strong>
                        </div>

                        {/* Mini Class Pills */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {Array.from(new Set(dist.candidates.map(c => c.candidate.class_name))).map(cls => (
                            <span key={cls} className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedRoomIndex(idx);
                            setIsDrawerOpen(true);
                          }}
                          className="text-xs font-black text-[#155EEF] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> ពិនិត្យឈ្មោះ & Swap
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleShiftBoundary(idx, idx - 1, 1)}
                            disabled={idx === 0 || dist.candidates.length === 0 || isLocked}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-black text-xs disabled:opacity-30 cursor-pointer"
                            title="រំកិល ១ នាក់ទៅបន្ទប់មុន"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleShiftBoundary(idx, idx + 1, 1)}
                            disabled={idx === distributions.length - 1 || dist.candidates.length === 0 || isLocked}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-black text-xs disabled:opacity-30 cursor-pointer"
                            title="រំកិល ១ នាក់ទៅបន្ទប់បន្ទាប់"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PHYSICAL ROOMS INVENTORY */}
      {activeTab === 'rooms_inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">គ្រប់គ្រងបន្ទប់សិក្សា ៥៣ បន្ទប់</h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">គ្រប់គ្រងទីតាំង អគារ ជាន់ និងចំណុះអតិបរមារបស់បន្ទប់នីមួយៗ</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full">
                {rooms.filter(r => r.is_active).length} បន្ទប់សកម្ម
              </span>
              <button
                onClick={() => {
                  setRoomToEdit(null);
                  setIsPhysicalRoomModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> បន្ថែមបន្ទប់
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-black">
                <tr>
                  <th className="py-3 px-4 text-center w-20">បន្ទប់លេខ</th>
                  <th className="py-3 px-4">អគារ</th>
                  <th className="py-3 px-4">ជាន់</th>
                  <th className="py-3 px-4 text-center">ចំណុះអតិបរមា</th>
                  <th className="py-3 px-4 text-center">ស្ថានភាព</th>
                  <th className="py-3 px-4 text-center w-24">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center font-black text-sm text-[#155EEF]">
                      {room.room_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{room.building || 'អគារ A'}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">{room.floor || 'ជាន់ផ្ទាល់ដី'}</td>
                    <td className="py-3 px-4 text-center font-black text-slate-800">{room.capacity} កៅអី</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                        room.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {room.is_active ? 'ដំណើរការ' : 'បិទ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setRoomToEdit(room);
                            setIsPhysicalRoomModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="កែប្រែ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleRoomActive(room.id, room.is_active)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            room.is_active ? 'bg-rose-50 hover:bg-rose-100 text-rose-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                          }`}
                          title={room.is_active ? 'បិទដំណើរការ' : 'បើកដំណើរការ'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Candidate Drawer */}
      <RoomCandidateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        roomDist={distributions[selectedRoomIndex]}
        roomIndex={selectedRoomIndex}
        totalRooms={distributions.length}
        allDistributions={distributions}
        onShiftBoundary={handleShiftBoundary}
        onMoveCandidate={handleMoveCandidate}
        onSwapCandidates={handleSwapCandidates}
        onStatusChange={handleCandidateStatusChange}
      />

      {/* Export Modal */}
      <ExamExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        distributions={distributions}
        eventTitle={selectedEvent?.title || 'ការប្រឡងប្រចាំខែ មីនា'}
        academicYear={selectedEvent?.academic_year || '២០២៥-២០២៦'}
        examDate={selectedEvent?.exam_date || 'ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦'}
      />

      {/* Create / Edit Exam Event Modal */}
      <ExamEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSuccess={(newEvent) => {
          setEvents(prev => [newEvent, ...prev]);
          setSelectedEventId(newEvent.id);
          setSelectedEvent(newEvent);
        }}
      />

      {/* Candidate Pool Selection Modal */}
      <CandidatePoolModal
        isOpen={isCandidatePoolModalOpen}
        onClose={() => setIsCandidatePoolModalOpen(false)}
        eventId={selectedEventId}
        eventTitle={selectedEvent?.title || ''}
        currentPool={candidatePool}
        onSuccess={(savedCount) => {
          // Trigger refetch
          setSelectedEventId(selectedEventId + ' ');
          setTimeout(() => setSelectedEventId(selectedEventId.trim()), 100);
        }}
      />

      {/* Physical Room Modal */}
      <PhysicalRoomModal
        isOpen={isPhysicalRoomModalOpen}
        onClose={() => setIsPhysicalRoomModalOpen(false)}
        roomToEdit={roomToEdit}
        onSuccess={(savedRoom) => {
          setRooms(prev => {
            const exists = prev.some(r => r.id === savedRoom.id);
            if (exists) {
              return prev.map(r => r.id === savedRoom.id ? savedRoom : r);
            }
            return [...prev, savedRoom].sort((a, b) => (parseInt(a.room_number, 10) || 0) - (parseInt(b.room_number, 10) || 0));
          });
        }}
      />
    </div>
  );
}

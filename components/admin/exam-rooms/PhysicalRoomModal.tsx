'use client';

import React, { useState } from 'react';
import { Building2, Save, Loader2, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { saveExamRoom } from '@/app/(dashboard)/admin/exam-rooms/actions';

interface PhysicalRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit?: any;
  onSuccess: (room: any) => void;
}

export function PhysicalRoomModal({
  isOpen,
  onClose,
  roomToEdit,
  onSuccess
}: PhysicalRoomModalProps) {
  const [roomNumber, setRoomNumber] = useState(roomToEdit?.room_number || '');
  const [building, setBuilding] = useState(roomToEdit?.building || 'អគារ A');
  const [floor, setFloor] = useState(roomToEdit?.floor || 'ជាន់ផ្ទាល់ដី');
  const [capacity, setCapacity] = useState(roomToEdit?.capacity || 30);
  const [isActive, setIsActive] = useState(roomToEdit?.is_active !== undefined ? roomToEdit.is_active : true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setErrorMessage('សូមបញ្ចូលលេខបន្ទប់');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const saved = await saveExamRoom({
        id: roomToEdit?.id,
        room_number: roomNumber.trim(),
        building,
        floor,
        capacity: parseInt(String(capacity), 10) || 30,
        is_active: isActive
      });
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'កំហុសក្នុងការរក្សាទុកបន្ទប់');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Building2 className="w-5 h-5" />
        </div>
      }
      title={roomToEdit ? `កែប្រែព័ត៌មានបន្ទប់លេខ ${roomToEdit.room_number}` : 'បន្ថែមបន្ទប់ប្រឡងថ្មី (Add Physical Room)'}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">លេខបន្ទប់ *</label>
          <input
            type="text"
            required
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="ឧ. 1, 2, ..., 54"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">អគារ</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="អគារ A, B, C..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ជាន់</label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="ជាន់ផ្ទាល់ដី, ជាន់ទី១..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">ចំណុះអតិបរមា (កៅអី)</label>
          <input
            type="number"
            min={5}
            max={60}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 30)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_active_check"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-[#155EEF] cursor-pointer"
          />
          <label htmlFor="is_active_check" className="text-xs font-bold text-slate-700 cursor-pointer">
            បន្ទប់នេះកំពុងដំណើរការ (Active Room)
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl text-xs cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            រក្សាទុក
          </button>
        </div>
      </form>
    </Modal>
  );
}

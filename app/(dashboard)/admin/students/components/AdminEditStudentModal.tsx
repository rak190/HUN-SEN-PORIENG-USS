'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { 
  User, Phone, MapPin, Calendar, Award, 
  UploadCloud, Trash2, Loader2, AlertCircle, 
  CheckCircle2, UserCog, Heart, Shield, Sparkles
} from 'lucide-react';
import { updateAdminStudentProfileAction } from '../actions';

interface AdminEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  academicYearId?: string;
  onSuccess: (updatedStudent: any) => void;
}

export default function AdminEditStudentModal({
  isOpen,
  onClose,
  student,
  academicYearId,
  onSuccess,
}: AdminEditStudentModalProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'family' | 'additional'>('identity');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [dob, setDob] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [stagedPhotoFile, setStagedPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Family & Contacts
  const [parentPhone, setParentPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherJob, setFatherJob] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherJob, setMotherJob] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianJob, setGuardianJob] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');

  // Additional Profile & Seating
  const [studentStatus, setStudentStatus] = useState<'new' | 'repeater' | 'transfer'>('new');
  const [deskNumber, setDeskNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [scholarship, setScholarship] = useState<'yes' | 'no'>('no');
  const [idPoor, setIdPoor] = useState<'none' | 'level_1' | 'level_2'>('none');
  const [orphan, setOrphan] = useState<'yes' | 'no'>('no');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [disability, setDisability] = useState<'none' | 'mild' | 'severe'>('none');
  const [specialNeeds, setSpecialNeeds] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form state when student changes or modal opens
  useEffect(() => {
    if (!isOpen || !student) return;

    setFullName(student.full_name || '');
    setStudentIdNumber(student.student_id_number || '');
    setEnglishName(student.english_name || student.latin_name || '');
    setGender(student.gender === 'ស្រី' || student.gender === 'F' ? 'F' : 'M');
    
    // Resolve DOB from dob or date_of_birth
    const rawDob = student.dob || student.date_of_birth || '';
    setDob(rawDob ? rawDob.slice(0, 10) : '');

    setPhotoUrl(student.photo_url || null);
    setPhotoPreview(student.photo_url || null);
    setStagedPhotoFile(null);

    setParentPhone(student.parent_phone || student.student_phone || '');
    setEmergencyPhone(student.emergency_contact_phone || student.emergency_phone || '');
    setFatherName(student.father_name || '');
    setFatherJob(student.father_job || '');
    setFatherPhone(student.father_phone || '');
    setMotherName(student.mother_name || '');
    setMotherJob(student.mother_job || '');
    setMotherPhone(student.mother_phone || '');
    setGuardianName(student.guardian_name || '');
    setGuardianJob(student.guardian_job || '');
    setGuardianPhone(student.guardian_phone || '');
    setCurrentAddress(student.current_address || student.address || '');

    setStudentStatus(student.status === 'repeater' ? 'repeater' : student.status === 'transfer' ? 'transfer' : 'new');
    setDeskNumber(student.desk_number || '');
    setRoomNumber(student.room_number || '');
    setScholarship(student.scholarship === 'yes' ? 'yes' : 'no');
    setIdPoor(student.id_poor === 'level_1' ? 'level_1' : student.id_poor === 'level_2' ? 'level_2' : 'none');
    setOrphan(student.orphan === 'yes' ? 'yes' : 'no');
    setDistanceKm(student.distance_km !== null && student.distance_km !== undefined ? String(student.distance_km) : '');
    setDisability(student.disability === 'mild' ? 'mild' : student.disability === 'severe' ? 'severe' : 'none');
    setSpecialNeeds(student.special_needs_status || '');

    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab('identity');
  }, [isOpen, student]);

  // Client-side image compression utility
  const compressImage = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.82): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Blob conversion failed'))),
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Check size limit: max 5MB before compression
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ទំហំរូបភាពធំពេក (អតិបរមា 5MB)');
      return;
    }

    setStagedPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setErrorMsg(null);
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    setStagedPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validation
    if (!fullName.trim()) {
      setErrorMsg('សូមបញ្ចូលគោត្តនាម និងនាមសិស្ស');
      setActiveTab('identity');
      return;
    }

    if (!studentIdNumber.trim()) {
      setErrorMsg('សូមបញ្ចូលអត្តលេខសិស្ស');
      setActiveTab('identity');
      return;
    }

    if (!dob.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setErrorMsg('សូមជ្រើសរើសថ្ងៃខែឆ្នាំកំណើតឱ្យបានត្រឹមត្រូវ (YYYY-MM-DD)');
      setActiveTab('identity');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPhotoUrl = photoUrl;

      // 1. Upload Staged Photo to R2 if selected
      if (stagedPhotoFile) {
        setIsUploadingPhoto(true);
        try {
          const compressedBlob = await compressImage(stagedPhotoFile);
          const presignRes = await fetch('/api/s3-presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `${studentIdNumber.trim() || 'student'}-${Date.now()}.webp`,
              fileType: 'image/webp',
            }),
          });

          if (!presignRes.ok) {
            const errData = await presignRes.json().catch(() => ({}));
            throw new Error(errData.error || 'បរាជ័យក្នុងការស្នើសុំសិទ្ធិផ្ទុករូបភាព');
          }

          const { presignedUrl, publicUrl } = await presignRes.json();

          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            body: compressedBlob,
            headers: { 'Content-Type': 'image/webp' },
          });

          if (!uploadRes.ok) {
            throw new Error('បរាជ័យក្នុងការផ្ទុករូបភាពទៅកាន់ Cloudflare R2');
          }

          finalPhotoUrl = publicUrl;
        } catch (uploadErr: any) {
          console.warn('Student photo upload failed:', uploadErr);
          setErrorMsg(`ការផ្ទុករូបភាពបរាជ័យ៖ ${uploadErr.message || 'សូមពិនិត្យការតភ្ជាប់ប្រព័ន្ធផ្ទុកឯកសារ'}`);
          setIsSubmitting(false);
          setIsUploadingPhoto(false);
          return;
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      // 2. Call Server Action to Update Student Profile
      const payload = {
        studentId: student.id,
        full_name: fullName.trim(),
        student_id_number: studentIdNumber.trim(),
        english_name: englishName.trim() || null,
        gender: gender,
        dob: dob.trim(),
        photo_url: finalPhotoUrl || '',
        parent_phone: parentPhone.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        father_name: fatherName.trim() || null,
        father_job: fatherJob.trim() || null,
        father_phone: fatherPhone.trim() || null,
        mother_name: motherName.trim() || null,
        mother_job: motherJob.trim() || null,
        mother_phone: motherPhone.trim() || null,
        guardian_name: guardianName.trim() || null,
        guardian_job: guardianJob.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        current_address: currentAddress.trim() || null,
        status: studentStatus,
        scholarship: scholarship,
        id_poor: idPoor,
        orphan: orphan,
        distance_km: distanceKm ? Number(distanceKm) : null,
        disability: disability,
        special_needs_status: specialNeeds.trim() || null,
        desk_number: deskNumber.trim() || null,
        room_number: roomNumber.trim() || null,
        academic_year_id: academicYearId || student.academic_year_id || null,
      };

      const result = await updateAdminStudentProfileAction(payload);

      if (!result.success) {
        setErrorMsg(result.error || 'បរាជ័យក្នុងការកែប្រែព័ត៌មានសិស្ស');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('បានកែប្រែព័ត៌មានសិស្សដោយជោគជ័យ!');
      
      // Notify parent to refresh drawer and list
      if (result.student) {
        onSuccess({
          ...student,
          ...result.student,
          class_name: student.class_name,
          homeroom_teacher: student.homeroom_teacher,
        });
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Submit edit student error:', err);
      setErrorMsg(err?.message || 'មានបញ្ហាមិនរំពឹងទុក');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title="កែប្រែព័ត៌មានសិស្ស"
      subtitle={`សិស្ស៖ ${student?.full_name || ''} (${student?.student_id_number || 'គ្មានអត្តលេខ'})`}
      icon={
        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-[#155EEF] shadow-xs">
          <UserCog className="w-5 h-5" />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 pb-3 gap-2 overflow-x-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'identity'
                ? 'bg-[#155EEF] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>១. អត្តសញ្ញាណ & រូបថត</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('family')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'family'
                ? 'bg-[#155EEF] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>២. ទំនាក់ទំនង & គ្រួសារ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('additional')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'additional'
                ? 'bg-[#155EEF] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>៣. ព័ត៌មានបន្ថែម & កន្លែងអង្គុយ</span>
          </button>
        </div>

        {/* Error and Success Feedback Banners */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="flex-1">{successMsg}</p>
          </div>
        )}

        {/* TAB 1: CORE IDENTITY & PHOTO */}
        {activeTab === 'identity' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Photo Upload Section */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <h4 className="text-sm font-black text-slate-800">រូបថតសិស្ស (Student Photo)</h4>
                <p className="text-xs text-slate-500 font-medium">
                  អនុញ្ញាតតែឯកសាររូបភាព (JPG, PNG, WebP) ទំហំអតិបរមា 5MB។ ប្រព័ន្ធនឹងបង្រួមដោយស្វ័យប្រវត្តិ។
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-[#155EEF]" />
                    <span>ជ្រើសរើសរូបភាព</span>
                  </button>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>លុបរូបថត</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Core Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  គោត្តនាម និងនាម (Khmer Full Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ឧ. សុខ ចាន់ដារ៉ា"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  អត្តលេខសិស្ស (Student ID Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value)}
                  placeholder="ឧ. 5094"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះជាឡាតាំង (English Name)
                </label>
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  placeholder="ឧ. Sok Chandara"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ភេទ (Gender) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('M')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      gender === 'M'
                        ? 'bg-blue-50 border-[#155EEF] text-[#155EEF] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ប្រុស (Male)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('F')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      gender === 'F'
                        ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ស្រី (Female)
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ថ្ងៃខែឆ្នាំកំណើត (Date of Birth) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS & FAMILY */}
        {activeTab === 'family' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខទូរស័ព្ទអាណាព្យាបាល / សិស្ស (Primary Phone)
                </label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="ឧ. 012 345 678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខទូរស័ព្ទទំនាក់ទំនងបន្ទាន់ (Emergency Phone)
                </label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="ឧ. 098 765 432"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>

            {/* Father Details */}
            <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-blue-500" />
                <span>ព័ត៌មានឪពុក (Father's Info)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះឪពុក</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="ឈ្មោះឪពុក"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={fatherJob}
                    onChange={(e) => setFatherJob(e.target.value)}
                    placeholder="មុខរបរ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    placeholder="លេខទូរស័ព្ទ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mother Details */}
            <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>ព័ត៌មានម្តាយ (Mother's Info)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះម្តាយ</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="ឈ្មោះម្តាយ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={motherJob}
                    onChange={(e) => setMotherJob(e.target.value)}
                    placeholder="មុខរបរ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                    placeholder="លេខទូរស័ព្ទ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Guardian Details */}
            <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>ព័ត៌មានអាណាព្យាបាល (Guardian's Info - បើសិនមិនរស់នៅជាមួយឪពុកម្តាយ)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ឈ្មោះអាណាព្យាបាល</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="ឈ្មោះអាណាព្យាបាល"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">មុខរបរ</label>
                  <input
                    type="text"
                    value={guardianJob}
                    onChange={(e) => setGuardianJob(e.target.value)}
                    placeholder="មុខរបរ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="លេខទូរស័ព្ទ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                អាសយដ្ឋានបច្ចុប្បន្ន (Current Address: ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ, ខេត្ត/រាជធានី)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <textarea
                  rows={2}
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="ឧ. ភូមិព្រៃព្នៅ ឃុំព្រៃព្នៅ ស្រុកពារាំង ខេត្តព្រៃវែង"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADDITIONAL & SEATING */}
        {activeTab === 'additional' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Seating and Class Assignment for Active Academic Year */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#155EEF]" />
                <span>ការរៀបចំកន្លែងអង្គុយ និងការប្រឡង (Seating & Exam Room)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខតុ (Desk Number)</label>
                  <input
                    type="text"
                    value={deskNumber}
                    onChange={(e) => setDeskNumber(e.target.value)}
                    placeholder="ឧ. 14 ឬ B-02"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">លេខបន្ទប់ប្រឡង (Exam Room Number)</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="ឧ. 01 ឬ R-102"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Socio-Economic Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ស្ថានភាពសិស្ស (Student Status)</label>
                <select
                  value={studentStatus}
                  onChange={(e) => setStudentStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                >
                  <option value="new">សិស្សថ្មី (New Student)</option>
                  <option value="repeater">ត្រួតថ្នាក់ (Repeater)</option>
                  <option value="transfer">ផ្ទេរចូល (Transfer In)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ប័ណ្ណក្រីក្រ (ID-Poor Status)</label>
                <select
                  value={idPoor}
                  onChange={(e) => setIdPoor(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                >
                  <option value="none">មិនមានប័ណ្ណក្រីក្រ (None)</option>
                  <option value="level_1">ក្រីក្រកម្រិត ១ (ID-Poor 1)</option>
                  <option value="level_2">ក្រីក្រកម្រិត ២ (ID-Poor 2)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">អាហារូបករណ៍ (Scholarship)</label>
                <select
                  value={scholarship}
                  onChange={(e) => setScholarship(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                >
                  <option value="no">គ្មានអាហារូបករណ៍ (No)</option>
                  <option value="yes">ទទួលបានអាហារូបករណ៍ (Yes)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">កុមារកំព្រា (Orphan Status)</label>
                <select
                  value={orphan}
                  onChange={(e) => setOrphan(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                >
                  <option value="no">មិនមែនកុមារកំព្រា (No)</option>
                  <option value="yes">កុមារកំព្រា (Yes)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ចម្ងាយពីផ្ទះមកសាលា (គីឡូម៉ែត្រ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="ឧ. 2.5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ស្ថានភាពពិការភាព (Disability)</label>
                <select
                  value={disability}
                  onChange={(e) => setDisability(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                >
                  <option value="none">គ្មានពិការភាព (None)</option>
                  <option value="mild">ពិការភាពស្រាល (Mild)</option>
                  <option value="severe">ពិការភាពធ្ងន់ធ្ងរ (Severe)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  កំណត់ត្រាសេចក្តីត្រូវការពិសេស (Special Educational Needs)
                </label>
                <input
                  type="text"
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  placeholder="ឧ. ត្រូវការជំនួយក្នុងការមើលអក្សរធំ ឬពិបាកស្តាប់"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#155EEF] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            បោះបង់
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>រក្សាទុកការកែប្រែ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

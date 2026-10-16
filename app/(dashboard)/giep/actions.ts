'use server';

import { createClient } from '@/lib/supabase/server';
import { requireClassAccess } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const GiepNoteSchema = z.object({
  class_id: z.string().uuid(),
  activity_name: z.string().min(1, 'សូមបញ្ចូលឈ្មោះសកម្មភាព'),
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  participants: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
});

export type GiepNotePayload = z.infer<typeof GiepNoteSchema>;

/**
 * Server Action: Save GIEP Note
 * Enforces requireClassAccess, associates school_id and academic_year_id,
 * and saves into public.giep_notes.
 */
export async function saveGiepNoteAction(payload: GiepNotePayload) {
  try {
    const validated = GiepNoteSchema.parse(payload);
    const { user, profile } = await requireClassAccess(validated.class_id);

    const supabase = await createClient();
    const { data: classData, error: classErr } = await supabase
      .from('classes')
      .select('id, school_id, academic_year_id')
      .eq('id', validated.class_id)
      .single();

    if (classErr || !classData) {
      return { success: false, error: 'រកមិនឃើញថ្នាក់រៀននេះទេ (Class not found)' };
    }

    const { data, error } = await supabase
      .from('giep_notes')
      .insert({
        class_id: validated.class_id,
        school_id: classData.school_id || profile.school_id || 'main-school',
        academic_year_id: classData.academic_year_id || null,
        created_by: user.id,
        activity_name: validated.activity_name.trim(),
        activity_date: validated.activity_date || new Date().toISOString().slice(0, 10),
        participants: validated.participants?.trim() || null,
        outcome: validated.outcome?.trim() || null,
        status: 'approved',
      })
      .select()
      .single();

    if (error) {
      console.error('saveGiepNoteAction database error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/giep');
    return { success: true, note: data };
  } catch (err: any) {
    console.error('saveGiepNoteAction error:', err);
    return { success: false, error: err?.message || 'Failed to save GIEP note' };
  }
}

/**
 * Server Action: Delete GIEP Note
 * Enforces class authorization before deleting from public.giep_notes.
 */
export async function deleteGiepNoteAction(noteId: string) {
  try {
    const supabase = await createClient();
    const { data: note, error: fetchErr } = await supabase
      .from('giep_notes')
      .select('id, class_id, created_by')
      .eq('id', noteId)
      .single();

    if (fetchErr || !note) {
      return { success: false, error: 'រកមិនឃើញកំណត់ត្រានេះទេ (Note not found)' };
    }

    await requireClassAccess(note.class_id);

    const { error: delErr } = await supabase
      .from('giep_notes')
      .delete()
      .eq('id', noteId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath('/giep');
    return { success: true };
  } catch (err: any) {
    console.error('deleteGiepNoteAction error:', err);
    return { success: false, error: err?.message || 'Failed to delete GIEP note' };
  }
}

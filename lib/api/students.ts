import { SupabaseClient } from '@supabase/supabase-js';
import { Student } from '@/types';

/**
 * Encapsulated data access layer for student-related queries.
 * This guarantees consistent logic (e.g. always checking is_active = true) across the app.
 */
export const StudentAPI = {
  /**
   * Fetches all active students for a specific class.
   */
  async getActiveStudentsByClass(supabase: SupabaseClient, classId: string, selectFields = '*'): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select(selectFields)
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching active students:', error);
      throw error;
    }

    return data as unknown as Student[];
  },

  /**
   * Fetches all active students across the entire school.
   */
  async getAllActiveStudents(supabase: SupabaseClient, selectFields = '*'): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select(selectFields)
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching all active students:', error);
      throw error;
    }

    return data as unknown as Student[];
  },

  /**
   * Gets the count of active students for a specific class.
   */
  async getClassSize(supabase: SupabaseClient, classId: string): Promise<number> {
    const { count, error } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('is_active', true);

    if (error) {
      console.error('Error calculating class size:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Disables (soft-deletes) a student.
   */
  async softDeleteStudent(supabase: SupabaseClient, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      console.error('Error soft deleting student:', error);
      throw error;
    }
  }
};

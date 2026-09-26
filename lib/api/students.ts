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
      .from('active_class_rosters')
      .select(selectFields)
      .eq('enrollment_class_id', classId)
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
      .from('active_class_rosters')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_class_id', classId)
      .eq('is_active', true);

    if (error) {
      console.error('Error calculating class size:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Gets a specific student by ID with their active enrollment.
   */
  async getStudentById(supabase: SupabaseClient, studentId: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('active_class_rosters')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      console.error('Error fetching student:', error);
      throw error;
    }
    
    // If not found in active rosters, fallback to base students table
    if (!data) {
       const { data: baseData, error: baseError } = await supabase
         .from('students')
         .select('*')
         .eq('id', studentId)
         .single();
         
       if (baseError && baseError.code !== 'PGRST116') throw baseError;
       return (baseData as unknown as Student) || null;
    }

    return (data as unknown as Student) || null;
  }
};

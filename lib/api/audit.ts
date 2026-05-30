import { daasAPI } from '@/lib/buildpad/hooks/api';

/**
 * Logs a user action to the audit_trails table in DaaS/Supabase.
 * Useful for read actions like "QC Staff viewed Batch RM-001" or explicit actions.
 * 
 * @param action The name of the action performed (e.g. 'VIEW', 'SUBMIT')
 * @param targetTable The target table associated with the action (e.g. 'raw_materials')
 * @param recordId The unique identifier of the target record (e.g. batch ID)
 * @param oldData Optional text showing prior state
 * @param newData Optional text showing post-state
 */
export async function logAuditTrail(
  action: string,
  targetTable: string,
  recordId: string,
  oldData?: string,
  newData?: string
): Promise<void> {
  try {
    const user = await daasAPI.getMe().catch(() => null);
    if (!user) {
      console.warn('Skipping audit trail: No authenticated user context');
      return;
    }

    await daasAPI.createItem('audit_trails', {
      user_id: user.id,
      action,
      target_table: targetTable,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
    });
  } catch (error) {
    console.error('Failed to write to audit trail:', error);
  }
}

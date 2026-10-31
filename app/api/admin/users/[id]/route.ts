import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth-server';
import { resetStaffPasswordAction, updateStaffProfileAction, toggleStaffStatusAction, deleteStaffPermanentlyAction } from '@/app/(dashboard)/admin/teachers/actions';
import { z } from 'zod';

// Legacy per-id endpoint follows the same policy as the current /admin/teachers controls.
// Assignment changes belong to the separate, context-checked class workflows.
const patch = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['teacher', 'monitor', 'principal', 'admin']).optional(),
  phone: z.string().max(80).optional(),
  subject: z.string().max(200).optional(),
  password: z.string().min(6).optional(),
}).strict().refine(value => !value.password || Object.keys(value).length === 1, 'Save profile edits and password changes separately.');
type Context = { params: Promise<{ id: string }> };
async function authorized() {
  const { user, profile, role } = await getServerAuth();
  return !!user && role === 'admin' && profile?.is_active === true && !!profile.school_id;
}
export async function PATCH(req: Request, { params }: Context) {
  if (!await authorized()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  try {
    const { id } = await params;
    const value = patch.parse(await req.json());
    const result = value.password
      ? await resetStaffPasswordAction(id, value.password)
      : await updateStaffProfileAction(id, { full_name: value.fullName, role: value.role, phone: value.phone, subject: value.subject });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cannot update this account.' }, { status: error instanceof z.ZodError ? 400 : 403 });
  }
}
export async function DELETE(req: Request, { params }: Context) {
  if (!await authorized()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  try {
    const { id } = await params;
    const result = new URL(req.url).searchParams.get('force') === 'true'
      ? await deleteStaffPermanentlyAction(id)
      : await toggleStaffStatusAction(id, false);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cannot delete this account.' }, { status: 403 });
  }
}

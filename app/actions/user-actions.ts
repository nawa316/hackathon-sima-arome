'use server';

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

export interface CreateUserParams {
  email: string;
  password_raw: string;
  fullname: string;
  phone_number: string;
  gender: number;
  role_id: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Provision a new system user
 * 
 * 1. Creates credentialed user in Supabase auth.users using Admin client (bypassing email confirmation limits)
 * 2. If successful, inserts the profile record into public.users using the matching auth UUID
 */
export async function createUserAction(params: CreateUserParams): Promise<ActionResult> {
  try {
    const supabaseAdmin = createSupabaseAdmin();

    const { email, password_raw, fullname, phone_number, gender, role_id } = params;

    // Step 1: Create user in Supabase Auth using Admin Client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password_raw,
      email_confirm: true, // auto-confirm email for frictionless JIT onboarding
      user_metadata: {
        fullname: fullname.trim(),
      }
    });

    if (authError) {
      console.error('Supabase Auth provisioning failed:', authError);
      return {
        success: false,
        error: authError.message || 'Gagal meregistrasikan kredensial di sistem autentikasi utama',
      };
    }

    const newAuthUserId = authData?.user?.id;
    if (!newAuthUserId) {
      return {
        success: false,
        error: 'Sistem autentikasi gagal menghasilkan UUID pengguna baru',
      };
    }

    // Step 2: Hash the password using bcryptjs to prevent plain text leaks and ensure login trigger synchronization
    const hashedPassword = bcrypt.hashSync(password_raw, 10);

    // Step 3: Insert matching user profile details into public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newAuthUserId, // Match the exact Auth UUID to link authentication with profile data
        role_id: role_id,
        email: email.trim().toLowerCase(),
        fullname: fullname.trim(),
        phone_number: phone_number.trim(),
        gender: gender,
        password_hash: hashedPassword, // Store securely using bcrypt hash
      });

    if (profileError) {
      console.error('Profile creation failed. Rolling back auth user:', profileError);
      
      // Rollback Auth user if profile insert fails to prevent orphaned credentials
      await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);

      return {
        success: false,
        error: profileError.message || 'Gagal membuat baris profil di tabel database public.users',
      };
    }

    return {
      success: true,
      data: {
        id: newAuthUserId,
        email,
        fullname,
      }
    };
  } catch (err: any) {
    console.error('Unhandled Server Action error:', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem yang tidak diketahui pada Server Action',
    };
  }
}

export interface ResetPasswordParams {
  userId: string;
  newPassword_raw: string;
}

/**
 * Server Action: Reset a system user's password in both auth.users and public.users
 */
export async function resetUserPasswordAction(params: ResetPasswordParams): Promise<ActionResult> {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { userId, newPassword_raw } = params;

    if (!userId) {
      return { success: false, error: 'User ID tidak boleh kosong' };
    }
    if (!newPassword_raw || newPassword_raw.length < 6) {
      return { success: false, error: 'Password baru minimal harus 6 karakter' };
    }

    // Step 1: Update credential in auth.users using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword_raw }
    );

    if (authError) {
      console.error('Supabase Auth password reset failed:', authError);
      return {
        success: false,
        error: authError.message || 'Gagal mengubah password di sistem autentikasi utama',
      };
    }

    // Step 2: Hash the new password using bcryptjs to prevent plain text leaks
    const hashedPassword = bcrypt.hashSync(newPassword_raw, 10);

    // Step 3: Update public.users password_hash
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile password update failed:', profileError);
      return {
        success: false,
        error: profileError.message || 'Gagal menyinkronkan password baru ke tabel database public.users',
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unhandled reset password Server Action error:', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem saat menyetel ulang password',
    };
  }
}


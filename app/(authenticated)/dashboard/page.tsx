import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ChooseModuleClient from './ChooseModuleClient';

export const dynamic = 'force-dynamic';

export default async function ChooseModulePage() {
  let displayName = 'ESSENTIALS';
  let allowedModuleCodes: string[] = [];
  let isSuperAdmin = false;
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();

    // 1. Get current authenticated user session on server side
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    // 2. Fetch profile from public.users table and join roles info
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('*, roles(id, name, description)')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error('Error fetching profile details:', profileErr);
      throw new Error('Gagal memuat profil pengguna dari database.');
    }

    if (!profile) {
      throw new Error('Profil pengguna tidak ditemukan.');
    }

    displayName = profile.fullname || profile.email || 'ESSENTIALS';
    const userRole = profile.roles;

    if (!userRole) {
      throw new Error('Anda belum memiliki akses ke modul mana pun. Silakan hubungi Super Admin.');
    }

    // 3. Super Admin Protections - bypass filters and grant full workspace access
    if (userRole.name === 'Super Admin') {
      isSuperAdmin = true;
      allowedModuleCodes = ['authenticator', 'warehouse', 'productions', 'raw_materials', 'quality_control'];
    } else {
      // 4. Staff/Operational Access filters - Query dynamic permissions via bridge table
      const { data: rolePermissions, error: rpErr } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions (
            code,
            name
          )
        `)
        .eq('role_id', userRole.id);

      if (rpErr) {
        console.error('Error loading role privileges:', rpErr);
        throw new Error('Gagal memuat hak akses otorisasi untuk peran Anda.');
      }

      // Map relation to pull list of enabled module permission codes
      const parsedCodes = rolePermissions
        ?.map((rp: any) => {
          if (!rp.permissions) return null;
          // Handle cases where relationship fields are returned as arrays
          if (Array.isArray(rp.permissions)) {
            return rp.permissions[0]?.code;
          }
          return rp.permissions.code;
        })
        .filter(Boolean) || [];

      allowedModuleCodes = parsedCodes;

      if (allowedModuleCodes.length === 0) {
        throw new Error('Anda belum memiliki akses ke modul mana pun. Silakan hubungi Super Admin.');
      }
    }
  } catch (err: any) {
    console.error('Error in Server RBAC Module Selector load:', err);
    errorMessage = err.message || 'Terjadi gangguan koneksi pada server.';
  }

  return (
    <ChooseModuleClient
      displayName={displayName}
      allowedModuleCodes={allowedModuleCodes}
      isSuperAdmin={isSuperAdmin}
      errorMessage={errorMessage}
    />
  );
}

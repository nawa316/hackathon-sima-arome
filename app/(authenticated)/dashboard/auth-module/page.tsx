import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AuthDashboardClient from './AuthDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AuthDashboardPage() {
  // Default fallbacks in case of database connectivity interruptions
  let totalPersonnel = 0;
  let totalRoles = 0;
  let totalSuperAdmins = 0;
  let totalModules = 5;
  let distribution: { roleName: string; count: number; percentage: number }[] = [];
  let recentPersonnel: { fullname: string; email: string; roleName: string; joinDate: string }[] = [];

  try {
    const supabase = await createClient();

    // 1. Fetch Total Personnel count
    const { count: uCount, error: ue } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (!ue && uCount !== null) {
      totalPersonnel = uCount;
    }

    // 2. Fetch Total Access Roles count
    const { count: rCount, error: re } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true });
    if (!re && rCount !== null) {
      totalRoles = rCount;
    }

    // 3. Fetch Super Administrators count
    const { data: superAdmins, error: sae } = await supabase
      .from('users')
      .select('id, roles!inner(name)')
      .eq('roles.name', 'Super Admin');
    if (!sae && superAdmins) {
      totalSuperAdmins = superAdmins.length;
    }

    // 4. Fetch Modules Monitored count from permissions master table
    const { count: pCount, error: pe } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true });
    if (!pe && pCount !== null) {
      totalModules = pCount;
    }

    // 5. Fetch Role Distribution counts
    const { data: rolesWithUsers, error: distErr } = await supabase
      .from('roles')
      .select('id, name, users(id)');
    
    if (!distErr && rolesWithUsers) {
      distribution = rolesWithUsers
        .map((role: any) => {
          const count = Array.isArray(role.users) ? role.users.length : 0;
          const percentage = totalPersonnel > 0 ? Math.round((count / totalPersonnel) * 100) : 0;
          return {
            roleName: role.name,
            count,
            percentage,
          };
        })
        .sort((a, b) => b.count - a.count);
    }

    // 6. Fetch Recently Onboarded Personnel (limit 5)
    const { data: recentUsers, error: recentErr } = await supabase
      .from('users')
      .select('fullname, email, created_at, roles(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentErr && recentUsers) {
      recentPersonnel = recentUsers.map((user: any) => ({
        fullname: user.fullname || 'Unnamed User',
        email: user.email,
        roleName: user.roles?.name || 'No Role',
        joinDate: user.created_at 
          ? new Date(user.created_at).toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })
          : '-',
      }));
    }
  } catch (err) {
    console.error('Error fetching statistics for Auth Dashboard:', err);
  }

  return (
    <AuthDashboardClient
      stats={{
        totalPersonnel,
        totalRoles,
        totalSuperAdmins,
        totalModules,
      }}
      distribution={distribution}
      recentPersonnel={recentPersonnel}
    />
  );
}

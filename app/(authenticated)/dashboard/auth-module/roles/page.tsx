'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  SimpleGrid,
  ThemeIcon,
  Box,
  Tooltip,
  Loader,
  Alert,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconSearch,
  IconShieldLock,
  IconLock,
  IconInfoCircle,
  IconAlertCircle,
  IconRefresh,
  IconApps,
  IconBookmark,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

// Import Buildpad-First custom input and select components
import { Input, Textarea, Toggle } from '@/components/ui';

// Import Supabase browser client
import { createClient } from '@/lib/supabase/client';

// Interfaces based on Database Schema
interface Role {
  id: string;
  name: string;
  description: string;
}

export default function RolesPage() {
  useSetModuleTitle('Role Management');

  // Supabase Client
  const supabase = useMemo(() => createClient(), []);

  // React State for direct Supabase integration
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search Term
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal Control States
  const [formOpened, setFormOpened] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const [deleteOpened, setDeleteOpened] = useState<boolean>(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // Form Field States
  const [roleName, setRoleName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Relational RBAC (Many-to-Many) States
  const [availablePermissions, setAvailablePermissions] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all live roles from database
  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (fetchErr) throw fetchErr;
      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(err.message || 'Gagal memuat daftar hak akses dari database');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all live modules/permissions from database
  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const { data, error: permErr } = await supabase
        .from('permissions')
        .select('id, code, name')
        .order('name', { ascending: true });

      if (permErr) throw permErr;
      setAvailablePermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Statistics derived from live data
  const stats = useMemo(() => {
    const total = roles.length;
    const protectedCount = roles.filter((r) => r.name === 'Super Admin').length;
    const customCount = total - protectedCount;

    return {
      total,
      protectedCount,
      customCount,
    };
  }, [roles]);

  // Filtered roles matching search query
  const filteredRoles = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return roles;

    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query)
    );
  }, [roles, searchTerm]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingRoleId(null);
    setRoleName('');
    setDescription('');
    setSelectedPermissionIds([]);
    setErrors({});
    setFormOpened(true);
  };

  // Open Edit Modal with asynchronous permission retrieval
  const handleOpenEdit = async (role: Role) => {
    if (role.name === 'Super Admin') return; // Double protection guard
    setFormMode('edit');
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setDescription(role.description);
    setSelectedPermissionIds([]);
    setErrors({});
    setFormOpened(true);
    setModalLoading(true);

    try {
      const { data, error: rpErr } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', role.id);

      if (rpErr) throw rpErr;
      setSelectedPermissionIds(data?.map((rp) => rp.permission_id) || []);
    } catch (err: any) {
      console.error('Error fetching role permissions:', err);
      setError(err.message || 'Gagal memuat detail hak akses role');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Form Submission with validations & UNIQUE constraint handling
  const handleFormSubmit = async () => {
    const validationErrors: Record<string, string> = {};

    // 1. Role Name validation
    if (!roleName.trim()) {
      validationErrors.name = 'Nama role wajib diisi';
    } else if (roleName.trim().length > 50) {
      validationErrors.name = 'Nama role maksimal 50 karakter';
    }

    // 2. Description validation
    if (!description.trim()) {
      validationErrors.description = 'Deskripsi hak akses wajib diisi';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      if (formMode === 'add') {
        // Insert new role into Supabase
        const { data: newRole, error: insertErr } = await supabase
          .from('roles')
          .insert({
            name: roleName.trim(),
            description: description.trim(),
          })
          .select('id')
          .single();

        if (insertErr) {
          // Detect Postgres unique key constraint violation
          if (insertErr.code === '23505') {
            throw new Error(`Nama role '${roleName.trim()}' sudah terdaftar! Silakan gunakan nama lain.`);
          }
          throw insertErr;
        }

        const newRoleId = newRole?.id;
        if (!newRoleId) throw new Error('Gagal mendapatkan ID role baru.');

        // Insert selected role permissions into the bridge table
        if (selectedPermissionIds.length > 0) {
          const bridgeRows = selectedPermissionIds.map((pId) => ({
            role_id: newRoleId,
            permission_id: pId,
          }));
          const { error: bridgeErr } = await supabase
            .from('role_permissions')
            .insert(bridgeRows);

          if (bridgeErr) throw bridgeErr;
        }
      } else {
        // Update existing role in Supabase
        const { error: updateErr } = await supabase
          .from('roles')
          .update({
            name: roleName.trim(),
            description: description.trim(),
          })
          .eq('id', editingRoleId);

        if (updateErr) {
          if (updateErr.code === '23505') {
            throw new Error(`Nama role '${roleName.trim()}' sudah terdaftar! Silakan gunakan nama lain.`);
          }
          throw updateErr;
        }

        // Synchronize permissions bridge table: DELETE old links, INSERT currently toggled ones
        const { error: deleteBridgeErr } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRoleId);

        if (deleteBridgeErr) throw deleteBridgeErr;

        if (selectedPermissionIds.length > 0) {
          const bridgeRows = selectedPermissionIds.map((pId) => ({
            role_id: editingRoleId,
            permission_id: pId,
          }));
          const { error: insertBridgeErr } = await supabase
            .from('role_permissions')
            .insert(bridgeRows);

          if (insertBridgeErr) throw insertBridgeErr;
        }
      }

      setFormOpened(false);
      await fetchRoles(); // Refresh database view
    } catch (err: any) {
      console.error('Error saving role:', err);
      setError(err.message || 'Gagal menyimpan data role ke database Supabase');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Delete confirmation
  const handleOpenDelete = (role: Role) => {
    if (role.name === 'Super Admin') return; // Guard protection
    setDeletingRoleId(role.id);
    setDeleteOpened(true);
  };

  // Perform permanent database deletion
  const handleConfirmDelete = async () => {
    if (!deletingRoleId) return;

    setActionLoading(true);
    setError(null);

    try {
      const { error: deleteErr } = await supabase
        .from('roles')
        .delete()
        .eq('id', deletingRoleId);

      if (deleteErr) throw deleteErr;

      setDeleteOpened(false);
      setDeletingRoleId(null);
      await fetchRoles(); // Refresh
    } catch (err: any) {
      console.error('Error deleting role:', err);
      setError(err.message || 'Gagal menghapus role. Pastikan tidak ada user yang sedang menggunakan role ini.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Strict Typography Overrides - Absolutely No Times New Roman */
        .roles-mgmt-header,
        .modal-title-custom {
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
          color: var(--ds-primary-700, #143c26) !important;
          font-weight: 700 !important;
        }
        
        .roles-mgmt-sans-wrapper,
        .roles-mgmt-sans-wrapper *,
        .modal-body-custom,
        .modal-body-custom *,
        .role-table-row,
        .role-table-header,
        .metric-card {
          font-family: var(--ds-font-sans, 'Inter', sans-serif) !important;
        }

        .metric-card {
          border: 1px solid var(--ds-gray-200, rgba(0,0,0,0.06));
          border-radius: 12px;
          background: #ffffff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .role-table-header {
          font-weight: 600;
          color: var(--ds-primary-700, #143c26);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.8px;
        }

        .role-table-row {
          font-size: 0.875rem;
          transition: background-color 0.15s ease;
        }

        .role-table-row:hover {
          background-color: var(--ds-primary-100, #ebf7f0) !important;
        }

        .primary-action-btn {
          background-color: var(--ds-primary, #1e5b3a) !important;
          font-family: var(--ds-font-sans, 'Inter', sans-serif) !important;
          font-weight: 600 !important;
          transition: background-color 0.2s ease;
        }

        .primary-action-btn:hover {
          background-color: var(--ds-primary-700, #143c26) !important;
        }

        .helper-modules-box {
          background-color: #F9F8F4;
          border: 1px solid var(--ds-gray-200, rgba(0,0,0,0.06));
          border-radius: 8px;
        }
      `}</style>

      <Container size="xl" py="xl" className="roles-mgmt-sans-wrapper">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} className="roles-mgmt-header" size="h2">
                Role Management
              </Title>
              <Text c="dimmed" size="sm" style={{ fontWeight: 500 }}>
                Manage authorization privilege boundaries, access permissions, and scope mappings.
              </Text>
            </div>
            <Group gap="sm">
              <Button
                variant="light"
                color="var(--ds-primary, #1e5b3a)"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchRoles}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                className="primary-action-btn"
                leftSection={<IconPlus size={18} />}
                onClick={handleOpenAdd}
                radius="md"
              >
                Create Role
              </Button>
            </Group>
          </Group>

          {/* Error Alert Box */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Database Operation Error"
              color="red"
              variant="light"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Metric Cards Panel */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Total Access Roles
                  </Text>
                  <Text size="xl" fw={700} c="dark" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.total} Roles`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="var(--ds-primary, #1e5b3a)" variant="light">
                  <IconShieldLock size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Protected System Roles
                  </Text>
                  <Text size="xl" fw={700} c="red" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.protectedCount} Locked`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="red" variant="light">
                  <IconLock size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Custom Operational Roles
                  </Text>
                  <Text size="xl" fw={700} c="blue" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.customCount} Custom`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <IconBookmark size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Search Panel */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" align="center">
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <Input
                  value={searchTerm}
                  onChange={(val) => setSearchTerm(typeof val === 'string' ? val : '')}
                  placeholder="Search by role name or description..."
                  iconLeft={<IconSearch size={16} />}
                  clear
                />
              </div>
              <Group gap="xs">
                <IconInfoCircle size={16} color="var(--ds-primary, #1e5b3a)" />
                <Text size="xs" c="dimmed" fw={500}>
                  Showing {filteredRoles.length} of {roles.length} database roles
                </Text>
              </Group>
            </Group>
          </Paper>

          {/* Data Table */}
          <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#ffffff', overflowX: 'auto', minHeight: '200px' }}>
            {loading ? (
              <Stack align="center" justify="center" py="xl" style={{ height: '200px' }}>
                <Loader size="md" color="var(--ds-primary, #1e5b3a)" />
                <Text size="sm" c="dimmed" fw={500}>
                  Loading live roles from database...
                </Text>
              </Stack>
            ) : filteredRoles.length === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <Text fw={600} c="dimmed">
                  No roles found
                </Text>
                <Text size="xs" c="dimmed">
                  Try adjusting your search criteria or create a new role.
                </Text>
              </Stack>
            ) : (
              <Table verticalSpacing="md" horizontalSpacing="lg" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="role-table-header" style={{ width: '25%' }}>Role Name</Table.Th>
                    <Table.Th className="role-table-header" style={{ width: '55%' }}>Description / Hak Akses</Table.Th>
                    <Table.Th className="role-table-header" style={{ width: '20%', textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRoles.map((role) => {
                    const isSuperAdmin = role.name === 'Super Admin';
                    return (
                      <Table.Tr key={role.id} className="role-table-row">
                        <Table.Td>
                          <Group gap="xs">
                            <Text fw={700} c="dark">
                              {role.name}
                            </Text>
                            {isSuperAdmin && (
                              <Tooltip label="System Protected Role" position="top" withArrow>
                                <ThemeIcon size="xs" radius="xl" color="red" variant="light">
                                  <IconLock size={10} />
                                </ThemeIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {role.description}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            {isSuperAdmin ? (
                              <Badge color="red" variant="light" size="xs" leftSection={<IconLock size={10} />}>
                                System Locked
                              </Badge>
                            ) : (
                              <>
                                <Tooltip label="Edit Role" withArrow position="top">
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleOpenEdit(role)}
                                    size="sm"
                                    disabled={actionLoading}
                                  >
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Delete Role" withArrow position="top">
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    onClick={() => handleOpenDelete(role)}
                                    size="sm"
                                    disabled={actionLoading}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Container>

      {/* Add & Edit Modal */}
      <Modal
        opened={formOpened}
        onClose={() => !actionLoading && setFormOpened(false)}
        title={
          <Text className="modal-title-custom" size="lg">
            {formMode === 'add' ? 'Create Authorization Role' : 'Edit Privilege Scope'}
          </Text>
        }
        size="md"
        radius="lg"
        centered
      >
        <Stack gap="md" mt="xs" className="modal-body-custom">
          {/* Role Name */}
          <Input
            value={roleName}
            onChange={(val) => setRoleName(typeof val === 'string' ? val : '')}
            label="Role Name"
            placeholder="e.g. Warehouse Operator"
            required
            error={errors.name}
            maxLength={50}
            description="Unique identifier for the authorization scope (Max 50 characters)"
            disabled={actionLoading}
          />

          {/* Description */}
          <Textarea
            value={description}
            onChange={(val) => setDescription(val || '')}
            label="Description / Hak Akses"
            placeholder="e.g. productions.read, warehouse.update, quality_control.read"
            required
            error={errors.description}
            disabled={actionLoading}
            minRows={3}
            maxRows={6}
          />

          {/* Module Access Otorisasi Section */}
          <Stack gap="xs" mt="sm">
            <Title order={4} className="roles-mgmt-header" style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '2px solid var(--ds-primary-100, #ebf7f0)', paddingBottom: '4px' }}>
              Module Access Otorisasi
            </Title>
            {permissionsLoading ? (
              <Group justify="center" py="md">
                <Loader size="sm" color="var(--ds-primary, #1e5b3a)" />
                <Text size="xs" c="dimmed">Memuat modul otorisasi...</Text>
              </Group>
            ) : modalLoading ? (
              <Group justify="center" py="md">
                <Loader size="sm" color="var(--ds-primary, #1e5b3a)" />
                <Text size="xs" c="dimmed">Memuat detail hak akses role...</Text>
              </Group>
            ) : availablePermissions.length === 0 ? (
              <Text size="xs" c="dimmed">Tidak ada modul otorisasi yang tersedia di sistem.</Text>
            ) : (
              <Stack gap="xs" style={{ maxHeight: '220px', overflowY: 'auto' }} pr="xs">
                {availablePermissions.map((perm) => (
                  <Group
                    key={perm.id}
                    justify="space-between"
                    align="center"
                    py="xs"
                    style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}
                  >
                    <div>
                      <Text size="sm" fw={600} c="dark">
                        {perm.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Code: {perm.code}
                      </Text>
                    </div>
                    <Toggle
                      value={selectedPermissionIds.includes(perm.id)}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedPermissionIds((prev) => [...prev, perm.id]);
                        } else {
                          setSelectedPermissionIds((prev) => prev.filter((id) => id !== perm.id));
                        }
                      }}
                      disabled={actionLoading}
                    />
                  </Group>
                ))}
              </Stack>
            )}
          </Stack>

          <Group justify="flex-end" mt="lg">
            <Button variant="subtle" color="gray" onClick={() => setFormOpened(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="primary-action-btn"
              onClick={handleFormSubmit}
              loading={actionLoading}
            >
              {formMode === 'add' ? 'Create Role' : 'Save Changes'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={() => !actionLoading && setDeleteOpened(false)}
        title={
          <Text fw={700} size="md" c="red">
            Confirm Role Deletion
          </Text>
        }
        size="sm"
        radius="md"
        centered
      >
        <Stack gap="md" mt="xs" className="modal-body-custom">
          <Text size="sm">
            Are you sure you want to permanently delete this privilege role? This action will break connection mappings for any system personnel currently using it.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" size="xs" onClick={() => setDeleteOpened(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button color="red" size="xs" onClick={handleConfirmDelete} loading={actionLoading}>
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

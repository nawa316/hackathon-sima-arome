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
  IconUsers,
  IconUserCheck,
  IconLock,
  IconGenderMale,
  IconGenderFemale,
  IconInfoCircle,
  IconEye,
  IconMail,
  IconPhone,
  IconCalendar,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

// Import Buildpad-First custom input and select components
import { Input, SelectDropdown } from '@/components/ui';

// Import Supabase browser client
import { createClient } from '@/lib/supabase/client';

// Import Server Actions
import { createUserAction, resetUserPasswordAction } from '@/app/actions/user-actions';

// Interfaces based strictly on Database Schema
interface Role {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  role_id: string;
  email: string;
  fullname: string;
  phone_number: string;
  gender: number; // 1: Laki-laki, 2: Perempuan
  created_at: string;
  updated_at?: string;
  roles?: Role; // Joined from roles table
}

// Statically defined gender choices with string values to avoid numeric mapping errors in SelectDropdown
const GENDER_CHOICES = [
  { text: 'Laki-laki', value: '1' },
  { text: 'Perempuan', value: '2' },
];

export default function UsersPage() {
  useSetModuleTitle('User Management');

  // Supabase Client
  const supabase = useMemo(() => createClient(), []);

  // React State for direct Supabase integration
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search Term
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal Control States
  const [formOpened, setFormOpened] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [deleteOpened, setDeleteOpened] = useState<boolean>(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [viewOpened, setViewOpened] = useState<boolean>(false);
  const [viewedUser, setViewedUser] = useState<User | null>(null);

  // Form Field States
  const [fullname, setFullname] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [gender, setGender] = useState<string | null>(null); // Kept as string to avoid SelectDropdown type checks
  const [roleId, setRoleId] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Role choices mapping dynamically from fetched roles, with fallback when empty to avoid "configured incorrectly" error
  const roleChoices = useMemo(() => {
    if (roles.length === 0) {
      return [{ text: 'Loading access roles...', value: '' }];
    }
    return roles.map((role) => ({
      text: role.name,
      value: role.id,
    }));
  }, [roles]);

  // Fetch all live data from database (join users with roles)
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all Roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (rolesErr) throw rolesErr;
      setRoles(rolesData || []);

      // 2. Fetch all Users with Roles relationship
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*, roles:roles(id, name, description)')
        .order('created_at', { ascending: false });

      if (usersErr) throw usersErr;
      
      // Map joined roles if structure differs
      const mappedUsers = (usersData || []).map((u: any) => ({
        ...u,
        roles: Array.isArray(u.roles) ? u.roles[0] : u.roles,
      })) as User[];

      setUsers(mappedUsers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch live database records');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Statistics summaries derived from live database state
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.roles?.name === 'Super Admin').length;
    const maleCount = users.filter((u) => Number(u.gender) === 1).length;
    const femaleCount = users.filter((u) => Number(u.gender) === 2).length;

    return {
      total,
      adminCount,
      maleCount,
      femaleCount,
    };
  }, [users]);

  // Filtered users matching search query (fullname, email, or phone number)
  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return users;

    return users.filter(
      (user) =>
        user.fullname.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone_number.includes(query)
    );
  }, [users, searchTerm]);

  // Badge Color Mapper based on Role name
  const getRoleBadgeColor = (roleName?: string) => {
    if (!roleName) return 'gray';
    switch (roleName) {
      case 'Super Admin':
        return 'red';
      case 'Warehouse Manager':
        return 'cyan';
      case 'Production Compounder':
        return 'grape';
      case 'Quality Control Lab':
        return 'teal';
      case 'Procurement Officer':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingUserId(null);
    setFullname('');
    setEmail('');
    setPhoneNumber('');
    setGender(null);
    setRoleId(null);
    setPassword('');
    setErrors({});
    setFormOpened(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setFormMode('edit');
    setEditingUserId(user.id);
    setFullname(user.fullname);
    setEmail(user.email);
    setPhoneNumber(user.phone_number);
    setGender(user.gender ? String(user.gender) : null); // Populate as string for select choices
    setRoleId(user.role_id);
    setPassword(''); // Password optional on Edit (not submitted)
    setErrors({});
    setFormOpened(true);
  };

  // Open View Details Modal
  const handleOpenView = (user: User) => {
    setViewedUser(user);
    setViewOpened(true);
  };

  // Handle Form Submission with full validations and database query
  const handleFormSubmit = async () => {
    const validationErrors: Record<string, string> = {};

    // 1. Fullname validation
    if (!fullname.trim()) {
      validationErrors.fullname = 'Nama lengkap wajib diisi';
    } else if (fullname.trim().length > 50) {
      validationErrors.fullname = 'Nama lengkap maksimal 50 karakter';
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      validationErrors.email = 'Email wajib diisi';
    } else if (!emailRegex.test(email.trim())) {
      validationErrors.email = 'Format email tidak valid';
    }

    // 3. Phone Number validation (strict VARCHAR(15) database schema constraint)
    if (!phoneNumber.trim()) {
      validationErrors.phone_number = 'Nomor telepon wajib diisi';
    } else if (phoneNumber.trim().length > 15) {
      validationErrors.phone_number = 'Nomor telepon maksimal 15 karakter (Batasan database)';
    }

    // 4. Gender validation
    if (gender === null || gender === '') {
      validationErrors.gender = 'Gender wajib dipilih';
    }

    // 5. Role validation
    if (!roleId) {
      validationErrors.role_id = 'Hak akses wajib dipilih';
    }

    // 6. Password validation (mandatory only on create)
    if (formMode === 'add' && !password) {
      validationErrors.password = 'Password wajib diisi untuk user baru';
    } else if (password && password.length < 6) {
      validationErrors.password = 'Password minimal terdiri dari 6 karakter';
    }

    // Stop execution if errors found
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      if (formMode === 'add') {
        // Create user in Supabase Auth and Profile table via Server Action
        const result = await createUserAction({
          email: email.trim().toLowerCase(),
          password_raw: password,
          fullname: fullname.trim(),
          phone_number: phoneNumber.trim(),
          gender: Number(gender),
          role_id: roleId!,
        });

        if (!result.success) {
          throw new Error(result.error || 'Gagal menambahkan user baru');
        }
      } else {
        // 1. If password was filled, trigger resetting Server Action first to sync both auth and profile DBs
        if (password) {
          const resetRes = await resetUserPasswordAction({
            userId: editingUserId!,
            newPassword_raw: password,
          });
          if (!resetRes.success) {
            throw new Error(resetRes.error || 'Gagal mengubah password pengguna');
          }
        }

        // 2. Update existing user details in Supabase
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            role_id: roleId,
            email: email.trim().toLowerCase(),
            fullname: fullname.trim(),
            phone_number: phoneNumber.trim(),
            gender: Number(gender), // Convert strictly to integer
          })
          .eq('id', editingUserId);

        if (updateErr) throw updateErr;
      }

      setFormOpened(false);
      await fetchAllData(); // Refresh list to get accurate live data
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Gagal menyimpan data ke database Supabase');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Delete confirmation dialogue
  const handleOpenDelete = (id: string) => {
    setDeletingUserId(id);
    setDeleteOpened(true);
  };

  // Perform permanent database deletion
  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;
    
    setActionLoading(true);
    setError(null);

    try {
      const { error: deleteErr } = await supabase
        .from('users')
        .delete()
        .eq('id', deletingUserId);

      if (deleteErr) throw deleteErr;

      setDeleteOpened(false);
      setDeletingUserId(null);
      await fetchAllData(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Gagal menghapus data dari database Supabase');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Strict Typography Overrides - Absolutely No Times New Roman */
        .user-mgmt-header,
        .modal-title-custom {
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
          color: var(--ds-primary-700, #143c26) !important;
          font-weight: 700 !important;
        }
        
        .user-mgmt-sans-wrapper,
        .user-mgmt-sans-wrapper *,
        .modal-body-custom,
        .modal-body-custom *,
        .user-table-row,
        .user-table-header,
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

        .user-table-header {
          font-weight: 600;
          color: var(--ds-primary-700, #143c26);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.8px;
        }

        .user-table-row {
          font-size: 0.875rem;
          transition: background-color 0.15s ease;
        }

        .user-table-row:hover {
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

        .view-detail-card {
          background-color: #F9F8F4;
          border: 1px solid var(--ds-gray-200, rgba(0,0,0,0.06));
          border-radius: 8px;
        }
      `}</style>

      <Container size="xl" py="xl" className="user-mgmt-sans-wrapper">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} className="user-mgmt-header" size="h2">
                User Management
              </Title>
              <Text c="dimmed" size="sm" style={{ fontWeight: 500 }}>
                Manage credentialed Sima Arôme system personnel, access privileges, and security boundaries.
              </Text>
            </div>
            <Group gap="sm">
              <Button
                variant="light"
                color="var(--ds-primary, #1e5b3a)"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchAllData}
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
                Add User
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

          {/* Premium Enterprise Metric Cards Panel */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Total Personnel
                  </Text>
                  <Text size="xl" fw={700} c="dark" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.total} Users`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="var(--ds-primary, #1e5b3a)" variant="light">
                  <IconUsers size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Super Administrators
                  </Text>
                  <Text size="xl" fw={700} c="red" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.adminCount} Admins`}
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
                    Laki-Laki (Male)
                  </Text>
                  <Text size="xl" fw={700} c="blue" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.maleCount} Staff`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <IconGenderMale size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            <Paper p="lg" withBorder className="metric-card shadow-sm">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Perempuan (Female)
                  </Text>
                  <Text size="xl" fw={700} c="pink" mt={4}>
                    {loading ? <Loader size="xs" /> : `${stats.femaleCount} Staff`}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="pink" variant="light">
                  <IconGenderFemale size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Action and Search Panel */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" align="center">
              {/* Buildpad Input specifically chosen for search input block */}
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <Input
                  value={searchTerm}
                  onChange={(val) => setSearchTerm(typeof val === 'string' ? val : '')}
                  placeholder="Search by full name, email, or phone..."
                  iconLeft={<IconSearch size={16} />}
                  clear
                />
              </div>
              <Group gap="xs">
                <IconInfoCircle size={16} color="var(--ds-primary, #1e5b3a)" />
                <Text size="xs" c="dimmed" fw={500}>
                  Showing {filteredUsers.length} of {users.length} registered personnel
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
                  Loading live database records...
                </Text>
              </Stack>
            ) : filteredUsers.length === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <Text fw={600} c="dimmed">
                  No personnel found
                </Text>
                <Text size="xs" c="dimmed">
                  Try adjusting your search criteria or add a new user.
                </Text>
              </Stack>
            ) : (
              <Table verticalSpacing="md" horizontalSpacing="lg" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="user-table-header">Full Name</Table.Th>
                    <Table.Th className="user-table-header">Email Address</Table.Th>
                    <Table.Th className="user-table-header">Access Role</Table.Th>
                    <Table.Th className="user-table-header">Phone Number</Table.Th>
                    <Table.Th className="user-table-header">Gender</Table.Th>
                    <Table.Th className="user-table-header" style={{ textAlign: 'right' }}>
                      Actions
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredUsers.map((user) => {
                    const roleName = user.roles?.name || 'Unknown';
                    const roleDesc = user.roles?.description || '';
                    return (
                      <Table.Tr key={user.id} className="user-table-row">
                        <Table.Td>
                          <Text fw={700} c="dark">
                            {user.fullname}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed" size="xs">
                            {user.email}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={roleDesc} position="top" withArrow>
                            <Badge
                              color={getRoleBadgeColor(roleName)}
                              variant="light"
                              radius="sm"
                              fw={600}
                            >
                              {roleName}
                            </Badge>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500}>
                            {user.phone_number}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {Number(user.gender) === 1 ? (
                            <Badge variant="outline" color="blue" radius="xl" size="xs" leftSection={<IconGenderMale size={10} />}>
                              Laki-laki
                            </Badge>
                          ) : (
                            <Badge variant="outline" color="pink" radius="xl" size="xs" leftSection={<IconGenderFemale size={10} />}>
                              Perempuan
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <Tooltip label="View Details" withArrow position="top">
                              <ActionIcon
                                variant="light"
                                color="green"
                                onClick={() => handleOpenView(user)}
                                size="sm"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Edit Details" withArrow position="top">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => handleOpenEdit(user)}
                                size="sm"
                                disabled={actionLoading}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete Personnel" withArrow position="top">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleOpenDelete(user.id)}
                                size="sm"
                                disabled={actionLoading}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
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

      {/* Unified Add & Edit Modal Form */}
      <Modal
        opened={formOpened}
        onClose={() => !actionLoading && setFormOpened(false)}
        title={
          <Text className="modal-title-custom" size="lg">
            {formMode === 'add' ? 'Add System Personnel' : 'Edit Personnel Credentials'}
          </Text>
        }
        size="md"
        radius="lg"
        centered
      >
        <Stack gap="md" mt="xs" className="modal-body-custom">
          {/* Full Name Input */}
          <Input
            value={fullname}
            onChange={(val) => setFullname(typeof val === 'string' ? val : '')}
            label="Full Name"
            placeholder="e.g. Bara Ardiwinata"
            required
            error={errors.fullname}
            maxLength={50}
            description="Personnel first and last name (Max 50 characters)"
            disabled={actionLoading}
          />

          {/* Email Address Input */}
          <Input
            value={email}
            onChange={(val) => setEmail(typeof val === 'string' ? val : '')}
            label="Email Address"
            placeholder="username@sima-arome.com"
            required
            error={errors.email}
            description="Unique professional email identifier"
            disabled={actionLoading}
          />

          {/* Phone Number Input (strictly adhering to DB constraints) */}
          <Input
            value={phoneNumber}
            onChange={(val) => setPhoneNumber(typeof val === 'string' ? val : '')}
            label="Phone Number"
            placeholder="e.g. 081234567890"
            required
            error={errors.phone_number}
            maxLength={15}
            description="Maximum 15 digits/characters allowed by database schema"
            disabled={actionLoading}
          />

          {/* Gender selection utilizing Buildpad SelectDropdown (passing safe GENDER_CHOICES with string mapping) */}
          <SelectDropdown
            value={gender}
            onChange={(val) => setGender(typeof val === 'string' ? val : null)}
            choices={GENDER_CHOICES}
            label="Gender"
            placeholder="Select gender"
            required
            error={errors.gender}
            disabled={actionLoading}
          />

          {/* Access Role selection utilizing Buildpad SelectDropdown */}
          <SelectDropdown
            value={roleId}
            onChange={(val) => setRoleId(typeof val === 'string' ? val : null)}
            choices={roleChoices}
            label="Access Privilege Role"
            placeholder="Select system role"
            required
            error={errors.role_id}
            disabled={actionLoading}
          />

          {/* Security Password input (mandatory for add, optional for edit to allow resetting) */}
          <Input
            value={password}
            onChange={(val) => setPassword(typeof val === 'string' ? val : '')}
            label={formMode === 'add' ? "System Access Password" : "Reset System Access Password (Optional)"}
            placeholder={formMode === 'add' ? "Enter temporary password" : "Enter new password to reset, or leave blank to keep current"}
            required={formMode === 'add'}
            masked={true} // Triggers PasswordInput
            error={errors.password}
            description={formMode === 'add' 
              ? "Temporary secure sign-in password (Min 6 characters)" 
              : "Leave blank to keep existing password, or enter a new one to reset it in auth and profile databases (Min 6 characters)"}
            disabled={actionLoading}
          />

          <Group justify="flex-end" mt="lg">
            <Button variant="subtle" color="gray" onClick={() => setFormOpened(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="primary-action-btn"
              onClick={handleFormSubmit}
              loading={actionLoading}
            >
              {formMode === 'add' ? 'Register Personnel' : 'Save Changes'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Detail Modal - Pure Display, 100% Montserrat & Inter Fonts */}
      <Modal
        opened={viewOpened}
        onClose={() => setViewOpened(false)}
        title={
          <Text className="modal-title-custom" size="lg">
            Personnel Profile Detail
          </Text>
        }
        size="md"
        radius="lg"
        centered
      >
        {viewedUser && (
          <Stack gap="md" mt="xs" className="modal-body-custom">
            {/* Header Avatar and Basic Info */}
            <Group gap="md">
              <ThemeIcon size={54} radius="xl" color={getRoleBadgeColor(viewedUser.roles?.name)} variant="light">
                <IconUserCheck size={28} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="lg" c="dark" style={{ lineHeight: 1.2 }}>
                  {viewedUser.fullname}
                </Text>
                <Text size="xs" c="dimmed">
                  ID: {viewedUser.id}
                </Text>
              </div>
            </Group>

            <Divider my="xs" />

            {/* Read-Only Details Grid */}
            <SimpleGrid cols={1} spacing="sm">
              <Paper p="sm" className="view-detail-card">
                <Stack gap="xs">
                  {/* Email Row */}
                  <Group gap="xs" wrap="nowrap">
                    <IconMail size={16} color="var(--ds-primary, #1e5b3a)" />
                    <div>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">Email Address</Text>
                      <Text size="sm" fw={600}>{viewedUser.email}</Text>
                    </div>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" className="view-detail-card">
                <Stack gap="xs">
                  {/* Phone Row */}
                  <Group gap="xs" wrap="nowrap">
                    <IconPhone size={16} color="var(--ds-primary, #1e5b3a)" />
                    <div>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">Phone Number</Text>
                      <Text size="sm" fw={600}>{viewedUser.phone_number}</Text>
                    </div>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" className="view-detail-card">
                <Stack gap="xs">
                  {/* Privilege Role Row */}
                  <Group gap="xs" wrap="nowrap">
                    <IconLock size={16} color="var(--ds-primary, #1e5b3a)" />
                    <div>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">Access Privilege Role</Text>
                      <Group gap="xs" mt={2}>
                        <Badge color={getRoleBadgeColor(viewedUser.roles?.name)} variant="filled" radius="sm">
                          {viewedUser.roles?.name || 'Unknown'}
                        </Badge>
                      </Group>
                      {viewedUser.roles?.description && (
                        <Text size="xs" c="dimmed" mt={4}>
                          {viewedUser.roles.description}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" className="view-detail-card">
                <Stack gap="xs">
                  {/* Gender Row */}
                  <Group gap="xs" wrap="nowrap">
                    {Number(viewedUser.gender) === 1 ? (
                      <IconGenderMale size={16} color="blue" />
                    ) : (
                      <IconGenderFemale size={16} color="pink" />
                    )}
                    <div>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">Gender</Text>
                      <Text size="sm" fw={600}>
                        {Number(viewedUser.gender) === 1 ? 'Laki-laki (Male)' : 'Perempuan (Female)'}
                      </Text>
                    </div>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" className="view-detail-card">
                <Stack gap="xs">
                  {/* Created At Row */}
                  <Group gap="xs" wrap="nowrap">
                    <IconCalendar size={16} color="var(--ds-primary, #1e5b3a)" />
                    <div>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">System Registration Date</Text>
                      <Text size="sm" fw={600}>
                        {new Date(viewedUser.created_at).toLocaleString('id-ID', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </Text>
                    </div>
                  </Group>
                </Stack>
              </Paper>
            </SimpleGrid>

            <Group justify="flex-end" mt="lg">
              <Button className="primary-action-btn" onClick={() => setViewOpened(false)}>
                Close Profile
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={() => !actionLoading && setDeleteOpened(false)}
        title={
          <Text fw={700} size="md" c="red">
            Confirm Personnel Deletion
          </Text>
        }
        size="sm"
        radius="md"
        centered
      >
        <Stack gap="md" mt="xs" className="modal-body-custom">
          <Text size="sm">
            Are you sure you want to permanently delete this system personnel? This action is irreversible and will immediately revoke all access privileges.
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

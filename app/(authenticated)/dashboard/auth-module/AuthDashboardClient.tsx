'use client';

import React from 'react';
import { 
  Container, 
  Paper, 
  SimpleGrid, 
  Stack, 
  Text, 
  Title, 
  Group, 
  ThemeIcon, 
  Table,
  Progress,
  Box
} from '@mantine/core';
import { 
  IconUsers, 
  IconShieldLock, 
  IconLock, 
  IconApps,
  IconClock
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

interface RoleDistribution {
  roleName: string;
  count: number;
  percentage: number;
}

interface RecentUser {
  fullname: string;
  email: string;
  roleName: string;
  joinDate: string;
}

interface AuthDashboardClientProps {
  stats: {
    totalPersonnel: number;
    totalRoles: number;
    totalSuperAdmins: number;
    totalModules: number;
  };
  distribution: RoleDistribution[];
  recentPersonnel: RecentUser[];
}

export default function AuthDashboardClient({
  stats,
  distribution,
  recentPersonnel,
}: AuthDashboardClientProps) {
  useSetModuleTitle('Dashboard');

  return (
    <>
      <style>{`
        /* Strict Typography Overrides */
        .auth-dash-title,
        .auth-dash-section-header {
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
          color: var(--ds-primary-700, #143c26) !important;
          font-weight: 700 !important;
        }

        .auth-dash-sans,
        .auth-dash-sans *,
        .auth-dash-metric-value,
        .auth-dash-table-row {
          font-family: var(--ds-font-sans, 'Inter', sans-serif) !important;
        }

        .auth-dash-metric-card {
          border: 1px solid var(--ds-gray-200, rgba(0,0,0,0.06));
          border-radius: 12px;
          background: #ffffff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-dash-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .auth-dash-table-header {
          font-weight: 600;
          color: var(--ds-primary-700, #143c26);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.8px;
        }

        .auth-dash-table-row:hover {
          background-color: var(--ds-primary-100, #ebf7f0) !important;
        }

        .auth-dash-distribution-box {
          border: 1px solid var(--ds-gray-200, rgba(0,0,0,0.06));
          border-radius: 12px;
          background: #ffffff;
        }
      `}</style>

      <Container size="xl" py="xl" className="auth-dash-sans">
        <Stack gap="xl">
          {/* Header */}
          <div>
            <Title order={1} className="auth-dash-title" size="h2" mb={4}>
              System Security Overview
            </Title>
            <Text c="dimmed" size="sm" style={{ fontWeight: 500 }}>
              Live monitoring of access profiles, system roles, privilege boundaries, and recently onboarded personnel.
            </Text>
          </div>

          {/* Metric Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {/* Total Personnel */}
            <Paper p="lg" withBorder className="auth-dash-metric-card shadow-sm">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Total Personnel
                  </Text>
                  <Text size="xl" fw={700} className="auth-dash-metric-value" c="dark" mt={4}>
                    {stats.totalPersonnel} Users
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="var(--ds-primary, #1e5b3a)" variant="light">
                  <IconUsers size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            {/* Total Access Roles */}
            <Paper p="lg" withBorder className="auth-dash-metric-card shadow-sm">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Total Access Roles
                  </Text>
                  <Text size="xl" fw={700} className="auth-dash-metric-value" c="dark" mt={4}>
                    {stats.totalRoles} Scopes
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <IconShieldLock size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            {/* Super Administrators */}
            <Paper p="lg" withBorder className="auth-dash-metric-card shadow-sm">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Super Administrators
                  </Text>
                  <Text size="xl" fw={700} className="auth-dash-metric-value" c="red" mt={4}>
                    {stats.totalSuperAdmins} Admins
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="red" variant="light">
                  <IconLock size={20} />
                </ThemeIcon>
              </Group>
            </Paper>

            {/* Modules Monitored */}
            <Paper p="lg" withBorder className="auth-dash-metric-card shadow-sm">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    Modules Monitored
                  </Text>
                  <Text size="xl" fw={700} className="auth-dash-metric-value" c="teal" mt={4}>
                    {stats.totalModules} Workspaces
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                  <IconApps size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Visual Role Distribution Section */}
          <Paper p="lg" withBorder className="auth-dash-distribution-box">
            <Stack gap="md">
              <Title order={3} className="auth-dash-section-header" size="h4">
                Role Distribution Overview
              </Title>
              <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                Visual allocation of system personnel across different functional access categories.
              </Text>
              
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mt="xs">
                {distribution.length === 0 ? (
                  <Text size="sm" c="dimmed">No roles mapped in database.</Text>
                ) : (
                  distribution.map((role) => (
                    <Box key={role.roleName}>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600} c="dark">
                          {role.roleName}
                        </Text>
                        <Text size="sm" fw={700} c="var(--ds-primary, #1e5b3a)">
                          {role.count} {role.count === 1 ? 'user' : 'users'} ({role.percentage}%)
                        </Text>
                      </Group>
                      <Progress 
                        value={role.percentage} 
                        color="var(--ds-primary, #1e5b3a)" 
                        size="md" 
                        radius="xl"
                        animated
                      />
                    </Box>
                  ))
                )}
              </SimpleGrid>
            </Stack>
          </Paper>

          {/* Recently Onboarded Personnel Table */}
          <Paper p="lg" withBorder style={{ borderRadius: '12px', background: '#ffffff', overflowX: 'auto' }}>
            <Stack gap="md">
              <Group gap="sm">
                <ThemeIcon variant="light" color="var(--ds-primary, #1e5b3a)" size="md">
                  <IconClock size={16} />
                </ThemeIcon>
                <Title order={3} className="auth-dash-section-header" size="h4">
                  Recently Onboarded Personnel
                </Title>
              </Group>

              {recentPersonnel.length === 0 ? (
                <Text size="sm" c="dimmed" py="md">
                  Belum ada personil yang terdaftar di sistem.
                </Text>
              ) : (
                <Table verticalSpacing="sm" horizontalSpacing="md" striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th className="auth-dash-table-header">Name</Table.Th>
                      <Table.Th className="auth-dash-table-header">Email</Table.Th>
                      <Table.Th className="auth-dash-table-header">Role</Table.Th>
                      <Table.Th className="auth-dash-table-header">Join Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentPersonnel.map((person, idx) => (
                      <Table.Tr key={idx} className="auth-dash-table-row">
                        <Table.Td style={{ fontWeight: 600, color: 'var(--ds-primary-700, #143c26)' }}>
                          {person.fullname}
                        </Table.Td>
                        <Table.Td>{person.email}</Table.Td>
                        <Table.Td>
                          <Text span size="xs" fw={700} style={{
                            padding: '3px 8px',
                            backgroundColor: person.roleName === 'Super Admin' ? '#ffebeb' : '#ebf7f0',
                            color: person.roleName === 'Super Admin' ? 'red' : 'var(--ds-primary, #1e5b3a)',
                            borderRadius: '9999px',
                            border: `1px solid ${person.roleName === 'Super Admin' ? '#ffc9c9' : '#c3ebd4'}`
                          }}>
                            {person.roleName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {person.joinDate}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}

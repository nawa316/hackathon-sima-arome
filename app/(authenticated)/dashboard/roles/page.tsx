'use client';

import { Container, Paper, Stack, Text, Title, Group, Button, Table, Badge } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

/**
 * Roles Management Page
 * Shows how the layout adapts different content
 */
export default function RolesPage() {
  useSetModuleTitle('Role Management');

  const roles = [
    {
      id: 1,
      name: 'Admin',
      description: 'Full system access',
      users: 5,
      permissions: 45,
      active: true,
    },
    {
      id: 2,
      name: 'Editor',
      description: 'Can create and edit content',
      users: 12,
      permissions: 18,
      active: true,
    },
    {
      id: 3,
      name: 'Viewer',
      description: 'Read-only access',
      users: 45,
      permissions: 3,
      active: true,
    },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Role Management</Title>
            <Text c="dimmed">Manage system roles and permissions</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} variant="filled">
            Create Role
          </Button>
        </Group>

        {/* Roles Table */}
        <Paper p="lg" radius="md" withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Role Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Users</Table.Th>
                <Table.Th>Permissions</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {roles.map((role) => (
                <Table.Tr key={role.id}>
                  <Table.Td>
                    <strong>{role.name}</strong>
                  </Table.Td>
                  <Table.Td>{role.description}</Table.Td>
                  <Table.Td>{role.users}</Table.Td>
                  <Table.Td>{role.permissions}</Table.Td>
                  <Table.Td>
                    <Badge color="green" variant="light">
                      Active
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconEdit size={14} />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={14} />}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  );
}

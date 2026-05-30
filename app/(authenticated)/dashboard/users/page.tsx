'use client';

import { Container, Paper, Stack, Text, Title, Group, Button, Table, Badge, Avatar } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconMail, IconPhone } from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

/**
 * Users Management Page
 * Shows another example of content using the same layout
 */
export default function UsersPage() {
  useSetModuleTitle('User Management');

  const users = [
    {
      id: 1,
      name: 'John Smyth',
      email: 'john@example.com',
      phone: '+1 234 567 8900',
      role: 'Admin',
      status: 'Active',
      avatar: 'https://avatars.githubusercontent.com/u/1234?v=4',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+1 345 678 9012',
      role: 'Editor',
      status: 'Active',
      avatar: 'https://avatars.githubusercontent.com/u/5678?v=4',
    },
    {
      id: 3,
      name: 'Mike Davis',
      email: 'mike@example.com',
      phone: '+1 456 789 0123',
      role: 'Viewer',
      status: 'Inactive',
      avatar: 'https://avatars.githubusercontent.com/u/9012?v=4',
    },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>User Management</Title>
            <Text c="dimmed">Manage system users and access permissions</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} variant="filled">
            Add User
          </Button>
        </Group>

        {/* Users Table */}
        <Paper p="lg" radius="md" withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar src={user.avatar} alt={user.name} size="sm" radius="full" />
                      <div>
                        <strong>{user.name}</strong>
                        <Text size="xs" c="dimmed">
                          {user.phone}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={user.role === 'Admin' ? 'red' : user.role === 'Editor' ? 'blue' : 'gray'}
                    >
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.status === 'Active' ? 'green' : 'gray'} variant="light">
                      {user.status}
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
                        Remove
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

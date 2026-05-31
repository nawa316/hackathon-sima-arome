'use client';

import { useState, useCallback } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Loader,
  Center,
  Paper,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Phase, CreatePhaseRequest, UpdatePhaseRequest } from '@/types/collections';
import { usePhases, useCreatePhase, useUpdatePhase, useDeletePhase } from './_hooks';

/**
 * Phase List Page
 * CRUD untuk master data phase produksi
 */
export default function PhasePage() {
  useSetModuleTitle('Productions Module');

  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Phase | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<Phase | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const { phases, loading, refetch } = usePhases(search);
  const { create, loading: creating } = useCreatePhase();
  const { update, loading: updating } = useUpdatePhase();
  const { remove, loading: deleting } = useDeletePhase();

  const handleCreate = useCallback(async (data: CreatePhaseRequest) => {
    try {
      await create(data);
      closeCreate();
      refetch();
      notifications.show({ title: 'Success', message: 'Phase created', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menyimpan',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan phase.',
        color: 'red',
      });
    }
  }, [create, closeCreate, refetch]);

  const handleEdit = useCallback(async (data: UpdatePhaseRequest) => {
    if (!editTarget) return;
    try {
      await update(editTarget.id, data);
      closeEdit();
      refetch();
      notifications.show({ title: 'Success', message: 'Phase updated', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menyimpan',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupdate phase.',
        color: 'red',
      });
    }
  }, [update, editTarget, closeEdit, refetch]);


  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      closeDelete();
      refetch();
      setDeleteTarget(null);
      notifications.show({ title: 'Deleted', message: 'Phase deleted', color: 'red' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menghapus',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus phase.',
        color: 'red',
      });
    }
  }, [remove, deleteTarget, closeDelete, refetch]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Phase</Title>
            <Text c="dimmed" size="sm">Manage master production phases (e.g. Compounding, Filtering, Packaging)</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Add Phase
          </Button>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search by phase name..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={400}
        />

        {/* Table */}
        <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
          {loading ? (
            <Center py="xl"><Loader /></Center>
          ) : phases.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed">No phases found.</Text>
                <Button variant="light" size="xs" onClick={openCreate}>Add first phase</Button>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}>#</Table.Th>
                  <Table.Th>Phase Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {phases.map((phase, idx) => (
                  <Table.Tr key={phase.id}>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{idx + 1}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>{phase.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={2}>{phase.description || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            color="yellow"
                            size="sm"
                            onClick={() => { setEditTarget(phase); openEdit(); }}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => { setDeleteTarget(phase); openDelete(); }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      <PhaseCreateModal
        opened={createOpened}
        onClose={closeCreate}
        onSubmit={handleCreate}
        loading={creating}
      />

      {/* Edit Modal */}
      <PhaseEditModal
        key={editTarget?.id ?? 'edit'}
        opened={editOpened}
        onClose={closeEdit}
        onSubmit={handleEdit}
        loading={updating}
        initialValues={editTarget ?? undefined}
      />

      {/* Delete Confirm */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Phase" centered size="sm">
        <Stack gap="md">
          <Text>Delete phase <strong>{deleteTarget?.name}</strong>? This may affect existing productions using this phase.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// ────────────────────────────────────────────────────────────
// Phase Form Modals
// ────────────────────────────────────────────────────────────

function PhaseCreateModal({
  opened, onClose, onSubmit, loading,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePhaseRequest) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({ name, description });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Phase" centered>
      <Stack gap="md">
        <TextInput
          label="Phase Name"
          placeholder="e.g. Compounding, Filtering, Packaging"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Describe what happens in this phase..."
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={4}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add Phase</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function PhaseEditModal({
  opened, onClose, onSubmit, loading, initialValues,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: UpdatePhaseRequest) => void;
  loading: boolean;
  initialValues?: Partial<Phase>;
}) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({ name, description });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Phase" centered>
      <Stack gap="md">
        <TextInput
          label="Phase Name"
          placeholder="e.g. Compounding, Filtering, Packaging"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Describe what happens in this phase..."
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={4}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

'use client';

import { useState, useCallback, use } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  NumberInput,
  Loader,
  Center,
  Paper,
  Tooltip,
  Tabs,
  Breadcrumbs,
  Anchor,
  Select,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconArrowLeft, IconPencil } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type {
  ProductionPhase,
  ProductionPhaseStatus,
  ProductionMaterial,
  CreateProductionPhaseRequest,
  CreateProductionMaterialRequest,
} from '@/types/collections';
import {
  useProduction,
  useProductionPhases,
  useCreateProductionPhase,
  useUpdateProductionPhase,
  useDeleteProductionPhase,
  useProductionMaterials,
  useCreateProductionMaterial,
  useDeleteProductionMaterial,
  useAllProducts,
  useAllPhases,
  useRawMaterials,
} from '../_hooks';

const PHASE_STATUS_COLORS: Record<ProductionPhaseStatus, string> = {
  PENDING: 'gray',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'teal',
};

/**
 * Production Detail Page
 * Menampilkan detail produksi + manajemen phase + materials
 */
export default function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  useSetModuleTitle('Productions Module');
  const { id } = use(params);
  const router = useRouter();

  const { production, loading: prodLoading } = useProduction(id);
  const { phases, loading: phasesLoading, refetch: refetchPhases } = useProductionPhases(id);
  const { materials, loading: materialsLoading, refetch: refetchMaterials } = useProductionMaterials(id);
  const { products } = useAllProducts();
  const { phases: masterPhases } = useAllPhases();
  const { rawMaterials } = useRawMaterials();

  const { create: createPhase, loading: creatingPhase } = useCreateProductionPhase();
  const { update: updatePhase, loading: updatingPhase } = useUpdateProductionPhase();
  const { remove: removePhase, loading: deletingPhase } = useDeleteProductionPhase();
  const { create: createMaterial, loading: creatingMaterial } = useCreateProductionMaterial();
  const { remove: removeMaterial, loading: deletingMaterial } = useDeleteProductionMaterial();

  const [phaseOpened, { open: openPhase, close: closePhase }] = useDisclosure(false);
  const [materialOpened, { open: openMaterial, close: closeMaterial }] = useDisclosure(false);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<ProductionPhase | null>(null);
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<ProductionMaterial | null>(null);
  const [editPhaseTarget, setEditPhaseTarget] = useState<ProductionPhase | null>(null);

  const handleAddPhase = useCallback(async (data: CreateProductionPhaseRequest) => {
    try {
      await createPhase({ ...data, production_id: id });
      closePhase();
      refetchPhases();
      notifications.show({ title: 'Success', message: 'Phase added to production', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menyimpan Phase',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan phase.',
        color: 'red',
      });
    }
  }, [createPhase, id, closePhase, refetchPhases]);

  const handleDeletePhase = useCallback(async () => {
    if (!deletePhaseTarget) return;
    try {
      await removePhase(deletePhaseTarget.id);
      setDeletePhaseTarget(null);
      refetchPhases();
      notifications.show({ title: 'Removed', message: 'Phase removed', color: 'red' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menghapus',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus phase.',
        color: 'red',
      });
    }
  }, [removePhase, deletePhaseTarget, refetchPhases]);

  const handleEditPhase = useCallback(async (data: { status: ProductionPhaseStatus; note: string }) => {
    if (!editPhaseTarget) return;
    try {
      await updatePhase(editPhaseTarget.id, data);
      setEditPhaseTarget(null);
      refetchPhases();
      notifications.show({ title: 'Success', message: 'Phase updated', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Update',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupdate phase.',
        color: 'red',
      });
    }
  }, [updatePhase, editPhaseTarget, refetchPhases]);

  const handleAddMaterial = useCallback(async (data: CreateProductionMaterialRequest) => {
    try {
      await createMaterial({ ...data, production_id: id });
      closeMaterial();
      refetchMaterials();
      notifications.show({ title: 'Success', message: 'Material added', color: 'teal' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menyimpan Material',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan material.',
        color: 'red',
      });
    }
  }, [createMaterial, id, closeMaterial, refetchMaterials]);

  const handleDeleteMaterial = useCallback(async () => {
    if (!deleteMaterialTarget) return;
    try {
      await removeMaterial(deleteMaterialTarget.id);
      setDeleteMaterialTarget(null);
      refetchMaterials();
      notifications.show({ title: 'Removed', message: 'Material removed', color: 'red' });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menghapus',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus material.',
        color: 'red',
      });
    }
  }, [removeMaterial, deleteMaterialTarget, refetchMaterials]);

  if (prodLoading) return <Center py="xl"><Loader /></Center>;
  if (!production) return (
    <Container size="xl" py="xl">
      <Text c="dimmed">Production not found.</Text>
      <Button mt="md" variant="light" onClick={() => router.push('/dashboard/production-module/production')}>
        Back
      </Button>
    </Container>
  );

  const getProductName = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? `${p.type} (${p.categories})` : pid;
  };
  const getPhaseName = (phaseId: string) => masterPhases.find((p) => p.id === phaseId)?.name ?? phaseId;
  const getRmName = (rmId: string) => rawMaterials.find((r) => r.id === rmId)?.material_name ?? rmId;

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'teal', CANCELLED: 'red',
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Breadcrumb */}
        <Breadcrumbs>
          <Anchor onClick={() => router.push('/dashboard/production-module/production')} size="sm">Production</Anchor>
          <Text size="sm" c="dimmed">{production.lot_number ?? production.id}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group gap="sm">
          <ActionIcon variant="light" onClick={() => router.push('/dashboard/production-module/production')}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div>
            <Group gap="sm">
              <Title order={2}>{production.lot_number ?? 'Production Batch'}</Title>
              <Badge color={STATUS_COLORS[production.status]} variant="light">
                {production.status.replace('_', ' ')}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">{getProductName(production.products_id)}</Text>
          </div>
        </Group>

        {/* Summary Cards */}
        <Group grow>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Scheduled</Text>
            <Text fw={600} mt={4}>{production.scheduled_date}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Start → End</Text>
            <Text fw={600} mt={4}>{production.start_date} → {production.end_date}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Planned / Actual Qty</Text>
            <Text fw={600} mt={4}>{production.planned_quantity} / {production.actual_quantity ?? '—'}</Text>
          </Paper>
        </Group>

        {/* Tabs */}
        <Tabs defaultValue="phases">
          <Tabs.List>
            <Tabs.Tab value="phases">Phases ({phases.length})</Tabs.Tab>
            <Tabs.Tab value="materials">Materials ({materials.length})</Tabs.Tab>
          </Tabs.List>

          {/* Phases Tab */}
          <Tabs.Panel value="phases" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Production Phases</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openPhase}>Add Phase</Button>
              </Group>
              <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                {phasesLoading ? <Center py="xl"><Loader /></Center> : phases.length === 0 ? (
                  <Center py="xl"><Text c="dimmed" size="sm">No phases added yet.</Text></Center>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Phase</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Notes</Table.Th>
                        <Table.Th style={{ width: 80 }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {phases.map((ph) => (
                        <Table.Tr key={ph.id}>
                          <Table.Td><Text fw={500}>{getPhaseName(ph.phase_id)}</Text></Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={PHASE_STATUS_COLORS[ph.status]} size="sm">
                              {ph.status.replace('_', ' ')}
                            </Badge>
                          </Table.Td>
                          <Table.Td><Text size="sm" c="dimmed">{ph.note || '—'}</Text></Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit note & status">
                                <ActionIcon variant="light" color="yellow" size="sm" onClick={() => setEditPhaseTarget(ph)}>
                                  <IconPencil size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Remove phase">
                                <ActionIcon variant="light" color="red" size="sm" onClick={() => setDeletePhaseTarget(ph)}>
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
          </Tabs.Panel>

          {/* Materials Tab */}
          <Tabs.Panel value="materials" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Raw Materials Used</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openMaterial}>Add Material</Button>
              </Group>
              <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                {materialsLoading ? <Center py="xl"><Loader /></Center> : materials.length === 0 ? (
                  <Center py="xl"><Text c="dimmed" size="sm">No materials recorded yet.</Text></Center>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Raw Material</Table.Th>
                        <Table.Th>Quantity Used (kg)</Table.Th>
                        <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {materials.map((mat) => (
                        <Table.Tr key={mat.id}>
                          <Table.Td><Text fw={500}>{getRmName(mat.raw_material_id)}</Text></Table.Td>
                          <Table.Td>{mat.quantity_used} kg</Table.Td>
                          <Table.Td>
                            <Tooltip label="Remove">
                              <ActionIcon variant="light" color="red" size="sm" onClick={() => setDeleteMaterialTarget(mat)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Add Phase Modal */}
      <AddPhaseModal
        opened={phaseOpened}
        onClose={closePhase}
        onSubmit={handleAddPhase}
        loading={creatingPhase}
        masterPhases={masterPhases}
        existingPhaseIds={phases.map((p) => p.phase_id)}
      />

      {/* Add Material Modal */}
      <AddMaterialModal
        opened={materialOpened}
        onClose={closeMaterial}
        onSubmit={handleAddMaterial}
        loading={creatingMaterial}
        rawMaterials={rawMaterials}
      />

      {/* Edit Phase Modal */}
      <EditPhaseModal
        key={editPhaseTarget?.id ?? 'edit-phase'}
        opened={!!editPhaseTarget}
        onClose={() => setEditPhaseTarget(null)}
        onSubmit={handleEditPhase}
        loading={updatingPhase}
        initialValues={editPhaseTarget ?? undefined}
        getPhaseName={getPhaseName}
      />

      {/* Delete Phase Confirm */}
      <Modal opened={!!deletePhaseTarget} onClose={() => setDeletePhaseTarget(null)} title="Remove Phase" centered size="sm">
        <Stack gap="md">
          <Text>Remove phase <strong>{getPhaseName(deletePhaseTarget?.phase_id ?? '')}</strong> from this production?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeletePhaseTarget(null)}>Cancel</Button>
            <Button color="red" loading={deletingPhase} onClick={handleDeletePhase}>Remove</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Material Confirm */}
      <Modal opened={!!deleteMaterialTarget} onClose={() => setDeleteMaterialTarget(null)} title="Remove Material" centered size="sm">
        <Stack gap="md">
          <Text>Remove <strong>{getRmName(deleteMaterialTarget?.raw_material_id ?? '')}</strong> from this production?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteMaterialTarget(null)}>Cancel</Button>
            <Button color="red" loading={deletingMaterial} onClick={handleDeleteMaterial}>Remove</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// ────────────────────────────────────────────────────────────
// Add Phase Modal
// ────────────────────────────────────────────────────────────

function AddPhaseModal({
  opened, onClose, onSubmit, loading, masterPhases, existingPhaseIds,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionPhaseRequest) => void;
  loading: boolean;
  masterPhases: { id: string; name: string }[];
  existingPhaseIds: string[];
}) {
  const [phaseId, setPhaseId] = useState('');
  const [status, setStatus] = useState<ProductionPhaseStatus>('PENDING');
  const [note, setNote] = useState('');

  const available = masterPhases.filter((p) => !existingPhaseIds.includes(p.id));

  const handleSubmit = () => {
    if (!phaseId) return;
    onSubmit({ production_id: '', phase_id: phaseId, status, note: note || '' });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Phase" centered>
      <Stack gap="md">
        <Select
          label="Phase"
          placeholder="Select phase"
          data={available.map((p) => ({ value: p.id, label: p.name }))}
          value={phaseId}
          onChange={(v) => setPhaseId(v ?? '')}
          searchable
          required
        />
        <Select
          label="Initial Status"
          data={['PENDING', 'IN_PROGRESS', 'COMPLETED']}
          value={status}
          onChange={(v) => setStatus((v as ProductionPhaseStatus) ?? 'PENDING')}
        />
        <Textarea
          label="Notes (optional)"
          placeholder="e.g. Compounding step completed"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          rows={3}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add Phase</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Add Material Modal
// ────────────────────────────────────────────────────────────

function AddMaterialModal({
  opened, onClose, onSubmit, loading, rawMaterials,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionMaterialRequest) => void;
  loading: boolean;
  rawMaterials: { id: string; material_name: string }[];
}) {
  const [rmId, setRmId] = useState('');
  const [qty, setQty] = useState<number | string>('');

  const handleSubmit = () => {
    if (!rmId || qty === '') return;
    onSubmit({ production_id: '', raw_material_id: rmId, quantity_used: Number(qty) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Material" centered>
      <Stack gap="md">
        <Select
          label="Raw Material"
          placeholder="Select material"
          data={rawMaterials.map((r) => ({ value: r.id, label: r.material_name }))}
          value={rmId}
          onChange={(v) => setRmId(v ?? '')}
          searchable
          required
        />
        <NumberInput
          label="Quantity Used (kg)"
          placeholder="e.g. 10"
          value={qty}
          onChange={setQty}
          min={0}
          decimalScale={3}
          required
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add Material</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Edit Phase Modal
// ────────────────────────────────────────────────────────────

function EditPhaseModal({
  opened, onClose, onSubmit, loading, initialValues, getPhaseName,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: { status: ProductionPhaseStatus; note: string }) => void;
  loading: boolean;
  initialValues?: Partial<ProductionPhase>;
  getPhaseName: (id: string) => string;
}) {
  const [status, setStatus] = useState<ProductionPhaseStatus>(initialValues?.status ?? 'PENDING');
  const [note, setNote] = useState(initialValues?.note ?? '');

  const handleSubmit = () => {
    onSubmit({ status, note: note || '' });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit Phase: ${getPhaseName(initialValues?.phase_id ?? '')}`}
      centered
    >
      <Stack gap="md">
        <Select
          label="Status"
          data={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
          value={status}
          onChange={(v) => setStatus((v as ProductionPhaseStatus) ?? 'PENDING')}
        />
        <Textarea
          label="Notes (optional)"
          placeholder="e.g. Compounding step completed"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          rows={3}
          autosize
          minRows={3}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

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
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Loader,
  Center,
  Paper,
  Tooltip,
  Select,
  SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash, IconEye } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Production, ProductionStatus, CreateProductionRequest, UpdateProductionRequest } from '@/types/collections';
import {
  useProductions,
  useCreateProduction,
  useUpdateProduction,
  useDeleteProduction,
  useAllProducts,
} from './_hooks';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<ProductionStatus, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'teal',
  CANCELLED: 'red',
};

/**
 * Production List Page
 * CRUD untuk data produksi
 */
export default function ProductionPage() {
  useSetModuleTitle('Productions Module');

  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editTarget, setEditTarget] = useState<Production | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<Production | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const { productions, loading, refetch } = useProductions(statusFilter);
  const { products } = useAllProducts();
  const { create, loading: creating } = useCreateProduction();
  const { update, loading: updating } = useUpdateProduction();
  const { remove, loading: deleting } = useDeleteProduction();

  const getProductName = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? `${p.type} (${p.categories})` : pid;
  };

  const handleCreate = useCallback(async (data: CreateProductionRequest) => {
    try {
      await create(data);
      closeCreate();
      refetch();
      notifications.show({ title: 'Success', message: 'Production created', color: 'teal' });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create production batch',
        color: 'red',
      });
    }
  }, [create, closeCreate, refetch]);

  const handleEdit = useCallback(async (data: UpdateProductionRequest) => {
    if (!editTarget) return;
    try {
      await update(editTarget.id, data);
      closeEdit();
      refetch();
      notifications.show({ title: 'Success', message: 'Production updated', color: 'teal' });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update production batch',
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
      notifications.show({ title: 'Deleted', message: 'Production deleted', color: 'red' });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete production batch',
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
            <Title order={2}>Production</Title>
            <Text c="dimmed" size="sm">Manage production batches and materials</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Create Production
          </Button>
        </Group>

        {/* Status Filter */}
        <SegmentedControl
          value={statusFilter}
          onChange={setStatusFilter}
          data={STATUS_OPTIONS}
          color="teal"
        />

        {/* Table */}
        <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
          {loading ? (
            <Center py="xl"><Loader /></Center>
          ) : productions.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed">No production batches found.</Text>
                <Button variant="light" size="xs" onClick={openCreate}>Create first batch</Button>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Lot Number</Table.Th>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Scheduled Date</Table.Th>
                  <Table.Th>Planned Qty</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ width: 120 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {productions.map((prod) => (
                  <Table.Tr key={prod.id}>
                    <Table.Td>
                      <Text fw={600} size="sm" ff="monospace">{prod.lot_number ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{getProductName(prod.products_id)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{prod.scheduled_date}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{prod.planned_quantity}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={STATUS_COLORS[prod.status]}
                        size="sm"
                      >
                        {prod.status.replace('_', ' ')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View detail">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => router.push(`/dashboard/production-module/production/${prod.id}`)}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            color="yellow"
                            size="sm"
                            onClick={() => { setEditTarget(prod); openEdit(); }}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => { setDeleteTarget(prod); openDelete(); }}
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

      {/* Modals */}
      <ProductionCreateModal
        opened={createOpened}
        onClose={closeCreate}
        onSubmit={handleCreate}
        loading={creating}
        products={products}
      />
      <ProductionEditModal
        key={editTarget?.id ?? 'edit'}
        opened={editOpened}
        onClose={closeEdit}
        onSubmit={handleEdit}
        loading={updating}
        products={products}
        initialValues={editTarget ?? undefined}
      />
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Production" centered size="sm">
        <Stack gap="md">
          <Text>
            Delete production batch <strong>{deleteTarget?.lot_number ?? deleteTarget?.id}</strong>? This cannot be undone.
          </Text>
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
// Production Form Shared Fields Component
// ────────────────────────────────────────────────────────────

function ProductionCreateModal({
  opened,
  onClose,
  onSubmit,
  loading,
  products,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionRequest) => void;
  loading: boolean;
  products: { id: string; type: string; categories: string }[];
}) {
  const [productsId, setProductsId] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [plannedQty, setPlannedQty] = useState<number | string>('');
  const [actualQty, setActualQty] = useState<number | string>('');
  const [lotNumber, setLotNumber] = useState('');
  const [status, setStatus] = useState<ProductionStatus>('SCHEDULED');

  const handleSubmit = () => {
    if (!productsId || !scheduledDate || !startDate || !endDate || plannedQty === '') return;
    onSubmit({
      products_id: productsId,
      scheduled_date: scheduledDate,
      start_date: startDate,
      end_date: endDate,
      planned_quantity: Number(plannedQty),
      actual_quantity: actualQty !== '' ? Number(actualQty) : undefined,
      status,
      lot_number: lotNumber || undefined,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Production" centered size="lg">
      <ProductionFormFields
        productsId={productsId} setProductsId={setProductsId}
        scheduledDate={scheduledDate} setScheduledDate={setScheduledDate}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        plannedQty={plannedQty} setPlannedQty={setPlannedQty}
        actualQty={actualQty} setActualQty={setActualQty}
        lotNumber={lotNumber} setLotNumber={setLotNumber}
        status={status} setStatus={setStatus}
        products={products}
        onClose={onClose}
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel="Create Production"
      />
    </Modal>
  );
}

function ProductionEditModal({
  opened,
  onClose,
  onSubmit,
  loading,
  products,
  initialValues,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateProductionRequest) => void;
  loading: boolean;
  products: { id: string; type: string; categories: string }[];
  initialValues?: Partial<Production>;
}) {
  const [productsId, setProductsId] = useState(initialValues?.products_id ?? '');
  const [scheduledDate, setScheduledDate] = useState<string | null>(initialValues?.scheduled_date ?? null);
  const [startDate, setStartDate] = useState<string | null>(initialValues?.start_date ?? null);
  const [endDate, setEndDate] = useState<string | null>(initialValues?.end_date ?? null);
  const [plannedQty, setPlannedQty] = useState<number | string>(initialValues?.planned_quantity ?? '');
  const [actualQty, setActualQty] = useState<number | string>(initialValues?.actual_quantity ?? '');
  const [lotNumber, setLotNumber] = useState(initialValues?.lot_number ?? '');
  const [status, setStatus] = useState<ProductionStatus>(initialValues?.status ?? 'SCHEDULED');

  const handleSubmit = () => {
    if (!productsId || !scheduledDate || !startDate || !endDate || plannedQty === '') return;
    onSubmit({
      products_id: productsId,
      scheduled_date: scheduledDate,
      start_date: startDate,
      end_date: endDate,
      planned_quantity: Number(plannedQty),
      actual_quantity: actualQty !== '' ? Number(actualQty) : undefined,
      status,
      lot_number: lotNumber || undefined,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Production" centered size="lg">
      <ProductionFormFields
        productsId={productsId} setProductsId={setProductsId}
        scheduledDate={scheduledDate} setScheduledDate={setScheduledDate}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        plannedQty={plannedQty} setPlannedQty={setPlannedQty}
        actualQty={actualQty} setActualQty={setActualQty}
        lotNumber={lotNumber} setLotNumber={setLotNumber}
        status={status} setStatus={setStatus}
        products={products}
        onClose={onClose}
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel="Save Changes"
      />
    </Modal>
  );
}

// Shared form fields
function ProductionFormFields({
  productsId, setProductsId,
  scheduledDate, setScheduledDate,
  startDate, setStartDate,
  endDate, setEndDate,
  plannedQty, setPlannedQty,
  actualQty, setActualQty,
  lotNumber, setLotNumber,
  status, setStatus,
  products, onClose, onSubmit, loading, submitLabel,
}: {
  productsId: string; setProductsId: (v: string) => void;
  scheduledDate: string | null; setScheduledDate: (v: string | null) => void;
  startDate: string | null; setStartDate: (v: string | null) => void;
  endDate: string | null; setEndDate: (v: string | null) => void;
  plannedQty: number | string; setPlannedQty: (v: number | string) => void;
  actualQty: number | string; setActualQty: (v: number | string) => void;
  lotNumber: string; setLotNumber: (v: string) => void;
  status: ProductionStatus; setStatus: (v: ProductionStatus) => void;
  products: { id: string; type: string; categories: string }[];
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <Stack gap="md">
      <Select
        label="Product"
        placeholder="Select product"
        data={products.map((p) => ({ value: p.id, label: `${p.type} (${p.categories})` }))}
        value={productsId}
        onChange={(val) => setProductsId(val ?? '')}
        searchable
        required
      />
      <TextInput
        label="Lot Number"
        placeholder="e.g. LOT-2026-001"
        value={lotNumber}
        onChange={(e) => setLotNumber(e.currentTarget.value)}
      />
      <Group grow>
        <TextInput
          label="Scheduled Date"
          placeholder="Pick date"
          type="date"
          value={scheduledDate ?? ''}
          onChange={(e) => setScheduledDate(e.currentTarget.value || null)}
          required
        />
        <Select
          label="Status"
          data={['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']}
          value={status}
          onChange={(val) => setStatus((val as ProductionStatus) ?? 'SCHEDULED')}
        />
      </Group>
      <Group grow>
        <TextInput label="Start Date" placeholder="Pick date" type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.currentTarget.value || null)} required />
        <TextInput label="End Date" placeholder="Pick date" type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.currentTarget.value || null)} required />
      </Group>
      <Group grow>
        <NumberInput label="Planned Quantity" placeholder="e.g. 100" value={plannedQty} onChange={setPlannedQty} min={0} required />
        <NumberInput label="Actual Quantity" placeholder="e.g. 98" value={actualQty} onChange={setActualQty} min={0} />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={onSubmit}>{submitLabel}</Button>
      </Group>
    </Stack>
  );
}


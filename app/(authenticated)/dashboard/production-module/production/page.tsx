'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Divider,
  Alert,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash, IconEye, IconAlertCircle, IconFlask, IconCheck, IconTimeline } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Production, ProductionStatus, CreateProductionRequest, UpdateProductionRequest } from '@/types/collections';
import {
  useProductions,
  useCreateProduction,
  useUpdateProduction,
  useDeleteProduction,
  useAllProducts,
  useProductRecipes,
  useRawMaterials,
  useBulkCreateProductionMaterial,
  useUpdateRawMaterialStock,
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
  const { rawMaterials } = useRawMaterials();
  const { create, loading: creating } = useCreateProduction();
  const { bulkCreate: bulkCreateMaterials, loading: bulkCreating } = useBulkCreateProductionMaterial();
  const { update, loading: updating } = useUpdateProduction();
  const { remove, loading: deleting } = useDeleteProduction();
  const { deductStock } = useUpdateRawMaterialStock();

  const getProductName = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? `${p.type} (${p.categories})` : pid;
  };

  const handleCreate = useCallback(
    async (data: CreateProductionRequest, scaledMaterials: { raw_material_id: string; quantity_used: number }[]) => {
      try {
        // 1) Create production batch
        const res = await create(data);
        const productionId: string = res?.data?.id;

        // 2) Auto-create production materials from recipe
        if (productionId && scaledMaterials.length > 0) {
          await bulkCreateMaterials(
            scaledMaterials.map((m) => ({ ...m, production_id: productionId }))
          );

          // 3) Deduct raw material stock in warehouse
          try {
            await deductStock(scaledMaterials);
            notifications.show({
              title: 'Stock Updated',
              message: `Raw material stock deducted for ${scaledMaterials.length} material(s).`,
              color: 'blue',
            });
          } catch (stockErr) {
            console.error('Failed to deduct raw material stock:', stockErr);
            notifications.show({
              title: 'Stock Deduction Warning',
              message: 'Production created but failed to update raw material stock. Please update manually.',
              color: 'orange',
            });
          }
        }

        closeCreate();
        notifications.show({
          title: 'Production Created',
          message: scaledMaterials.length > 0
            ? `Batch created with ${scaledMaterials.length} material(s) from recipe. Redirecting to detail...`
            : 'Batch created successfully. Redirecting to detail...',
          color: 'teal',
        });

        // 4) Redirect to detail page so user can add phases
        if (productionId) {
          router.push(`/dashboard/production-module/production/${productionId}`);
        } else {
          refetch();
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to create production batch';
        notifications.show({ title: 'Error', message: msg, color: 'red' });
      }
    },
    [create, bulkCreateMaterials, deductStock, closeCreate, refetch, router]
  );

  const handleEdit = useCallback(async (data: UpdateProductionRequest) => {
    if (!editTarget) return;
    try {
      await update(editTarget.id, data);
      closeEdit();
      refetch();
      notifications.show({ title: 'Success', message: 'Production updated', color: 'teal' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update production batch';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete production batch';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
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
                  <Table.Th style={{ width: 160 }}>Actions</Table.Th>
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
                        <Tooltip label="Track Phase">
                          <ActionIcon
                            variant="light"
                            color="teal"
                            size="sm"
                            onClick={() => router.push(`/dashboard/production-module/tracking-phase?productionId=${prod.id}`)}
                            disabled={prod.status === 'CANCELLED'}
                          >
                            <IconTimeline size={14} />
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
        loading={creating || bulkCreating}
        products={products}
        rawMaterials={rawMaterials}
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
// Production Create Modal — dengan Recipe Scale Preview
// ────────────────────────────────────────────────────────────

function ProductionCreateModal({
  opened,
  onClose,
  onSubmit,
  loading,
  products,
  rawMaterials,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionRequest, materials: { raw_material_id: string; quantity_used: number }[]) => void;
  loading: boolean;
  products: { id: string; type: string; categories: string }[];
  rawMaterials: { id: string; material_name: string }[];
}) {
  const [productsId, setProductsId] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [plannedQty, setPlannedQty] = useState<number | string>('');
  const [actualQty, setActualQty] = useState<number | string>('');
  const [lotNumber, setLotNumber] = useState('');
  const [status, setStatus] = useState<ProductionStatus>('SCHEDULED');

  const { recipes, loading: recipesLoading } = useProductRecipes(productsId);

  // Reset saat modal ditutup
  useEffect(() => {
    if (!opened) {
      setProductsId('');
      setScheduledDate(null);
      setStartDate(null);
      setEndDate(null);
      setPlannedQty('');
      setActualQty('');
      setLotNumber('');
      setStatus('SCHEDULED');
    }
  }, [opened]);

  // Hitung scale factor dan material yang di-scale
  const scale = plannedQty !== '' && Number(plannedQty) > 0 ? Number(plannedQty) : null;
  const scaledMaterials = scale !== null
    ? recipes.map((r) => ({
        raw_material_id: r.raw_material_id,
        quantity_used: parseFloat((r.quantity * scale).toFixed(4)),
        material_name: rawMaterials.find((m) => m.id === r.raw_material_id)?.material_name ?? r.raw_material_id,
        recipe_qty: r.quantity,
      }))
    : [];

  const getRmName = (id: string) =>
    rawMaterials.find((m) => m.id === id)?.material_name ?? id;

  const isValid = productsId && scheduledDate && startDate && endDate && plannedQty !== '';

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(
      {
        products_id: productsId,
        scheduled_date: scheduledDate!,
        start_date: startDate!,
        end_date: endDate!,
        planned_quantity: Number(plannedQty),
        actual_quantity: actualQty !== '' ? Number(actualQty) : undefined,
        status,
        lot_number: lotNumber || undefined,
      },
      scaledMaterials.map(({ raw_material_id, quantity_used }) => ({ raw_material_id, quantity_used }))
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Production Batch" centered size="lg">
      <Stack gap="md">
        {/* Pilih Produk */}
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
          <TextInput label="Start Date" type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.currentTarget.value || null)} required />
          <TextInput label="End Date" type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.currentTarget.value || null)} required />
        </Group>

        <Group grow>
          <NumberInput
            label="Planned Quantity (unit)"
            placeholder="e.g. 100"
            value={plannedQty}
            onChange={setPlannedQty}
            min={1}
            required
          />
          <NumberInput
            label="Actual Quantity (opsional)"
            placeholder="e.g. 98"
            value={actualQty}
            onChange={setActualQty}
            min={0}
          />
        </Group>

        {/* Preview Materials from Recipe */}
        {productsId && (
          <>
            <Divider label="Materials from Recipe" labelPosition="left" />

            {recipesLoading ? (
              <Center py="sm"><Loader size="sm" /></Center>
            ) : recipes.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" py="sm">
                This product has no recipe defined. Materials will not be added automatically.
                You can add them manually on the production detail page.
              </Alert>
            ) : scale === null ? (
              <Alert icon={<IconFlask size={16} />} color="blue" variant="light" py="sm">
                Enter <strong>Planned Quantity</strong> to preview the scaled material requirements from recipe.
              </Alert>
            ) : (
              <>
                <Alert icon={<IconCheck size={16} />} color="teal" variant="light" py="xs">
                  <Text size="sm">
                    Based on recipe × <strong>{scale} units</strong> — {scaledMaterials.length} material(s) will be automatically added and raw material stock will be deducted.
                  </Text>
                </Alert>
                <Box>
                  <Table withColumnBorders withTableBorder fz="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Raw Material</Table.Th>
                        <Table.Th style={{ width: 160 }}>Qty/unit (recipe)</Table.Th>
                        <Table.Th style={{ width: 160 }}>Total Dibutuhkan</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {scaledMaterials.map((m) => (
                        <Table.Tr key={m.raw_material_id}>
                          <Table.Td>
                            <Group gap="xs">
                              <ThemeIcon size="xs" color="teal" variant="light">
                                <IconFlask size={10} />
                              </ThemeIcon>
                              <Text fw={500}>{getRmName(m.raw_material_id)}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td c="dimmed">{m.recipe_qty} kg</Table.Td>
                          <Table.Td fw={600} c="teal">{m.quantity_used} kg</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              </>
            )}
          </>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit} disabled={!isValid}>
            Create Production
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Production Edit Modal (hanya update info umum, bukan materials)
// ────────────────────────────────────────────────────────────

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
          <TextInput label="Start Date" type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.currentTarget.value || null)} required />
          <TextInput label="End Date" type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.currentTarget.value || null)} required />
        </Group>
        <Group grow>
          <NumberInput label="Planned Quantity" placeholder="e.g. 100" value={plannedQty} onChange={setPlannedQty} min={0} required />
          <NumberInput label="Actual Quantity" placeholder="e.g. 98" value={actualQty} onChange={setActualQty} min={0} />
        </Group>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

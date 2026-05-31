'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Select,
  Badge,
  Paper,
  Loader,
  Center,
  Stepper,
  Button,
  Modal,
  Textarea,
  Divider,
  ThemeIcon,
  Box,
  NumberInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconClock,
  IconProgress,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { ProductionPhase, ProductionPhaseStatus } from '@/types/collections';
import { useProductions, useProductionPhases, useUpdateProductionPhase, useUpdateProduction, useAllPhases } from '../production/_hooks';

const PHASE_STATUS_CONFIG: Record<
  ProductionPhaseStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    color: 'gray',
    icon: <IconClock size={16} />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'yellow',
    icon: <IconProgress size={16} />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'teal',
    icon: <IconCheck size={16} />,
  },
};

const STATUS_ORDER: ProductionPhaseStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

/**
 * Tracking Phase Page
 * Dashboard untuk melihat & update perjalanan phase suatu produksi
 */
export default function TrackingPhasePage() {
  useSetModuleTitle('Productions Module');

  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [updateTarget, setUpdateTarget] = useState<ProductionPhase | null>(null);
  const [newStatus, setNewStatus] = useState<ProductionPhaseStatus | null>(null);
  const [note, setNote] = useState('');
  const [actualQuantity, setActualQuantity] = useState<number | string>('');
  const [updateOpened, { open: openUpdate, close: closeUpdate }] = useDisclosure(false);

  const { productions, loading: productionsLoading, refetch: refetchProductions } = useProductions();
  const { phases, loading: phasesLoading, refetch: refetchPhases } = useProductionPhases(selectedProductionId ?? '');
  const { phases: masterPhases } = useAllPhases();
  const { update, loading: updating } = useUpdateProductionPhase();
  const { update: updateProduction, loading: updatingProduction } = useUpdateProduction();
  const [cancelOpened, { open: openCancel, close: closeCancel }] = useDisclosure(false);

  const selectedProduction = productions.find((p) => p.id === selectedProductionId);

  const getPhaseName = (phaseId: string) =>
    masterPhases.find((p) => p.id === phaseId)?.name ?? phaseId;

  useEffect(() => {
    if (selectedProduction) {
      setActualQuantity(selectedProduction.actual_quantity ?? selectedProduction.planned_quantity);
    }
  }, [selectedProductionId, selectedProduction?.actual_quantity, selectedProduction?.planned_quantity]);

  const handleOpenUpdate = (phase: ProductionPhase, targetStatus: ProductionPhaseStatus) => {
    setUpdateTarget(phase);
    setNewStatus(targetStatus);
    setNote(phase.note ?? '');
    openUpdate();
  };

  const handleUpdateStatus = useCallback(async () => {
    if (!updateTarget || !newStatus || !selectedProductionId) return;

    // Update status phase
    await update(updateTarget.id, { status: newStatus, note: note || '' });
    closeUpdate();

    // Ambil kondisi terbaru phases setelah update (simulasi dengan patch lokal)
    const updatedPhases = phases.map((p) =>
      p.id === updateTarget.id ? { ...p, status: newStatus } : p
    );

    // Auto-sync status production
    const anyInProgress = updatedPhases.some((p) => p.status === 'IN_PROGRESS');
    const allCompleted = updatedPhases.length > 0 && updatedPhases.every((p) => p.status === 'COMPLETED');
    const currentStatus = selectedProduction?.status;

    if (allCompleted && currentStatus !== 'COMPLETED') {
      await updateProduction(selectedProductionId, { 
        status: 'COMPLETED',
      });
      refetchProductions();
      notifications.show({
        title: '🎉 Production Selesai',
        message: 'Semua fase selesai. Status production diubah ke COMPLETED.',
        color: 'teal',
      });
    } else if (anyInProgress && currentStatus === 'SCHEDULED') {
      await updateProduction(selectedProductionId, { status: 'IN_PROGRESS' });
      refetchProductions();
      notifications.show({
        title: 'Production Dimulai',
        message: 'Fase pertama dimulai. Status production diubah ke IN PROGRESS.',
        color: 'yellow',
      });
    } else {
      notifications.show({
        title: 'Phase Updated',
        message: `Phase "${getPhaseName(updateTarget.phase_id)}" → ${PHASE_STATUS_CONFIG[newStatus].label}`,
        color: PHASE_STATUS_CONFIG[newStatus].color,
      });
    }

    refetchPhases();
    setUpdateTarget(null);
  }, [update, updateTarget, newStatus, note, closeUpdate, refetchPhases, refetchProductions, phases, selectedProductionId, selectedProduction, updateProduction]);

  const handleSubmitActualQuantity = useCallback(async () => {
    if (!selectedProductionId) return;
    try {
      await updateProduction(selectedProductionId, { 
        actual_quantity: Number(actualQuantity) || undefined,
      });
      refetchProductions();
      notifications.show({
        title: 'Sukses',
        message: 'Kuantitas real berhasil disimpan.',
        color: 'teal',
      });
    } catch (err) {
      notifications.show({
        title: 'Gagal Menyimpan',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        color: 'red',
      });
    }
  }, [selectedProductionId, actualQuantity, updateProduction, refetchProductions]);

  const handleCancelProduction = useCallback(async () => {
    if (!selectedProductionId) return;
    try {
      await updateProduction(selectedProductionId, { status: 'CANCELLED' });
      refetchProductions();
      closeCancel();
      notifications.show({
        title: 'Production Dibatalkan',
        message: 'Status production diubah ke CANCELLED.',
        color: 'red',
      });
    } catch (err) {
      notifications.show({
        title: 'Gagal Membatalkan',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        color: 'red',
      });
    }
  }, [updateProduction, selectedProductionId, closeCancel, refetchProductions]);

  // Hitung stepper active step berdasarkan phases yang completed
  const completedCount = phases.filter((p) => p.status === 'COMPLETED').length;
  const inProgressIdx = phases.findIndex((p) => p.status === 'IN_PROGRESS');
  const activeStep = inProgressIdx !== -1 ? inProgressIdx : completedCount;

  const PRODUCTION_STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'teal', CANCELLED: 'red',
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Tracking Phase</Title>
            <Text c="dimmed" size="sm">
              Monitor and update the progress of each production phase
            </Text>
          </div>
          {selectedProductionId && (
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={refetchPhases}
                loading={phasesLoading}
              >
                Refresh
              </Button>
              {selectedProduction?.status !== 'CANCELLED' && selectedProduction?.status !== 'COMPLETED' && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconX size={16} />}
                  onClick={openCancel}
                >
                  Cancel Production
                </Button>
              )}
            </Group>
          )}
        </Group>

        {/* Production Selector */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={500} size="sm">Select Production Batch</Text>
            <Select
              placeholder="Choose a production batch to track..."
              data={productions.map((p) => ({
                value: p.id,
                label: `${p.lot_number ?? p.id.slice(0, 8)} — ${p.status.replace('_', ' ')} (${p.scheduled_date})`,
              }))}
              value={selectedProductionId}
              onChange={setSelectedProductionId}
              searchable
              clearable
              disabled={productionsLoading}
              size="md"
            />
          </Stack>
        </Paper>

        {/* Production Summary */}
        {selectedProduction && (
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-teal-light)">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={700} size="lg">{selectedProduction.lot_number ?? 'Batch'}</Text>
                <Text size="sm" c="dimmed">
                  Scheduled: {selectedProduction.scheduled_date} &nbsp;|&nbsp;
                  {selectedProduction.start_date} → {selectedProduction.end_date}
                </Text>
              </Stack>
              <Group gap="sm">
                <div>
                  <Text size="xs" c="dimmed" ta="right">Planned</Text>
                  <Text fw={700}>{selectedProduction.planned_quantity} units</Text>
                </div>
                <Divider orientation="vertical" />
                <div>
                  <Text size="xs" c="dimmed" ta="right">Actual</Text>
                  <Text fw={700}>{selectedProduction.actual_quantity ?? '—'} units</Text>
                </div>
                <Badge
                  color={PRODUCTION_STATUS_COLORS[selectedProduction.status]}
                  variant="filled"
                  size="lg"
                >
                  {selectedProduction.status.replace('_', ' ')}
                </Badge>
              </Group>
            </Group>
          </Paper>
        )}

        {/* Phase Timeline */}
        {selectedProductionId && (
          <Paper withBorder p="xl" radius="md">
            {phasesLoading ? (
              <Center py="xl"><Loader /></Center>
            ) : phases.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <Text c="dimmed">No phases found for this production batch.</Text>
                  <Text size="sm" c="dimmed">
                    Go to Production detail to add phases manually.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="xl">
                <Text fw={600} size="md">Phase Progress</Text>

                {/* Stepper Overview */}
                <Stepper
                  active={activeStep}
                  color="teal"
                  completedIcon={<IconCheck size={16} />}
                >
                  {phases.map((phase) => (
                    <Stepper.Step
                      key={phase.id}
                      label={getPhaseName(phase.phase_id)}
                      description={
                        <Badge
                          size="xs"
                          variant="light"
                          color={PHASE_STATUS_CONFIG[phase.status].color}
                        >
                          {PHASE_STATUS_CONFIG[phase.status].label}
                        </Badge>
                      }
                      color={PHASE_STATUS_CONFIG[phase.status].color}
                    />
                  ))}
                </Stepper>

                <Divider />

                {/* Detailed Phase Cards */}
                <Stack gap="md">
                  {phases.map((phase, idx) => {
                    const config = PHASE_STATUS_CONFIG[phase.status];
                    const canGoBack = STATUS_ORDER.indexOf(phase.status) > 0;
                    const canProgress = STATUS_ORDER.indexOf(phase.status) < STATUS_ORDER.length - 1;

                    return (
                      <Paper
                        key={phase.id}
                        withBorder
                        p="md"
                        radius="md"
                        style={{
                          borderLeftWidth: 4,
                          borderLeftColor: `var(--mantine-color-${config.color}-6)`,
                        }}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Group gap="md" align="flex-start">
                            <ThemeIcon
                              color={config.color}
                              variant="light"
                              size="lg"
                              radius="xl"
                            >
                              {config.icon}
                            </ThemeIcon>
                            <Stack gap={4}>
                              <Group gap="sm">
                                <Text fw={600}>
                                  Step {idx + 1}: {getPhaseName(phase.phase_id)}
                                </Text>
                                <Badge color={config.color} variant="light" size="sm">
                                  {config.label}
                                </Badge>
                              </Group>
                              {phase.note && (
                                <Text size="sm" c="dimmed">📝 {phase.note}</Text>
                              )}
                            </Stack>
                          </Group>

                          {/* Action Buttons */}
                          <Group gap="xs">
                            {canGoBack && (
                              <Button
                                size="xs"
                                variant="default"
                                onClick={() =>
                                  handleOpenUpdate(
                                    phase,
                                    STATUS_ORDER[STATUS_ORDER.indexOf(phase.status) - 1]
                                  )
                                }
                              >
                                ← Revert
                              </Button>
                            )}
                            {canProgress && (
                              <Button
                                size="xs"
                                color={
                                  STATUS_ORDER[STATUS_ORDER.indexOf(phase.status) + 1] === 'IN_PROGRESS'
                                    ? 'yellow'
                                    : 'teal'
                                }
                                onClick={() =>
                                  handleOpenUpdate(
                                    phase,
                                    STATUS_ORDER[STATUS_ORDER.indexOf(phase.status) + 1]
                                  )
                                }
                              >
                                {STATUS_ORDER.indexOf(phase.status) === 0
                                  ? 'Start →'
                                  : 'Complete ✓'}
                              </Button>
                            )}
                            {!canProgress && (
                              <Box>
                                <Badge color="teal" variant="filled" size="sm">
                                  ✓ Done
                                </Badge>
                              </Box>
                            )}
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              </Stack>
            )}
          </Paper>
        )}

        {/* Actual Quantity Panel */}
        {selectedProduction?.status === 'COMPLETED' && (
          <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-blue-light)">
            <Group justify="space-between" align="flex-end">
              <Box style={{ flex: 1 }}>
                <Title order={5} mb={4}>Final Production Quantity</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Submit or update the actual quantity produced in this batch.
                </Text>
                <NumberInput
                  label="Actual Quantity (units)"
                  placeholder="e.g. 100"
                  value={actualQuantity}
                  onChange={setActualQuantity}
                  min={0}
                  required
                  maw={300}
                />
              </Box>
              <Button 
                onClick={handleSubmitActualQuantity} 
                loading={updatingProduction}
                color="blue"
              >
                Submit Quantity
              </Button>
            </Group>
          </Paper>
        )}

        {/* Empty State */}
        {!selectedProductionId && !productionsLoading && (
          <Paper withBorder p="xl" radius="md">
            <Center>
              <Stack align="center" gap="sm">
                <ThemeIcon size={60} radius="xl" variant="light" color="teal">
                  <IconProgress size={30} />
                </ThemeIcon>
                <Title order={4} c="dimmed">Select a Production Batch</Title>
                <Text c="dimmed" size="sm" ta="center" maw={400}>
                  Choose a production batch from the dropdown above to view and update its phase progress.
                </Text>
              </Stack>
            </Center>
          </Paper>
        )}
      </Stack>

      {/* Update Status Modal */}
      <Modal
        opened={updateOpened}
        onClose={closeUpdate}
        title={`Update Phase: ${getPhaseName(updateTarget?.phase_id ?? '')}`}
        centered
      >
        <Stack gap="md">
          <Group gap="sm">
            <Text size="sm">New status:</Text>
            {newStatus && (
              <Badge color={PHASE_STATUS_CONFIG[newStatus].color} variant="filled">
                {PHASE_STATUS_CONFIG[newStatus].label}
              </Badge>
            )}
          </Group>
          <Textarea
            label="Notes (optional)"
            placeholder="Add a note about this phase update..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={3}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeUpdate}>Cancel</Button>
            <Button
              loading={updating || updatingProduction}
              color={newStatus ? PHASE_STATUS_CONFIG[newStatus].color : 'teal'}
              onClick={handleUpdateStatus}
            >
              Confirm Update
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Cancel Production Confirm */}
      <Modal opened={cancelOpened} onClose={closeCancel} title="Cancel Production" centered size="sm">
        <Stack gap="md">
          <Text>
            Batalkan production batch <strong>{selectedProduction?.lot_number ?? selectedProductionId}</strong>?{' '}
            Status akan diubah ke <Badge color="red" variant="light">CANCELLED</Badge> dan tidak dapat di-undo.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCancel}>Kembali</Button>
            <Button color="red" loading={updatingProduction} onClick={handleCancelProduction}>
              Ya, Batalkan
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

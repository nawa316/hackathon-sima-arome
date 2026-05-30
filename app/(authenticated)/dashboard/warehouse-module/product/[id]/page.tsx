'use client';

import React, { useEffect, useState, use } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Button,
  SimpleGrid,
  Table,
  Badge,
  Loader,
  Alert,
  Divider,
  Timeline,
  Textarea,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPackages,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconBuildingWarehouse,
  IconCalendar,
  IconUser,
  IconActivity,
  IconClipboardCheck,
  IconClock,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { RawMaterial, Warehouse, StockMovement, QualityControl } from '@/types/sima-arome';

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useSetModuleTitle('Stock Detail');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [qcRecord, setQcRecord] = useState<QualityControl | null>(null);
  const [error, setError] = useState<string | null>(null);

  // QC inspection form
  const [qcModalOpened, setQcModalOpened] = useState(false);
  const [qcDecision, setQcDecision] = useState<'PASSED' | 'FAILED' | null>(null);
  const [qcNotes, setQcNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStockDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stock item (raw material)
      const matRes = await fetch(`/api/items/raw_materials/${id}`);
      if (!matRes.ok) throw new Error('Stock item not found');
      const matData = await matRes.json();
      const matObj: RawMaterial = matData.data || matData;
      setMaterial(matObj);

      // Fetch warehouses for joins
      const whRes = await fetch('/api/items/warehouses');
      if (whRes.ok) {
        const whJson = await whRes.json();
        setWarehouses(Array.isArray(whJson.data) ? whJson.data : (Array.isArray(whJson) ? whJson : []));
      }

      // Fetch stock movement history
      const smRes = await fetch(`/api/items/stock_movements?raw_material_id=${id}`);
      if (smRes.ok) {
        const smJson = await smRes.json();
        setMovements(Array.isArray(smJson.data) ? smJson.data : (Array.isArray(smJson) ? smJson : []));
      }

      // Fetch quality control inspection if exists
      const qcRes = await fetch(`/api/items/quality_control?raw_material_id=${id}`);
      if (qcRes.ok) {
        const qcJson = await qcRes.json();
        const qcList = Array.isArray(qcJson.data) ? qcJson.data : (Array.isArray(qcJson) ? qcJson : []);
        if (qcList.length > 0) {
          setQcRecord(qcList[0]);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail persediaan stok dari database DaaS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockDetails();
  }, [id]);

  // Handle QC Inspection Decisions
  const handleQcSubmit = async () => {
    if (!material || !qcDecision) return;
    try {
      setSubmitting(true);

      const targetStatus = qcDecision === 'PASSED' ? 'QC_ACCEPTED' : 'QC_REJECTED';
      
      // 1. Update status on Raw Materials table
      const matUpdate = await fetch(`/api/items/raw_materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!matUpdate.ok) throw new Error('Failed to update material QC status');

      // 2. Insert record into Quality Control table
      const qcResponse = await fetch('/api/items/quality_control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_material_id: id,
          checked_by: material.received_by, // using the initial receiver as reviewer
          qc_status: qcDecision,
          qc_notes: qcNotes.trim() || `Material lulus pengujian QC standard.`,
          created_at: new Date().toISOString(),
        }),
      });

      if (!qcResponse.ok) throw new Error('Failed to save QC record');

      // 3. Log stock movement for the QC Adjustment
      const movementResponse = await fetch('/api/items/stock_movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_material_id: id,
          activity_type: 'STOCK_ADJUSTMENT',
          quantity: Number(material.weight_kg),
          description: `Kendali Mutu (QC) diselesaikan. Hasil: ${qcDecision === 'PASSED' ? 'LULUS (QC_ACCEPTED)' : 'DITOLAK (QC_REJECTED)'}. Catatan: ${qcNotes.trim()}`,
          created_at: new Date().toISOString(),
          created_by: material.received_by,
        }),
      });

      // 4. Create Audit Trail
      await fetch('/api/items/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Stock Status Updated',
          target_table: 'raw_materials',
          record_id: id,
          new_data: JSON.stringify({ status: targetStatus, qc: qcDecision }),
        }),
      });

      notifications.show({
        title: 'QC Selesai',
        message: `Inspeksi QC untuk Batch ${material.batch_code} telah terekam dengan sukses!`,
        color: qcDecision === 'PASSED' ? 'teal' : 'red',
      });

      setQcModalOpened(false);
      setQcNotes('');
      fetchStockDetails();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Gagal memperbarui status QC. Coba periksa koneksi data.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openQcModal = (decision: 'PASSED' | 'FAILED') => {
    setQcDecision(decision);
    setQcNotes(decision === 'PASSED' ? 'Material lolos pengujian organoleptik aroma dan densitas.' : 'Material memiliki cacat aroma / kontaminasi zat cair.');
    setQcModalOpened(true);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Menghubungkan ke DaaS detail stok...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !material) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="gray"
            onClick={() => router.push('/dashboard/warehouse-module/product')}
          >
            Kembali ke Persediaan
          </Button>
          <Alert icon={<IconAlertTriangle size={16} />} title="Perhatian" color="red">
            {error || 'Data persediaan stok tidak dapat ditemukan.'}
          </Alert>
        </Stack>
      </Container>
    );
  }

  // Joins
  const warehouseObj = warehouses.find(w => w.id === material.warehouse_id);
  const warehouseName = warehouseObj ? warehouseObj.name : 'Unknown Warehouse';

  const qty = Number(material.weight_kg || 0);

  // Category mapping
  const lowerName = material.material_name.toLowerCase();
  const category = (lowerName.includes('oil') || lowerName.includes('atsiri') || lowerName.includes('lavender')) 
    ? 'Essential Oil' 
    : (lowerName.includes('fix') ? 'Fixative' : 'Solvent');

  // Dates (Simulated as requested)
  const productionDate = new Date(new Date(material.received_at).getTime() - 1000 * 60 * 60 * 24 * 5).toLocaleDateString('id-ID', { dateStyle: 'medium' });
  const expiredDate = new Date(new Date(material.received_at).getTime() + 1000 * 60 * 60 * 24 * 365).toLocaleDateString('id-ID', { dateStyle: 'medium' });

  // Map stock status and timeline state
  let currentActiveTimeline = 0;
  let qcStatusLabel = 'Pending QC';
  let qcColor = 'orange';

  if (material.status === 'PENDING_QC') {
    currentActiveTimeline = 1;
    qcStatusLabel = 'Pending QC (Menunggu Inspeksi)';
    qcColor = 'orange';
  } else if (material.status === 'QC_ACCEPTED') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'Lolos QC (Accepted)';
    qcColor = 'teal';
  } else if (material.status === 'QC_REJECTED') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'Ditolak QC (Rejected)';
    qcColor = 'red';
  } else if (material.status === 'IN_PRODUCTION') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'Dalam Produksi';
    qcColor = 'blue';
  }

  // Unified movements
  const listMovements = movements.length > 0 
    ? movements 
    : [
        {
          id: 'mov-init',
          activity_type: 'STOCK_IN' as const,
          quantity: qty,
          description: `Penerimaan awal bahan baku Batch ${material.batch_code} di ${warehouseName}.`,
          created_at: material.received_at,
        }
      ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Back Navigation */}
        <Group>
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="violet"
            onClick={() => router.push('/dashboard/warehouse-module/product')}
          >
            Kembali ke Daftar Stok
          </Button>
        </Group>

        {/* Title Block */}
        <Group justify="space-between" align="center">
          <Group gap="md">
            <Paper p="xs" radius="md" bg="violet.0" c="violet.7">
              <IconPackages size={32} />
            </Paper>
            <div>
              <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', fontWeight: 700 }}>
                {material.material_name}
              </Title>
              <Text size="sm" c="dimmed">Batch Code: <strong>{material.batch_code}</strong></Text>
            </div>
          </Group>
          <Badge size="lg" color={qcColor} variant="filled">
            {qcStatusLabel}
          </Badge>
        </Group>

        {/* Business Rules Alerts */}
        {material.status === 'QC_REJECTED' && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Material Ditolak Kendali Mutu" color="red" variant="filled">
            Bahan baku ini dinyatakan <strong>REJECTED QC</strong>. Sesuai dengan aturan bisnis Sima Arôme, material ini <strong>tidak boleh digunakan</strong> dalam formulasi resep produksi parfum dan harus segera ditandai untuk pembuangan atau pengembalian vendor.
          </Alert>
        )}
        {material.status === 'PENDING_QC' && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Inspeksi Kendali Mutu Diperlukan" color="orange">
            Bahan baku ini sedang dalam status <strong>PENDING QC</strong>. Inspeksi fisik dan pengujian aroma laboratorium diperlukan sebelum material diizinkan masuk ke tangki produksi compounding.
          </Alert>
        )}
        {material.status === 'QC_ACCEPTED' && (
          <Alert icon={<IconCheck size={16} />} title="Material Siap Digunakan" color="teal">
            Bahan baku ini berstatus <strong>QC ACCEPTED</strong>. Material dalam kondisi prima dan diizinkan 100% untuk digunakan dalam resep compounding dan maceration produksi parfum.
          </Alert>
        )}

        {/* Info Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Item Specifications */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="sm">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Spesifikasi & Informasi Stok
              </Title>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Kategori Bahan:</Text>
                <Badge color="indigo" variant="light">{category}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Batch Number:</Text>
                <Text size="sm" fw={600}>{material.batch_code}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Lokasi Gudang:</Text>
                <Group gap="xs">
                  <IconBuildingWarehouse size={14} />
                  <Text size="sm" fw={600}>{warehouseName}</Text>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Kuantitas Tersimpan:</Text>
                <Text size="sm" fw={700} c={qty < 100 ? 'orange' : 'teal'}>
                  {qty.toLocaleString()} Kg
                </Text>
              </Group>
              
              <Divider my="xs" label="Jadwal & Kedaluwarsa" labelPosition="center" />
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconCalendar size={14} />
                  <Text size="xs">Tanggal Produksi:</Text>
                </Group>
                <Text size="xs" fw={600}>{productionDate}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconCalendar size={14} />
                  <Text size="xs">Tanggal Kedaluwarsa:</Text>
                </Group>
                <Text size="xs" fw={600} c="red">{expiredDate}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconUser size={14} />
                  <Text size="xs">Diterima Oleh:</Text>
                </Group>
                <Text size="xs" fw={600}>Staff Gudang Sima Arôme</Text>
              </Group>
            </Stack>
          </Paper>

          {/* QC Integration and Flow Tracker */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="stretch">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Alur Quality Control (QC)
              </Title>
              <Divider />
              
              <Timeline active={currentActiveTimeline} bulletSize={24} lineWidth={2}>
                <Timeline.Item bullet={<IconCheck size={12} />} title="Stok Diterima">
                  <Text size="xs" c="dimmed">Material tiba di dermaga gudang dan dicatat dalam sistem.</Text>
                  <Text size="xxs" mt={4}>{new Date(material.received_at).toLocaleDateString('id-ID', { dateStyle: 'short' })}</Text>
                </Timeline.Item>

                <Timeline.Item bullet={<IconClock size={12} />} title="Pending QC">
                  <Text size="xs" c="dimmed">Menunggu pemeriksaan fisik visual oleh tim Quality Control.</Text>
                </Timeline.Item>

                <Timeline.Item 
                  bullet={<IconClipboardCheck size={12} />} 
                  title="Inspeksi QC"
                  lineVariant={material.status === 'QC_REJECTED' ? 'dashed' : 'solid'}
                >
                  <Text size="xs" c="dimmed">Pemeriksaan densitas aromatis dan validasi kualitas.</Text>
                </Timeline.Item>

                <Timeline.Item 
                  bullet={material.status === 'QC_REJECTED' ? <IconX size={12} /> : <IconCheck size={12} />} 
                  title="Selesai QC"
                  color={material.status === 'QC_REJECTED' ? 'red' : 'teal'}
                >
                  {qcRecord ? (
                    <Stack gap="xxs" mt="xs" bg="gray.0" p="xs" style={{ borderRadius: 4 }}>
                      <Text size="xs" fw={700}>Catatan Pemeriksa:</Text>
                      <Text size="xs" fs="italic" c="dimmed">"{qcRecord.qc_notes}"</Text>
                      <Text size="xxs" c="dimmed" mt={4}>
                        Diperiksa pada: {new Date(qcRecord.created_at).toLocaleDateString('id-ID')}
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed">Material siap digunakan atau ditolak.</Text>
                  )}
                </Timeline.Item>
              </Timeline>

              {/* QC Interactive Action Buttons */}
              {material.status === 'PENDING_QC' && (
                <Stack mt="md" gap="xs">
                  <Divider label="Aksi Keputusan Inspeksi QC" labelPosition="center" />
                  <Group grow>
                    <Button
                      leftSection={<IconCheck size={16} />}
                      color="teal"
                      onClick={() => openQcModal('PASSED')}
                    >
                      Lolos QC (Approve)
                    </Button>
                    <Button
                      leftSection={<IconX size={16} />}
                      color="red"
                      variant="outline"
                      onClick={() => openQcModal('FAILED')}
                    >
                      Tolak QC (Reject)
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Stock Movement History Table */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconActivity size={20} color="violet" />
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Histori Pergerakan Stok (Stock Movements)
              </Title>
            </Group>
            <Text size="xs" c="dimmed">Catatan kronologis mutasi keluar-masuk barang, penyesuaian volume, dan audit stok fisik.</Text>

            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 150 }}>Tanggal & Waktu</Table.Th>
                  <Table.Th style={{ width: 180 }}>Tipe Aktivitas</Table.Th>
                  <Table.Th style={{ width: 140 }}>Kuantitas</Table.Th>
                  <Table.Th>Deskripsi Transaksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {listMovements.map((mov, idx) => {
                  let badgeColor = 'gray';
                  if (mov.activity_type === 'STOCK_IN') badgeColor = 'green';
                  else if (mov.activity_type === 'STOCK_OUT') badgeColor = 'red';
                  else if (mov.activity_type === 'STOCK_ADJUSTMENT') badgeColor = 'orange';

                  return (
                    <Table.Tr key={mov.id || idx}>
                      <Table.Td>
                        <Text size="xs">
                          {new Date(mov.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={badgeColor} variant="light">
                          {mov.activity_type === 'STOCK_IN' ? 'Stock In' : mov.activity_type === 'STOCK_OUT' ? 'Stock Out' : 'Adjustment'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700}>
                          {mov.activity_type === 'STOCK_OUT' ? '-' : '+'}{Number(mov.quantity).toLocaleString()} Kg
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{mov.description}</Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      </Stack>

      {/* QC ACTION DECISION MODAL */}
      <Modal
        opened={qcModalOpened}
        onClose={() => setQcModalOpened(false)}
        title={
          <Title order={3} size="h4" c={qcDecision === 'PASSED' ? 'teal' : 'red'}>
            {qcDecision === 'PASSED' ? 'Konfirmasi Lolos Uji QC' : 'Konfirmasi Tolak Uji QC'}
          </Title>
        }
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Anda akan menyelesaikan inspeksi kendali mutu untuk batch <strong>{material.batch_code}</strong> ({material.material_name}).
          </Text>

          <Textarea
            label="Catatan Inspeksi QC"
            placeholder="Tuliskan detail pemeriksaan hasil uji aroma, densitas, atau cacat visual..."
            required
            minRows={3}
            value={qcNotes}
            onChange={(e) => setQcNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" color="gray" onClick={() => setQcModalOpened(false)}>
              Batal
            </Button>
            <Button
              color={qcDecision === 'PASSED' ? 'teal' : 'red'}
              onClick={handleQcSubmit}
              loading={submitting}
            >
              Simpan Keputusan QC
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

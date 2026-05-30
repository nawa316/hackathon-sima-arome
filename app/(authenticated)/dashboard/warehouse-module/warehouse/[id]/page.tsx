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
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBuildingWarehouse,
  IconAlertTriangle,
  IconTemperature,
  IconPackages,
  IconEye,
  IconClock,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { Warehouse, RawMaterial, ProductStock, ColdStorageLog } from '@/types/sima-arome';

// Coordinates preset for Surabaya & around
const LOCATION_PRESETS = [
  { value: '112735', label: 'Surabaya Timur (Coastal Zone - 112735)' },
  { value: '112650', label: 'Surabaya Barat (Hill Zone - 112650)' },
  { value: '112799', label: 'Sidoarjo Industrial Estate (112799)' },
  { value: '112421', label: 'Gresik Chemical Park (112421)' },
];

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useSetModuleTitle('Warehouse Detail');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [tempLog, setTempLog] = useState<ColdStorageLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch warehouse metadata
      const whRes = await fetch(`/api/items/warehouses/${id}`);
      if (!whRes.ok) throw new Error('Warehouse not found');
      const whData = await whRes.json();
      const whObj: Warehouse = whData.data || whData;
      setWarehouse(whObj);

      // Fetch all stocks and filter by this warehouse
      const [rmRes, psRes] = await Promise.all([
        fetch('/api/items/raw_materials'),
        fetch('/api/items/product_stocks'),
      ]);

      if (rmRes.ok && psRes.ok) {
        const rmJson = await rmRes.json();
        const psJson = await psRes.json();

        const rmList: RawMaterial[] = Array.isArray(rmJson.data) ? rmJson.data : (Array.isArray(rmJson) ? rmJson : []);
        const psList: ProductStock[] = Array.isArray(psJson.data) ? psJson.data : (Array.isArray(psJson) ? psJson : []);

        setMaterials(rmList.filter((item) => item.warehouse_id === id));
        setProducts(psList.filter((item) => item.warehouse_id === id));
      }

      // Fetch temperature log if present
      if (whObj.log_id) {
        const logRes = await fetch(`/api/items/cold_storage_logs/${whObj.log_id}`);
        if (logRes.ok) {
          const logData = await logRes.json();
          setTempLog(logData.data || logData);
        }
      } else {
        // Fallback simulated temperature log
        setTempLog({
          id: 'sim-temp',
          zone_id: 'ZONE-A',
          temperature: 4.2,
          alert_triggered: false,
          recorded_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail gudang. Gudang tidak ditemukan atau database DaaS tidak terjangkau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouseDetails();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Menghubungkan ke DaaS detail gudang...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !warehouse) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="gray"
            onClick={() => router.push('/dashboard/warehouse-module/warehouse')}
          >
            Kembali ke Gudang
          </Button>
          <Alert icon={<IconAlertTriangle size={16} />} title="Perhatian" color="red">
            {error || 'Data gudang tidak dapat ditemukan.'}
          </Alert>
        </Stack>
      </Container>
    );
  }

  // Calculate local statistics
  const totalItems = materials.length + products.length;
  const totalRawWeight = materials.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
  const totalProductQty = products.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalQty = Math.round(totalRawWeight + totalProductQty);

  // Status checks
  const lowStockMaterials = materials.filter((item) => Number(item.weight_kg || 0) > 0 && Number(item.weight_kg || 0) < 100).length;
  const lowStockProducts = products.filter((item) => Number(item.amount || 0) > 0 && Number(item.amount || 0) < 50).length;
  const lowStockItems = lowStockMaterials + lowStockProducts;

  const outStockMaterials = materials.filter((item) => Number(item.weight_kg || 0) <= 0).length;
  const outStockProducts = products.filter((item) => Number(item.amount || 0) <= 0).length;
  const outStockItems = outStockMaterials + outStockProducts;

  const locationPreset = LOCATION_PRESETS.find((p) => p.value === String(warehouse.location));
  const locationText = locationPreset ? locationPreset.label : `Surabaya Regional (${warehouse.location})`;

  // Temperature status style
  const isHighTemp = tempLog && tempLog.temperature > 5;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Back Navigation */}
        <Group>
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="violet"
            onClick={() => router.push('/dashboard/warehouse-module/warehouse')}
          >
            Kembali ke Daftar Gudang
          </Button>
        </Group>

        {/* Title Block */}
        <Group justify="space-between" align="center">
          <Group gap="md">
            <Paper p="xs" radius="md" bg="violet.0" c="violet.7">
              <IconBuildingWarehouse size={32} />
            </Paper>
            <div>
              <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', fontWeight: 700 }}>
                {warehouse.name}
              </Title>
              <Text size="sm" c="dimmed">Kode Gudang: <strong>{warehouse.code}</strong></Text>
            </div>
          </Group>
          <Badge
            size="lg"
            color={warehouse.status === 'ACTIVE' ? 'teal' : 'red'}
            variant="filled"
          >
            {warehouse.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </Group>

        {/* Informational Cards & Grid */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Warehouse Master Specs */}
          <Paper p="xl" radius="md" withBorder style={{ flex: 1 }}>
            <Stack gap="xs">
              <Title order={4} size="h5" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Informasi Gudang
              </Title>
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Wilayah:</Text>
                <Text size="xs" fw={600}>{locationText}</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Kapasitas Maks:</Text>
                <Text size="xs" fw={600}>{warehouse.capacity.toLocaleString()} Kg</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Utilisasi Ruang:</Text>
                <Text size="xs" fw={700} c="violet">
                  {Math.round((totalQty / warehouse.capacity) * 100)}% ({totalQty.toLocaleString()} / {warehouse.capacity.toLocaleString()} Kg)
                </Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Tanggal Terdaftar:</Text>
                <Text size="xs">
                  {new Date(warehouse.created_at).toLocaleDateString('id-ID', {
                    dateStyle: 'long',
                  })}
                </Text>
              </Group>
            </Stack>
          </Paper>

          {/* IoT Telemetry Simulation */}
          <Paper 
            p="xl" 
            radius="md" 
            withBorder 
            style={{ 
              borderColor: isHighTemp ? 'var(--mantine-color-red-filled)' : undefined,
              animation: isHighTemp ? 'pulse-border 1.5s infinite' : undefined 
            }}
          >
            <Stack gap="xs" align="stretch">
              <Group justify="space-between">
                <Title order={4} size="h5" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                  Pemantauan IoT Cold Storage
                </Title>
                <IconTemperature size={20} color={isHighTemp ? 'red' : 'teal'} />
              </Group>
              <Divider my="xs" />
              
              {tempLog ? (
                <Stack gap="xs" align="center" py="xs">
                  <Text size="xxs" c="dimmed" tt="uppercase" lts={1}>Suhu Saat Ini</Text>
                  <Title order={1} style={{ fontSize: 36 }} c={isHighTemp ? 'red' : 'teal'}>
                    {tempLog.temperature}°C
                  </Title>
                  
                  {isHighTemp ? (
                    <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
                      Warning: Suhu Terlalu Tinggi!
                    </Badge>
                  ) : (
                    <Badge color="teal" variant="light">
                      Suhu Stabil (Aman)
                    </Badge>
                  )}

                  <Group gap="xs" mt="xs">
                    <IconClock size={12} color="dimmed" />
                    <Text size="xxs" c="dimmed">
                      Diperbarui: {new Date(tempLog.recorded_at).toLocaleTimeString('id-ID')}
                    </Text>
                  </Group>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" py="md" ta="center">IoT sensor tidak terhubung.</Text>
              )}
            </Stack>
          </Paper>

          {/* Inventory Statistics */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="xs">
              <Title order={4} size="h5" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Kondisi Stok Lokasi
              </Title>
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Total Item Kategori:</Text>
                <Badge color="violet" variant="outline">{totalItems} Item</Badge>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Total Kuantitas:</Text>
                <Text size="xs" fw={700}>{totalQty.toLocaleString()} Kg/Unit</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Stok Menipis (Low):</Text>
                <Text size="xs" fw={700} c="orange">{lowStockItems} Item</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Stok Kosong (Out):</Text>
                <Text size="xs" fw={700} c="red">{outStockItems} Item</Text>
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Warehouse Stock Sub-Table */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconPackages size={22} color="violet" />
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Rincian Persediaan Barang & Material
              </Title>
            </Group>
            <Text size="xs" c="dimmed">Berikut adalah daftar lengkap persediaan bahan baku (Raw Materials) dan stok parfum jadi yang tersimpan di dalam gudang ini.</Text>

            {totalItems === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <IconPackages size={36} color="dimmed" />
                <Text fw={600} size="sm">Gudang Kosong</Text>
                <Text size="xs" c="dimmed">Saat ini tidak ada bahan baku atau produk jadi yang disimpan di dalam gudang ini.</Text>
              </Stack>
            ) : (
              <Table.ScrollContainer minWidth={600}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 140 }}>Kode/Batch</Table.Th>
                      <Table.Th>Nama Item / Material</Table.Th>
                      <Table.Th style={{ width: 150 }}>Tipe Persediaan</Table.Th>
                      <Table.Th style={{ width: 150 }}>Kuantitas Stok</Table.Th>
                      <Table.Th style={{ width: 150 }}>Kondisi QC</Table.Th>
                      <Table.Th style={{ width: 100 }}>Aksi</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {/* Render Raw Materials */}
                    {materials.map((rm) => {
                      const qty = Number(rm.weight_kg || 0);
                      
                      // Map QC state
                      let qcBadgeColor = 'gray';
                      let qcLabel: string = rm.status;
                      if (rm.status === 'PENDING_QC') {
                        qcBadgeColor = 'orange';
                        qcLabel = 'Pending QC';
                      } else if (rm.status === 'QC_ACCEPTED') {
                        qcBadgeColor = 'teal';
                        qcLabel = 'QC Lulus';
                      } else if (rm.status === 'QC_REJECTED') {
                        qcBadgeColor = 'red';
                        qcLabel = 'QC Ditolak';
                      } else if (rm.status === 'IN_PRODUCTION') {
                        qcBadgeColor = 'blue';
                        qcLabel = 'Dalam Produksi';
                      }

                      return (
                        <Table.Tr key={rm.id}>
                          <Table.Td>
                            <Badge color="violet" variant="light" size="sm">
                              {rm.batch_code}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} size="sm">{rm.material_name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="indigo" variant="outline" size="xs">Bahan Baku</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c={qty < 100 ? (qty <= 0 ? 'red' : 'orange') : 'teal'}>
                              {qty.toLocaleString()} Kg
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={qcBadgeColor} variant="filled" size="xs">
                              {qcLabel}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="Lihat Detail Stok">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => router.push(`/dashboard/warehouse-module/product/${rm.id}`)}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}

                    {/* Render Product Stocks */}
                    {products.map((prod) => {
                      const qty = Number(prod.amount || 0);
                      return (
                        <Table.Tr key={prod.id}>
                          <Table.Td>
                            <Badge color="gray" variant="light" size="sm">
                              {prod.product_id.substring(0, 8).toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} size="sm">Jasmine Perfume Product (Stock)</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="teal" variant="outline" size="xs">Produk Jadi</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c={qty < 50 ? (qty <= 0 ? 'red' : 'orange') : 'teal'}>
                              {qty.toLocaleString()} Unit
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="teal" variant="filled" size="xs">Tersedia</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="Lihat Detail Stok">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => router.push(`/dashboard/warehouse-module/product/${prod.id}`)}
                                disabled
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

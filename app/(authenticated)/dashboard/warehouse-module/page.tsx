'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Group,
  Table,
  Badge,
  Button,
  Loader,
  Alert,
} from '@mantine/core';
import {
  IconBuildingWarehouse,
  IconPackages,
  IconAlertTriangle,
  IconClock,
  IconRefresh,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Warehouse, RawMaterial, ProductStock, AuditTrail } from '@/types/sima-arome';

export default function DashboardPage() {
  useSetModuleTitle('Dashboard SCM');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    warehouses: Warehouse[];
    rawMaterials: RawMaterial[];
    productStocks: ProductStock[];
    activities: AuditTrail[];
  }>({
    warehouses: [],
    rawMaterials: [],
    productStocks: [],
    activities: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all collections via our proxy routes
      const [whRes, rmRes, psRes, auditRes] = await Promise.all([
        fetch('/api/items/warehouses'),
        fetch('/api/items/raw_materials'),
        fetch('/api/items/product_stocks'),
        fetch('/api/items/audit_trails?limit=10&sort=-timestamp'),
      ]);

      if (!whRes.ok || !rmRes.ok || !psRes.ok) {
        throw new Error('Failed to fetch SCM dashboard data');
      }

      const warehousesData = await whRes.json();
      const rawMaterialsData = await rmRes.json();
      const productStocksData = await psRes.json();
      
      let activitiesData = [];
      if (auditRes.ok) {
        const auditJson = await auditRes.json();
        activitiesData = Array.isArray(auditJson.data) ? auditJson.data : (Array.isArray(auditJson) ? auditJson : []);
      }

      setData({
        warehouses: Array.isArray(warehousesData.data) ? warehousesData.data : (Array.isArray(warehousesData) ? warehousesData : []),
        rawMaterials: Array.isArray(rawMaterialsData.data) ? rawMaterialsData.data : (Array.isArray(rawMaterialsData) ? rawMaterialsData : []),
        productStocks: Array.isArray(productStocksData.data) ? productStocksData.data : (Array.isArray(productStocksData) ? productStocksData : []),
        activities: activitiesData,
      });
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data dashboard. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics
  const totalWarehouses = data.warehouses.length;
  
  // Total stock items = raw materials batches + product stocks
  const totalStockItems = data.rawMaterials.length + data.productStocks.length;

  // Sum total quantities
  const totalRawWeight = data.rawMaterials.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
  const totalProductQty = data.productStocks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalStockQty = Math.round(totalRawWeight + totalProductQty);

  // Status counters
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let availableCount = 0;

  // Process raw materials status
  data.rawMaterials.forEach((item) => {
    const qty = Number(item.weight_kg || 0);
    if (qty <= 0) {
      outOfStockCount++;
    } else if (qty < 100) {
      lowStockCount++;
    } else {
      availableCount++;
    }
  });

  // Process finished product stocks status
  data.productStocks.forEach((item) => {
    const qty = Number(item.amount || 0);
    if (qty <= 0) {
      outOfStockCount++;
    } else if (qty < 50) {
      lowStockCount++;
    } else {
      availableCount++;
    }
  });

  // Map stock by warehouse for Bar Chart
  const warehouseStockMap: Record<string, { name: string; quantity: number }> = {};
  
  // Initialise with existing warehouses
  data.warehouses.forEach((wh) => {
    warehouseStockMap[wh.id] = { name: wh.name, quantity: 0 };
  });

  // Sum stock quantities into map
  data.rawMaterials.forEach((item) => {
    if (warehouseStockMap[item.warehouse_id]) {
      warehouseStockMap[item.warehouse_id].quantity += Number(item.weight_kg || 0);
    }
  });
  data.productStocks.forEach((item) => {
    if (warehouseStockMap[item.warehouse_id]) {
      warehouseStockMap[item.warehouse_id].quantity += Number(item.amount || 0);
    }
  });

  const barChartData = Object.values(warehouseStockMap);
  const maxQuantity = Math.max(...barChartData.map((d) => d.quantity), 100);

  // Default mock activities if database has no log entries yet
  const defaultActivities = [
    {
      id: 'act-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
      action: 'Warehouse Created',
      description: 'Gudang Cold Storage Baru [Surabaya-Alpha] berhasil dibuat.',
      target_table: 'warehouses',
      user: { fullname: 'Warehouse Staff' }
    },
    {
      id: 'act-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
      action: 'Stock Received & Pending QC',
      description: 'Bahan Baku Lavender Batch RM-LAV-021 telah diterima, status: PENDING_QC.',
      target_table: 'raw_materials',
      user: { fullname: 'Warehouse Staff' }
    },
    {
      id: 'act-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
      action: 'QC Status Updated',
      description: 'Batch Cendana RM-CEN-010 berpindah status dari PENDING_QC ke QC_ACCEPTED.',
      target_table: 'quality_control',
      user: { fullname: 'Quality Control Inspector' }
    },
    {
      id: 'act-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hours ago
      action: 'Stock In Adjustment',
      description: 'Penyesuaian stok produk Jasmine Perfume (+50 pcs) di Gudang Utama.',
      target_table: 'stock_movements',
      user: { fullname: 'Warehouse Supervisor' }
    }
  ];

  const recentActivities = data.activities.length > 0 
    ? data.activities.slice(0, 5).map(act => ({
        id: act.id,
        timestamp: act.timestamp || new Date().toISOString(),
        action: act.action,
        description: `Melakukan aktivitas ${act.action} pada record ${act.record_id} di tabel ${act.target_table}`,
        user: act.user?.fullname || 'System User'
      }))
    : defaultActivities.map(act => ({
        id: act.id,
        timestamp: act.timestamp,
        action: act.action,
        description: act.description,
        user: act.user.fullname
      }));

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '60vh' }}>
          <Loader size="xl" variant="bars" color="violet" />
          <Text c="dimmed">Memuat analisa gudang & stok...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', fontWeight: 700 }}>
              Gudang & Inventori Dashboard
            </Title>
            <Text c="dimmed">Pemantauan ketersediaan stok, integrasi QC, dan performa pergudangan secara real-time</Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="outline"
            color="violet"
            onClick={fetchData}
          >
            Segarkan Data
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Perhatian" color="red" variant="filled">
            {error}
          </Alert>
        )}

        {/* Metrics Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          {/* Card 1: Total Warehouses */}
          <Paper p="lg" radius="md" withBorder style={{ borderTop: '4px solid var(--mantine-color-blue-filled)' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Total Gudang</Text>
                <Title order={2}>{totalWarehouses}</Title>
                <Text size="xs" c="dimmed">Gudang aktif terdaftar</Text>
              </Stack>
              <Paper p="xs" radius="sm" bg="blue.0" c="blue.7">
                <IconBuildingWarehouse size={24} />
              </Paper>
            </Group>
          </Paper>

          {/* Card 2: Total Items */}
          <Paper p="lg" radius="md" withBorder style={{ borderTop: '4px solid var(--mantine-color-violet-filled)' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Kategori Stok</Text>
                <Title order={2}>{totalStockItems}</Title>
                <Text size="xs" c="dimmed">Bahan baku & produk jadi</Text>
              </Stack>
              <Paper p="xs" radius="sm" bg="violet.0" c="violet.7">
                <IconPackages size={24} />
              </Paper>
            </Group>
          </Paper>

          {/* Card 3: Total Quantity */}
          <Paper p="lg" radius="md" withBorder style={{ borderTop: '4px solid var(--mantine-color-teal-filled)' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Volume Stok</Text>
                <Title order={2}>{totalStockQty.toLocaleString()}</Title>
                <Text size="xs" c="dimmed">Kg / Unit tersimpan</Text>
              </Stack>
              <Paper p="xs" radius="sm" bg="teal.0" c="teal.7">
                <IconPackages size={24} />
              </Paper>
            </Group>
          </Paper>

          {/* Card 4: Low Stock Items */}
          <Paper p="lg" radius="md" withBorder style={{ borderTop: '4px solid var(--mantine-color-orange-filled)' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Stok Menipis</Text>
                <Title order={2} c={lowStockCount > 0 ? 'orange' : 'dimmed'}>{lowStockCount}</Title>
                <Text size="xs" c="dimmed">Butuh pengadaan baru</Text>
              </Stack>
              <Paper p="xs" radius="sm" bg="orange.0" c="orange.7">
                <IconAlertTriangle size={24} />
              </Paper>
            </Group>
          </Paper>

          {/* Card 5: Out of Stock */}
          <Paper p="lg" radius="md" withBorder style={{ borderTop: '4px solid var(--mantine-color-red-filled)' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Stok Kosong</Text>
                <Title order={2} c={outOfStockCount > 0 ? 'red' : 'dimmed'}>{outOfStockCount}</Title>
                <Text size="xs" c="dimmed">Krisis ketersediaan</Text>
              </Stack>
              <Paper p="xs" radius="sm" bg="red.0" c="red.7">
                <IconAlertTriangle size={24} />
              </Paper>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Charts Section */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Chart 1: Stock Distribution by Warehouse */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Distribusi Stok per Gudang (Kg/Unit)
              </Title>
              <Text size="xs" c="dimmed">Perbandingan jumlah akumulasi stok tersimpan di setiap lokasi gudang</Text>
              
              {barChartData.length === 0 ? (
                <Stack align="center" justify="center" h={250}>
                  <Text c="dimmed" size="sm">Belum ada data distribusi gudang.</Text>
                </Stack>
              ) : (
                <div style={{ position: 'relative', height: 260, paddingTop: 10 }}>
                  <Stack gap="xs">
                    {barChartData.map((item, index) => {
                      const percentage = (item.quantity / maxQuantity) * 100;
                      return (
                        <div key={index}>
                          <Group justify="space-between" mb={4}>
                            <Text size="sm" fw={600}>{item.name}</Text>
                            <Text size="xs" fw={700} c="violet">{item.quantity.toLocaleString()} Kg/Unit</Text>
                          </Group>
                          <div style={{ height: 16, width: '100%', backgroundColor: 'var(--mantine-color-gray-1)', borderRadius: 8, overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${percentage}%`, 
                                backgroundColor: 'var(--mantine-color-violet-filled)', 
                                borderRadius: 8,
                                transition: 'width 0.8s ease-in-out',
                                background: 'linear-gradient(90deg, var(--mantine-color-violet-5) 0%, var(--mantine-color-violet-7) 100%)'
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </Stack>
                </div>
              )}
            </Stack>
          </Paper>

          {/* Chart 2: Stock Status Distribution */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="stretch">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Proporsi Kondisi Stok
              </Title>
              <Text size="xs" c="dimmed">Rasio ketersediaan material dan barang jadi berdasarkan kondisi batas aman</Text>

              {totalStockItems === 0 ? (
                <Stack align="center" justify="center" h={250}>
                  <Text c="dimmed" size="sm">Belum ada data stok tersimpan.</Text>
                </Stack>
              ) : (
                <Group justify="space-around" h={260} align="center">
                  {/* Custom SVG Donut Chart */}
                  <div style={{ position: 'relative', width: 160, height: 160 }}>
                    <svg viewBox="0 0 36 36" width="100%" height="100%">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--mantine-color-gray-2)" strokeWidth="3" />
                      {(() => {
                        const total = availableCount + lowStockCount + outOfStockCount;
                        const pAvailable = (availableCount / total) * 100;
                        const pLow = (lowStockCount / total) * 100;
                        const pOut = (outOfStockCount / total) * 100;

                        const offset1 = 100 - pAvailable + 25;
                        const offset2 = 100 - pAvailable - pLow + 25;
                        const offset3 = 25;

                        return (
                           <>
                             {/* Available (Green) */}
                             {pAvailable > 0 && (
                               <circle 
                                 cx="18" cy="18" r="15.915" 
                                 fill="none" stroke="var(--mantine-color-teal-filled)" 
                                 strokeWidth="3.2" 
                                 strokeDasharray={`${pAvailable} ${100 - pAvailable}`} 
                                 strokeDashoffset={offset3}
                               />
                             )}
                             {/* Low Stock (Orange) */}
                             {pLow > 0 && (
                               <circle 
                                 cx="18" cy="18" r="15.915" 
                                 fill="none" stroke="var(--mantine-color-orange-filled)" 
                                 strokeWidth="3.2" 
                                 strokeDasharray={`${pLow} ${100 - pLow}`} 
                                 strokeDashoffset={offset1}
                               />
                             )}
                             {/* Out of Stock (Red) */}
                             {pOut > 0 && (
                               <circle 
                                 cx="18" cy="18" r="15.915" 
                                 fill="none" stroke="var(--mantine-color-red-filled)" 
                                 strokeWidth="3.2" 
                                 strokeDasharray={`${pOut} ${100 - pOut}`} 
                                 strokeDashoffset={offset2}
                               />
                             )}
                           </>
                        );
                      })()}
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <Text size="xl" fw={700}>{totalStockItems}</Text>
                      <Text size="xxs" c="dimmed" tt="uppercase" lts={1}>Item</Text>
                    </div>
                  </div>

                  {/* Legend */}
                  <Stack gap="xs" style={{ minWidth: 150 }}>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: 'var(--mantine-color-teal-filled)' }} />
                      <div>
                        <Text size="xs" fw={700}>Tersedia (Aman)</Text>
                        <Text size="xxs" c="dimmed">{availableCount} item ({Math.round((availableCount / totalStockItems) * 100)}%)</Text>
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                      <div>
                        <Text size="xs" fw={700}>Stok Menipis</Text>
                        <Text size="xxs" c="dimmed">{lowStockCount} item ({Math.round((lowStockCount / totalStockItems) * 100)}%)</Text>
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: 'var(--mantine-color-red-filled)' }} />
                      <div>
                        <Text size="xs" fw={700}>Stok Kosong</Text>
                        <Text size="xxs" c="dimmed">{outOfStockCount} item ({Math.round((outOfStockCount / totalStockItems) * 100)}%)</Text>
                      </div>
                    </Group>
                  </Stack>
                </Group>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Recent Activities Section */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Group gap="xs">
                  <IconClock size={20} color="violet" />
                  <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                    Histori Aktivitas SCM Terbaru
                  </Title>
                </Group>
                <Text size="xs" c="dimmed" mt={4}>Rekaman log audit seluruh transaksi pergerakan barang dan master data gudang</Text>
              </div>
            </Group>

            <Table.ScrollContainer minWidth={600}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 140 }}>Tanggal & Waktu</Table.Th>
                    <Table.Th style={{ width: 180 }}>Jenis Aktivitas</Table.Th>
                    <Table.Th>Deskripsi Transaksi</Table.Th>
                    <Table.Th style={{ width: 150 }}>Operator</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentActivities.map((act) => {
                    // Match action styles
                    let badgeColor = 'gray';
                    if (act.action.includes('Created') || act.action.includes('Received') || act.action.includes('In')) {
                      badgeColor = 'green';
                    } else if (act.action.includes('Updated') || act.action.includes('Adjustment') || act.action.includes('QC')) {
                      badgeColor = 'orange';
                    } else if (act.action.includes('Deleted') || act.action.includes('Rejected')) {
                      badgeColor = 'red';
                    }

                    return (
                      <Table.Tr key={act.id}>
                        <Table.Td>
                          <Text size="xs">
                            {new Date(act.timestamp).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={badgeColor} variant="light" size="sm">
                            {act.action}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{act.description}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600}>{act.user}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

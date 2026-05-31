'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Table,
  Badge,
  TextInput,
  Select,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconPackages,
  IconAlertTriangle,
  IconBuildingWarehouse,
  IconFilter,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { RawMaterial, Warehouse } from '@/types/sima-arome';

// Categories preset based on fragrance manufacturing materials
const CATEGORY_PRESETS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Essential Oil', label: 'Essential Oil' },
  { value: 'Fixative', label: 'Fixative' },
  { value: 'Solvent', label: 'Solvent' },
  { value: 'Absolutes', label: 'Absolutes & Resins' },
];

export default function StockManagementPage() {
  useSetModuleTitle('Stock Management');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string | null>('ALL');
  const [statusFilter, setStatusFilter] = useState<string | null>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rmRes, whRes] = await Promise.all([
        fetch('/api/items/raw_materials'),
        fetch('/api/items/warehouses'),
      ]);

      if (!rmRes.ok || !whRes.ok) {
        throw new Error('Failed to load inventory data from the DaaS server.');
      }

      const rmJson = await rmRes.json();
      const whJson = await whRes.json();

      setMaterials(Array.isArray(rmJson.data) ? rmJson.data : (Array.isArray(rmJson) ? rmJson : []));
      setWarehouses(Array.isArray(whJson.data) ? whJson.data : (Array.isArray(whJson) ? whJson : []));
    } catch (err) {
      console.error(err);
      setError('Failed to synchronize stock data. Please check the DaaS backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map category dynamically based on material name (mock mapping for rich visualization)
  const getItemCategory = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('oil') || lowerName.includes('atsiri') || lowerName.includes('lavender') || lowerName.includes('cendana') || lowerName.includes('rose')) {
      return 'Essential Oil';
    }
    if (lowerName.includes('fix') || lowerName.includes('musk') || lowerName.includes('amber')) {
      return 'Fixative';
    }
    if (lowerName.includes('ethanol') || lowerName.includes('alcohol') || lowerName.includes('pelarut')) {
      return 'Solvent';
    }
    return 'Absolutes';
  };

  // Determine stock status and label dynamically
  const getStockStatus = (item: RawMaterial) => {
    const qty = Number(item.weight_kg || 0);

    // Prioritise Out of Stock first
    if (qty <= 0) {
      return { label: 'Out of Stock', color: 'red' };
    }

    // Next, check QC Rejection
    if (item.status === 'QC_REJECTED') {
      return { label: 'Rejected QC', color: 'red' };
    }

    // Check QC Pending
    if (item.status === 'PENDING_QC') {
      return { label: 'Pending QC', color: 'orange' };
    }

    // Check Low Stock
    if (qty < 100) {
      return { label: 'Low Stock', color: 'orange' };
    }

    // Otherwise standard Available / Accepted QC
    if (item.status === 'QC_ACCEPTED') {
      return { label: 'Available (QC Accepted)', color: 'teal' };
    }

    return { label: 'Available', color: 'teal' };
  };

  // Filter materials
  const filteredMaterials = materials.filter((item) => {
    const matchesSearch =
      item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWarehouse =
      warehouseFilter === 'ALL' || item.warehouse_id === warehouseFilter;

    const category = getItemCategory(item.material_name);
    const matchesCategory =
      categoryFilter === 'ALL' || category === categoryFilter;

    const statusObj = getStockStatus(item);
    const matchesStatus =
      !statusFilter ||
      statusFilter === 'ALL' ||
      statusObj.label.toLowerCase().includes(statusFilter.toLowerCase()) ||
      item.status === statusFilter;

    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  if (loading && materials.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Connecting to stock inventory DaaS...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', fontWeight: 700 }}>
              Warehouse Stock Management
            </Title>
            <Text c="dimmed">Monitor raw material stock availability, safety thresholds, and quality control integration</Text>
          </div>
        </Group>

        {error && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Multi-Filters Panel */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Group gap="xs" c="violet">
              <IconFilter size={18} />
              <Text size="sm" fw={700}>Inventory Search Filters</Text>
            </Group>
            
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <TextInput
                placeholder="Search material name or batch code..."
                leftSection={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
              />

              <Select
                placeholder="Warehouse Location"
                data={[
                  { value: 'ALL', label: 'All Warehouses' },
                  ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
                ]}
                value={warehouseFilter}
                onChange={setWarehouseFilter}
              />

              <Select
                placeholder="Material Category"
                data={CATEGORY_PRESETS}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />

              <Select
                placeholder="Availability Status"
                data={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'Available', label: 'Available' },
                  { value: 'Low Stock', label: 'Low Stock' },
                  { value: 'Out of Stock', label: 'Out of Stock' },
                  { value: 'PENDING_QC', label: 'Pending QC' },
                  { value: 'QC_ACCEPTED', label: 'QC Accepted' },
                  { value: 'QC_REJECTED', label: 'QC Rejected' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Stock List Table */}
        <Paper p="lg" radius="md" withBorder>
          {filteredMaterials.length === 0 ? (
            <Stack align="center" py="xl" gap="xs">
              <IconPackages size={48} color="dimmed" />
              <Text fw={600}>Stock Not Found</Text>
              <Text size="sm" c="dimmed">
                No stored materials match your search filter criteria.
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 150 }}>Batch Code</Table.Th>
                    <Table.Th>Raw Material Name</Table.Th>
                    <Table.Th style={{ width: 160 }}>Category</Table.Th>
                    <Table.Th>Warehouse Location</Table.Th>
                    <Table.Th style={{ width: 140 }}>Quantity</Table.Th>
                    <Table.Th style={{ width: 120 }}>Unit</Table.Th>
                    <Table.Th style={{ width: 180 }}>Availability Status</Table.Th>
                    <Table.Th style={{ width: 80 }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredMaterials.map((item) => {
                    const whObj = warehouses.find(w => w.id === item.warehouse_id);
                    const warehouseName = whObj ? whObj.name : 'Unknown Warehouse';
                    const category = getItemCategory(item.material_name);
                    const qty = Number(item.weight_kg || 0);
                    const status = getStockStatus(item);

                    return (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Badge color="violet" variant="light" size="sm">
                            {item.batch_code}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">{item.material_name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="indigo" variant="outline" size="xs">
                            {category}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconBuildingWarehouse size={14} color="dimmed" />
                            <Text size="sm">{warehouseName}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700} c={qty < 100 ? (qty <= 0 ? 'red' : 'orange') : 'teal'}>
                            {qty.toLocaleString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">Kg</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={status.color} variant="filled" size="xs">
                            {status.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label="View Stock Card & QC">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => router.push(`/dashboard/warehouse-module/product/${item.id}`)}
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
        </Paper>
      </Stack>
    </Container>
  );
}

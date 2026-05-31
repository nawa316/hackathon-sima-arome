'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Button,
  Table,
  Badge,
  TextInput,
  Select,
  NumberInput,
  Modal,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconBuildingWarehouse,
  IconEye,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { Warehouse, RawMaterial, ProductStock } from '@/types/sima-arome';

// Coordinates preset for Surabaya & around
const LOCATION_PRESETS = [
  { value: '112735', label: 'Surabaya Timur (Coastal Zone - 112735)' },
  { value: '112650', label: 'Surabaya Barat (Hill Zone - 112650)' },
  { value: '112799', label: 'Sidoarjo Industrial Estate (112799)' },
  { value: '112421', label: 'Gresik Chemical Park (112421)' },
];

export default function WarehousesPage() {
  useSetModuleTitle('Warehouse Management');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('ALL');

  // Modals States
  const [createOpened, setCreateOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms Setup
  const createForm = useForm({
    initialValues: {
      code: '',
      name: '',
      location: '112735',
      capacity: 5000,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    },
    validate: {
      code: (value) => (value.trim().length < 3 ? 'Code must be at least 3 characters' : null),
      name: (value) => (value.trim().length < 3 ? 'Name must be at least 3 characters' : null),
      capacity: (value) => (value <= 0 ? 'Capacity must be greater than 0' : null),
    },
  });

  const editForm = useForm({
    initialValues: {
      id: '',
      code: '',
      name: '',
      location: '112735',
      capacity: 5000,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    },
    validate: {
      code: (value) => (value.trim().length < 3 ? 'Code must be at least 3 characters' : null),
      name: (value) => (value.trim().length < 3 ? 'Name must be at least 3 characters' : null),
      capacity: (value) => (value <= 0 ? 'Capacity must be greater than 0' : null),
    },
  });

  // Fetch all SCM data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [whRes, rmRes, psRes] = await Promise.all([
        fetch('/api/items/warehouses'),
        fetch('/api/items/raw_materials'),
        fetch('/api/items/product_stocks'),
      ]);

      if (!whRes.ok || !rmRes.ok || !psRes.ok) {
        throw new Error('Failed to load data from DaaS database');
      }

      const whJson = await whRes.json();
      const rmJson = await rmRes.json();
      const psJson = await psRes.json();

      setWarehouses(Array.isArray(whJson.data) ? whJson.data : (Array.isArray(whJson) ? whJson : []));
      setRawMaterials(Array.isArray(rmJson.data) ? rmJson.data : (Array.isArray(rmJson) ? rmJson : []));
      setProductStocks(Array.isArray(psJson.data) ? psJson.data : (Array.isArray(psJson) ? psJson : []));
    } catch (err) {
      console.error(err);
      setError('Failed to synchronize data with DaaS server. Check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute item count per warehouse
  const getStockCountForWarehouse = (warehouseId: string) => {
    const rawCount = rawMaterials.filter(item => item.warehouse_id === warehouseId).length;
    const prodCount = productStocks.filter(item => item.warehouse_id === warehouseId).length;
    return rawCount + prodCount;
  };

  // CRUD API Calls
  const handleCreateWarehouse = async (values: typeof createForm.values) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/items/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          location: Number(values.location),
          capacity: Number(values.capacity),
          status: values.status,
        }),
      });

      if (!response.ok) throw new Error('Failed to create warehouse');

      // Create Audit Log Entry
      await fetch('/api/items/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Warehouse Created',
          target_table: 'warehouses',
          record_id: values.code.trim().toUpperCase(),
          new_data: JSON.stringify(values),
        }),
      });

      notifications.show({
        title: 'Success',
        message: `Warehouse ${values.name} successfully added to master data!`,
        color: 'teal',
      });

      setCreateOpened(false);
      createForm.reset();
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to create a new warehouse. Please try again.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarehouse = async (values: typeof editForm.values) => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/items/warehouses/${values.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          location: Number(values.location),
          capacity: Number(values.capacity),
          status: values.status,
        }),
      });

      if (!response.ok) throw new Error('Failed to update warehouse');

      // Create Audit Log Entry
      await fetch('/api/items/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Warehouse Updated',
          target_table: 'warehouses',
          record_id: values.id,
          new_data: JSON.stringify(values),
        }),
      });

      notifications.show({
        title: 'Success',
        message: `Warehouse ${values.name} successfully updated!`,
        color: 'teal',
      });

      setEditOpened(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to update warehouse data. Please check connection.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;
    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/items/warehouses/${selectedWarehouse.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete warehouse');

      // Create Audit Log Entry
      await fetch('/api/items/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Warehouse Deleted',
          target_table: 'warehouses',
          record_id: selectedWarehouse.id,
          old_data: JSON.stringify(selectedWarehouse),
        }),
      });

      notifications.show({
        title: 'Success',
        message: `Warehouse ${selectedWarehouse.name} successfully deleted.`,
        color: 'teal',
      });

      setDeleteOpened(false);
      setSelectedWarehouse(null);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete warehouse. Warehouse may have relations with material stock.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    editForm.setValues({
      id: wh.id,
      code: wh.code,
      name: wh.name,
      location: String(wh.location),
      capacity: wh.capacity,
      status: wh.status,
    });
    setEditOpened(true);
  };

  const openDeleteModal = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setDeleteOpened(true);
  };

  // Filter Warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'ALL' || wh.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading && warehouses.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Connecting to DaaS warehouse master data...</Text>
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
              Warehouse Master Data
            </Title>
            <Text c="dimmed">Manage cold storage warehousing master data and storage allocation capacity</Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            color="violet"
            onClick={() => setCreateOpened(true)}
          >
            Add Warehouse
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Filter Panel */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md">
            <TextInput
              placeholder="Search warehouse code or name..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Warehouse Status"
              data={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
            />
          </Group>
        </Paper>

        {/* Warehouses Table */}
        <Paper p="lg" radius="md" withBorder>
          {filteredWarehouses.length === 0 ? (
            <Stack align="center" py="xl" gap="xs">
              <IconBuildingWarehouse size={48} color="dimmed" />
              <Text fw={600}>Warehouse Not Found</Text>
              <Text size="sm" c="dimmed">
                No warehouses match your search filter criteria.
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 140 }}>Warehouse Code</Table.Th>
                    <Table.Th>Warehouse Name</Table.Th>
                    <Table.Th>Region Design / Coordinates</Table.Th>
                    <Table.Th style={{ width: 150 }}>Capacity (Kg)</Table.Th>
                    <Table.Th style={{ width: 150 }}>Stock Item Count</Table.Th>
                    <Table.Th style={{ width: 120 }}>Status</Table.Th>
                    <Table.Th style={{ width: 150 }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredWarehouses.map((wh) => {
                    const preset = LOCATION_PRESETS.find(p => p.value === String(wh.location));
                    const locationLabel = preset ? preset.label : `Surabaya Coordinates (${wh.location})`;
                    const stockCount = getStockCountForWarehouse(wh.id);

                    return (
                      <Table.Tr key={wh.id}>
                        <Table.Td>
                          <Badge color="violet" variant="light" size="md">
                            {wh.code ?? ''}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>{wh.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{locationLabel}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {(wh.capacity ?? 0).toLocaleString()} Kg
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={stockCount > 0 ? 'blue' : 'gray'} variant="outline">
                            {stockCount} {stockCount === 1 ? 'Item' : 'Items'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={(wh.status ?? 'ACTIVE') === 'ACTIVE' ? 'teal' : 'red'}
                            variant="light"
                          >
                            {(wh.status ?? 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Tooltip label="View Warehouse Details">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => router.push(`/dashboard/warehouse-module/warehouse/${wh.id}`)}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Edit Master Data">
                              <ActionIcon
                                variant="light"
                                color="orange"
                                onClick={() => openEditModal(wh)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete Warehouse">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => openDeleteModal(wh)}
                                disabled={stockCount > 0}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
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

      {/* CREATE MODAL */}
      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title={<Title order={3} size="h4">Add New Master Warehouse</Title>}
        centered
        radius="md"
      >
        <form onSubmit={createForm.onSubmit(handleCreateWarehouse)}>
          <Stack gap="md">
            <TextInput
              label="Warehouse Code"
              placeholder="Example: WH-ALPHA"
              required
              {...createForm.getInputProps('code')}
            />
            <TextInput
              label="Warehouse Name"
              placeholder="Example: Cold Storage Surabaya-1"
              required
              {...createForm.getInputProps('name')}
            />
            <Select
              label="Location Region"
              data={LOCATION_PRESETS}
              required
              {...createForm.getInputProps('location')}
            />
            <NumberInput
              label="Storage Capacity (Kg)"
              placeholder="Example: 10000"
              min={1}
              required
              {...createForm.getInputProps('capacity')}
            />
            <Select
              label="Active Status"
              data={[
                { value: 'ACTIVE', label: 'Active (Receiving Stock)' },
                { value: 'INACTIVE', label: 'Inactive (Operational Closure)' },
              ]}
              required
              {...createForm.getInputProps('status')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" color="gray" onClick={() => setCreateOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" color="violet" loading={submitting}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title={<Title order={3} size="h4">Update Warehouse Master Data</Title>}
        centered
        radius="md"
      >
        <form onSubmit={editForm.onSubmit(handleUpdateWarehouse)}>
          <Stack gap="md">
            <TextInput
              label="Warehouse Code"
              placeholder="WH-001"
              required
              disabled
              {...editForm.getInputProps('code')}
            />
            <TextInput
              label="Warehouse Name"
              placeholder="Example: Cold Storage Surabaya-1"
              required
              {...editForm.getInputProps('name')}
            />
            <Select
              label="Location Region"
              data={LOCATION_PRESETS}
              required
              {...editForm.getInputProps('location')}
            />
            <NumberInput
              label="Storage Capacity (Kg)"
              placeholder="10000"
              min={1}
              required
              {...editForm.getInputProps('capacity')}
            />
            <Select
              label="Active Status"
              data={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              required
              {...editForm.getInputProps('status')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" color="gray" onClick={() => setEditOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" color="violet" loading={submitting}>
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title={<Title order={3} size="h4" c="red">Confirm Delete Warehouse</Title>}
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete warehouse <strong>{selectedWarehouse?.name}</strong> ({selectedWarehouse?.code})?
          </Text>
          <Text size="xs" c="red" bg="red.0" p="xs" style={{ borderRadius: 4 }}>
            This action is permanent and cannot be undone. Warehouses can only be deleted if they do not store any stock items.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" color="gray" onClick={() => setDeleteOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteWarehouse} loading={submitting}>
              Permanently Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

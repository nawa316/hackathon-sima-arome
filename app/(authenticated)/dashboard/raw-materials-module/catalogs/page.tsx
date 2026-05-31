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
  Button,
  Loader,
  TextInput,
  Select,
  Modal,
  NumberInput,
  ActionIcon,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconNotebook,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { logAuditTrail } from '@/lib/api/audit';
import type { ProductSupplier } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';

// Helper function to format empty/N/A values gracefully
const formatFallbackValue = (val: string | number | null | undefined) => {
  if (val === null || val === undefined || String(val).trim() === '' || String(val).toUpperCase() === 'N/A') {
    return (
      <span style={{ color: 'var(--ds-gray-400, #adb5bd)', fontWeight: 300, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
        —
      </span>
    );
  }
  return val;
};

export default function CatalogsManagementPage() {
  useSetModuleTitle('Raw Material Catalogs');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<ProductSupplier[]>([]);

  // Search filter
  const [search, setSearch] = useState('');

  // Modal states
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductSupplier | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formUnit, setFormUnit] = useState('kg');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await daasAPI.getItems<ProductSupplier>('product_suppliers');
      setCatalogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load raw material catalogs. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormPrice(0);
    setFormUnit('kg');
    setOpened(true);
  };

  const handleOpenEditModal = (item: ProductSupplier) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(Number(item.price));
    setFormUnit(item.unit);
    setOpened(true);
  };

  const handleDeleteItem = async (item: ProductSupplier) => {
    if (!window.confirm(`Are you sure you want to delete catalog "${item.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await daasAPI.deleteItem('product_suppliers', item.id);

      // Log Audit Trail
      await logAuditTrail(
        'Raw Material Catalog Deleted',
        'product_suppliers',
        item.id,
        JSON.stringify(item),
        `Deleted raw material ${item.name} from SCM catalog`
      );

      notifications.show({
        title: 'Successfully Deleted',
        message: `Catalog "${item.name}" has been successfully deleted from the system.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Deletion Failed',
        message: 'Failed to delete raw material catalog from database.',
        color: 'red',
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || formPrice <= 0 || !formUnit) {
      notifications.show({
        title: 'Incomplete Form',
        message: 'Please fill in all required fields correctly.',
        color: 'red',
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formName,
        price: formPrice,
        unit: formUnit,
      };

      if (editingItem) {
        // Update existing item
        await daasAPI.updateItem('product_suppliers', editingItem.id, payload);

        // Log Audit Trail
        await logAuditTrail(
          'Raw Material Catalog Updated',
          'product_suppliers',
          editingItem.id,
          JSON.stringify(editingItem),
          `Updated raw material catalog details ${formName} (Price: Rp ${formPrice.toLocaleString('id-ID')}/${formUnit})`
        );

        notifications.show({
          title: 'Successfully Updated',
          message: `Catalog "${formName}" has been successfully saved.`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      } else {
        // Create new item
        const newItem = await daasAPI.createItem<{ id: string }>('product_suppliers', payload);

        // Log Audit Trail
        await logAuditTrail(
          'New Raw Material Catalog Created',
          'product_suppliers',
          newItem.id,
          undefined,
          `Added new raw material ${formName} to SCM catalog (Price: Rp ${formPrice.toLocaleString('id-ID')}/${formUnit})`
        );

        notifications.show({
          title: 'Catalog Added',
          message: `Raw material "${formName}" has been successfully saved to SCM catalog.`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }

      setOpened(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Saving Failed',
        message: 'A system error occurred while saving catalog data.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list
  const filteredCatalogs = React.useMemo(() => {
    return catalogs.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.unit.toLowerCase().includes(search.toLowerCase())
    );
  }, [catalogs, search]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Raw Material Catalogs
            </Title>
            <Text c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              Master catalog of raw material essential oils, including standard reference prices and unit configurations
            </Text>
          </div>
        </Group>

        {/* Filters Toolbar */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="md" wrap="wrap">
              <TextInput
                placeholder="Search essential oil type..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ minWidth: 320, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <ActionIcon
                variant="light"
                color="emerald"
                size="lg"
                onClick={fetchData}
                title="Refresh Catalogs"
                style={{ color: 'var(--ds-primary, #1e5b3a)', backgroundColor: 'var(--ds-primary-100, #ebf7f0)' }}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>

            <Button
              leftSection={<IconPlus size={16} />}
              color="emerald"
              onClick={handleOpenAddModal}
              style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Add Catalog
            </Button>
          </Group>
        </Paper>

        {/* Table View */}
        <Paper p="md" radius="md" withBorder>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader size="md" color="emerald" />
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Loading material catalog...
              </Text>
            </Stack>
          ) : filteredCatalogs.length === 0 ? (
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                No catalog items found.
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={600}>
              <Table
                striped
                highlightOnHover
                verticalSpacing="xs"
                horizontalSpacing="md"
                style={{
                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                  fontSize: '0.85rem',
                }}
              >
                <Table.Thead style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  <Table.Tr>
                    <Table.Th style={{ fontWeight: 600 }}>Essential Oil Type</Table.Th>
                    <Table.Th style={{ textAlign: 'right', fontWeight: 600 }}>Standard Reference Price</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Measurement Unit</Table.Th>
                    <Table.Th style={{ width: 100 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredCatalogs.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Group gap="xs" wrap="nowrap">
                          <IconNotebook size={16} color="var(--ds-primary, #1e5b3a)" />
                          <Text size="sm" fw={600} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(item.name)}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="sm" fw={700} c="var(--ds-primary, #1e5b3a)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          Rp {Number(item.price).toLocaleString('id-ID')}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {formatFallbackValue(item.unit)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <Group justify="center" gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="md"
                            radius="md"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Catalog"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="md"
                            radius="md"
                            onClick={() => handleDeleteItem(item)}
                            title="Delete Catalog"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>

      {/* CRUD Form Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingItem ? 'Edit Raw Material Catalog' : 'Add New Raw Material Catalog'}
        radius="md"
        size="sm"
        styles={{
          title: {
            fontFamily: 'var(--ds-font-subheader, sans-serif)',
            fontWeight: 700,
            color: 'var(--ds-primary, #1e5b3a)',
            fontSize: '1.15rem',
          },
          body: {
            fontFamily: 'var(--ds-font-sans, sans-serif)',
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Essential Oil Name"
              placeholder="e.g. Pure Lavender Extract"
              value={formName}
              onChange={(e) => setFormName(e.currentTarget.value)}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                label: { fontFamily: 'var(--ds-font-sans, sans-serif)', fontWeight: 500 },
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <SimpleGrid cols={2} spacing="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <NumberInput
                label="Standard Reference Price"
                min={0}
                value={formPrice}
                onChange={(val) => setFormPrice(Number(val) || 0)}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  label: {
                    fontFamily: 'var(--ds-font-sans, sans-serif)',
                    fontWeight: 500,
                    minHeight: 38,
                    display: 'flex',
                    alignItems: 'flex-end',
                  },
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <Select
                label="Measurement Unit"
                data={['kg', 'liter', 'gram']}
                value={formUnit}
                onChange={(val) => setFormUnit(val || 'kg')}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  label: {
                    fontFamily: 'var(--ds-font-sans, sans-serif)',
                    fontWeight: 500,
                    minHeight: 38,
                    display: 'flex',
                    alignItems: 'flex-end',
                  },
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  option: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </SimpleGrid>

            <Divider my="xs" />

            <Group justify="flex-end">
              <Button variant="outline" color="gray" onClick={() => setOpened(false)} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cancel</Button>
              <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                {editingItem ? 'Save Changes' : 'Add Catalog'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

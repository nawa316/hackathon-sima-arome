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
  Button,
  Loader,
  Alert,
  TextInput,
  Select,
  Modal,
  Textarea,
  ActionIcon,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconEye,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconStarFilled,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { logAuditTrail } from '@/lib/api/audit';
import type { Supplier } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

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

export default function SupplierManagementPage() {
  useSetModuleTitle('Supplier Directory');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Modal State
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);

  // Form States
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await daasAPI.getItems<Supplier>('suppliers');
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load supplier directory. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setEditingItem(null);
    setFormCode(`SUP-${randomSuffix}`);
    setFormName('');
    setFormContactPerson('');
    setFormPhoneNumber('');
    setFormEmail('');
    setFormAddress('');
    setFormStatus('ACTIVE');
    setOpened(true);
  };

  const handleOpenEditModal = (item: Supplier) => {
    setEditingItem(item);
    setFormCode(item.code || '');
    setFormName(item.name);
    setFormContactPerson(item.contact_person === 'N/A' ? '' : item.contact_person || '');
    setFormPhoneNumber(item.phone_number || '');
    setFormEmail(item.email === 'N/A' ? '' : item.email || '');
    setFormAddress(item.address || '');
    setFormStatus(item.status || 'ACTIVE');
    setOpened(true);
  };

  const handleDeleteSupplier = async (item: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await daasAPI.deleteItem('suppliers', item.id);

      // Log Audit Trail
      await logAuditTrail(
        'Supplier Deleted',
        'suppliers',
        item.id,
        JSON.stringify(item),
        `Deleted supplier profile ${item.name} (${item.code}) from SCM directory`
      );

      notifications.show({
        title: 'Supplier Deleted',
        message: `Supplier "${item.name}" has been successfully deleted.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Deletion Failed',
        message: 'Failed to delete supplier from database.',
        color: 'red'
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode || !formName || !formPhoneNumber || !formAddress) {
      notifications.show({
        title: 'Incomplete Form',
        message: 'Please fill in all required fields.',
        color: 'red'
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        code: formCode,
        name: formName,
        contact_person: formContactPerson || 'N/A',
        phone_number: formPhoneNumber,
        email: formEmail || 'N/A',
        address: formAddress,
        status: formStatus,
        favorite: editingItem ? editingItem.favorite : false,
      };

      if (editingItem) {
        // Update Supplier
        await daasAPI.updateItem('suppliers', editingItem.id, payload);

        // Log Audit Trail
        await logAuditTrail(
          'Supplier Profile Updated',
          'suppliers',
          editingItem.id,
          JSON.stringify(editingItem),
          `Updated supplier profile ${formName} with code ${formCode}`
        );

        notifications.show({
          title: 'Profile Updated',
          message: `Supplier ${formName} was successfully saved.`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      } else {
        // Create Supplier
        const newItem = await daasAPI.createItem<{ id: string }>('suppliers', payload);

        // Log Audit Trail
        await logAuditTrail(
          'New Supplier Registered',
          'suppliers',
          newItem.id,
          undefined,
          `Registered new supplier profile ${formName} with code ${formCode}`
        );

        notifications.show({
          title: 'Supplier Registered',
          message: `Supplier ${formName} has been successfully registered.`,
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
        message: 'Failed to save supplier profile. Supplier code might already be registered.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code?.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase());

      const matchStatus = !filterStatus || s.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [suppliers, search, filterStatus]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Supplier Directory
            </Title>
            <Text c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              Manage essential oil raw material suppliers, company contact information, and partnership statuses
            </Text>
          </div>
        </Group>

        {/* Toolbar Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="md" wrap="wrap">
              <TextInput
                placeholder="Search suppliers by name, code, contact person..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ minWidth: 320, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <Select
                placeholder="Filter by Status"
                clearable
                value={filterStatus}
                onChange={setFilterStatus}
                data={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                style={{ minWidth: 160, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <ActionIcon
                variant="light"
                color="emerald"
                size="lg"
                onClick={fetchData}
                title="Refresh Suppliers"
                style={{ color: 'var(--ds-primary, #1e5b3a)', backgroundColor: 'var(--ds-primary-100, #ebf7f0)' }}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>

            <Button
              leftSection={<IconPlus size={16} />}
              color="emerald"
              onClick={handleOpenModal}
              style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Add Supplier
            </Button>
          </Group>
        </Paper>

        {/* Table View */}
        <Paper p="md" radius="md" withBorder>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader size="md" color="emerald" />
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Loading supplier directory...
              </Text>
            </Stack>
          ) : filteredSuppliers.length === 0 ? (
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                No suppliers found in the directory.
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
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
                    <Table.Th style={{ fontWeight: 600 }}>Supplier Code</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Supplier Name</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Primary Contact (PIC)</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Phone Number</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Email</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Address</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Status</Table.Th>
                    <Table.Th style={{ width: '120px', whiteSpace: 'nowrap' }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSuppliers.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {formatFallbackValue(s.code)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Group gap="xs" wrap="nowrap">
                          {s.favorite && (
                            <IconStarFilled size={16} color="#fcc419" style={{ flexShrink: 0 }} />
                          )}
                          <Text size="sm" fw={600} c="var(--ds-primary, #1e5b3a)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(s.name)}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" fw={500} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {formatFallbackValue(s.contact_person)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {formatFallbackValue(s.phone_number)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {formatFallbackValue(s.email)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 220, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-sans, sans-serif)' }} title={s.address}>
                          {formatFallbackValue(s.address)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Badge
                          color={s.status === 'INACTIVE' ? 'red' : 'teal'}
                          variant="light"
                          size="xs"
                          styles={{
                            root: {
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              letterSpacing: '0.2px',
                              fontFamily: 'var(--ds-font-sans, sans-serif)',
                            }
                          }}
                        >
                          {s.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', width: '120px' }}>
                        <Group wrap="nowrap" gap="xs" justify="flex-end">
                          <ActionIcon
                            component={Link}
                            href={`/dashboard/raw-materials-module/supplier/${s.id}`}
                            variant="subtle"
                            color="emerald"
                            size="md"
                            radius="md"
                            title="View Profile"
                            style={{ color: 'var(--ds-primary, #1e5b3a)' }}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="md"
                            radius="md"
                            title="Edit Supplier"
                            onClick={() => handleOpenEditModal(s)}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="md"
                            radius="md"
                            title="Delete Supplier"
                            onClick={() => handleDeleteSupplier(s)}
                          >
                            <IconTrash size={18} />
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

      {/* CRUD Supplier Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingItem ? "Edit Supplier Details" : "Add New Supplier"}
        radius="md"
        size="md"
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
            <Group grow style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <TextInput
                label="Supplier Code"
                placeholder="e.g. SUP-123"
                value={formCode}
                onChange={(e) => setFormCode(e.currentTarget.value)}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <Select
                label="Operational Status"
                data={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                value={formStatus}
                onChange={(val) => setFormStatus(val as 'ACTIVE' | 'INACTIVE')}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </Group>

            <TextInput
              label="Supplier Company Name"
              placeholder="e.g. CV. Aroma Nusantara"
              value={formName}
              onChange={(e) => setFormName(e.currentTarget.value)}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <TextInput
              label="Primary Contact Person"
              placeholder="e.g. Bara Ardiwinata"
              value={formContactPerson}
              onChange={(e) => setFormContactPerson(e.currentTarget.value)}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <TextInput
              label="Office Phone / PIC Number"
              placeholder="e.g. 0812-3456-7890"
              value={formPhoneNumber}
              onChange={(e) => setFormPhoneNumber(e.currentTarget.value)}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <TextInput
              label="Supplier Email Address"
              placeholder="e.g. info@aromanusantara.com"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.currentTarget.value)}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <Textarea
              label="Office & Warehouse Address"
              placeholder="e.g. Jl. Rungkut Industri Raya No.15, Surabaya"
              value={formAddress}
              onChange={(e) => setFormAddress(e.currentTarget.value)}
              minRows={3}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <Divider my="xs" />

            <Group justify="flex-end">
              <Button variant="outline" color="gray" onClick={() => setOpened(false)} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cancel</Button>
              <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                {editingItem ? "Save Changes" : "Add Supplier"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

'use client';

import React, { useEffect, useState, use } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  SimpleGrid,
  Badge,
  Button,
  Divider,
  Loader,
  Notification,
  Card,
  Anchor,
  Breadcrumbs,
  Table,
  ThemeIcon,
  Modal,
  TextInput,
  Select,
  Textarea,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconBuildingFactory,
  IconTruck,
  IconFileCheck,
  IconFileX,
  IconMail,
  IconPhone,
  IconMapPin,
  IconUser,
  IconEdit,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { logAuditTrail } from '@/lib/api/audit';
import type { Supplier, RawMaterial, Offer } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  useSetModuleTitle('Supplier Profile');

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [deliveries, setDeliveries] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Edit Modal states
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const fetchSupplierDetail = async () => {
    try {
      setLoading(true);

      // 1. Fetch supplier profile
      const sup = await daasAPI.getItem<Supplier>('suppliers', id);
      if (!sup) return;
      setSupplier(sup);

      // Pre-fill edit form states
      setFormName(sup.name || '');
      setFormCode(sup.code || '');
      setFormContactPerson(sup.contact_person === 'N/A' ? '' : sup.contact_person || '');
      setFormPhoneNumber(sup.phone_number || '');
      setFormEmail(sup.email === 'N/A' ? '' : sup.email || '');
      setFormAddress(sup.address || '');
      setFormStatus(sup.status || 'ACTIVE');

      // 2. Fetch all raw materials and offers to compute metrics and histories
      const [rmData, offersData] = await Promise.all([
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Offer>('offers'),
      ]);

      const allOffers = Array.isArray(offersData) ? offersData : [];
      setOffers(allOffers);

      // Map offers to their supplier_id for lookup
      const offerToSupplierMap = new Map<string, string>();
      allOffers.forEach(o => offerToSupplierMap.set(o.id, o.supplier_id));

      // Filter raw materials delivered by this supplier
      const rawMaterialsList = Array.isArray(rmData) ? rmData : [];
      const supplierDeliveries = rawMaterialsList.filter(item => {
        if (item.supplier_id === id) return true;
        if (item.offer_id && offerToSupplierMap.get(item.offer_id) === id) return true;
        return false;
      });

      // Sort deliveries by date received descending
      setDeliveries(
        supplierDeliveries.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
      );

    } catch (err) {
      console.error('Error fetching supplier details:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load supplier profile and transaction history.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierDetail();
  }, [id]);

  // Aggregate Metrics
  const totalDeliveries = deliveries.length;
  const totalAcceptedQC = deliveries.filter(
    item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION'
  ).length;
  const totalRejectedQC = deliveries.filter(item => item.status === 'QC_REJECTED').length;
  const totalPendingQC = deliveries.filter(item => item.status === 'PENDING_QC').length;

  const qualityRatio = totalDeliveries > 0 ? Math.round((totalAcceptedQC / (totalAcceptedQC + totalRejectedQC || 1)) * 100) : 100;

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/raw-materials-module' },
    { title: 'Suppliers', href: '/dashboard/raw-materials-module/supplier' },
    { title: supplier?.name || 'Profile', href: `/dashboard/raw-materials-module/supplier/${id}` },
  ].map((item, index) => (
    <Anchor component={Link} href={item.href} key={index} style={{ fontSize: 'var(--ds-font-size-xs)' }}>
      {item.title}
    </Anchor>
  ));

  const handleDeleteSupplier = async () => {
    if (!supplier) return;
    if (!window.confirm(`Are you sure you want to delete supplier "${supplier.name}"? This will redirect you back to directory.`)) {
      return;
    }

    try {
      setLoading(true);
      await daasAPI.deleteItem('suppliers', id);

      // Log Audit Trail
      await logAuditTrail(
        'Supplier Deleted',
        'suppliers',
        id,
        JSON.stringify(supplier),
        `Deleted supplier profile ${supplier.name} (${supplier.code}) via details page`
      );

      notifications.show({
        title: 'Supplier Deleted',
        message: `Supplier "${supplier.name}" has been successfully deleted.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      router.push('/dashboard/raw-materials-module/supplier');
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode || !formName || !formPhoneNumber || !formAddress || !supplier) {
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
        favorite: supplier.favorite,
      };

      await daasAPI.updateItem('suppliers', id, payload);

      // Log Audit Trail
      await logAuditTrail(
        'Supplier Profile Updated',
        'suppliers',
        id,
        JSON.stringify(supplier),
        `Updated supplier profile ${formName} with code ${formCode} via details page`
      );

      notifications.show({
        title: 'Profile Updated',
        message: `Supplier profile was successfully saved.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      setEditModalOpened(false);
      fetchSupplierDetail();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Saving Failed',
        message: 'Failed to update supplier profile. Code might already be registered.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '300px' }}>
          <Loader size="lg" color="emerald" />
          <Text c="dimmed">Loading supplier profile and SCM logs...</Text>
        </Stack>
      </Container>
    );
  }

  if (!supplier) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Supplier profile with ID {id} was not found in the SCM records.
        </Notification>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navigation */}
        <Group justify="space-between">
          <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          <Button
            component={Link}
            href="/dashboard/raw-materials-module/supplier"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            color="gray"
          >
            Back to List
          </Button>
        </Group>

        {/* Profile Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="md">
            <Box style={{ 
              width: 50, 
              height: 50, 
              borderRadius: 8, 
              backgroundColor: 'var(--ds-primary-100, #ebf7f0)', 
              color: 'var(--ds-primary, #1e5b3a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconBuildingFactory size={28} />
            </Box>
            <div>
              <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: 'var(--ds-primary, #1e5b3a)' }}>
                {supplier.name}
              </Title>
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Supplier Code: {formatFallbackValue(supplier.code)}</Text>
            </div>
          </Group>
          <Group gap="sm" wrap="wrap">
            <Badge
              size="lg"
              variant="filled"
              color={supplier.status === 'INACTIVE' ? 'red' : 'teal'}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              {supplier.status === 'INACTIVE' ? 'Inactive' : 'Active'}
            </Badge>
            <Button
              variant="outline"
              color="blue"
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditModalOpened(true)}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Edit Profile
            </Button>
            <Button
              variant="outline"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDeleteSupplier}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Delete Supplier
            </Button>
          </Group>
        </Group>

        {/* Aggregated KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
          {/* Deliveries */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="blue">
              <IconTruck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Total Deliveries</Text>
              <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)' }}>{totalDeliveries}</Title>
            </div>
          </Paper>

          {/* Passed */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="teal">
              <IconFileCheck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>QC Passed Batches</Text>
              <Title order={3} style={{ color: 'var(--ds-teal, #0ca678)', fontFamily: 'var(--ds-font-subheader, sans-serif)' }}>{totalAcceptedQC}</Title>
            </div>
          </Paper>

          {/* Rejected */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="red">
              <IconFileX size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>QC Rejected Batches</Text>
              <Title order={3} style={{ color: 'var(--ds-red, #f03e3e)', fontFamily: 'var(--ds-font-subheader, sans-serif)' }}>{totalRejectedQC}</Title>
            </div>
          </Paper>

          {/* Quality Ratio */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="teal">
              <IconFileCheck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Quality Pass Ratio</Text>
              <Title order={3} style={{ color: 'var(--ds-primary, #1e5b3a)', fontFamily: 'var(--ds-font-subheader, sans-serif)' }}>{qualityRatio}%</Title>
            </div>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Left: Contact Info Card (1 col) */}
          <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff', height: 'fit-content' }}>
            <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: '#1e5b3a' }}>
              Contacts & Location
            </Title>
            <Divider mb="lg" />

            <Stack gap="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <Group gap="sm" wrap="nowrap">
                <IconUser size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>PRIMARY CONTACT PERSON</Text>
                  <Text fw={600} size="sm" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(supplier.contact_person)}</Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap">
                <IconPhone size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>OFFICE PHONE NUMBER</Text>
                  <Text fw={600} size="sm" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(supplier.phone_number)}</Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap">
                <IconMail size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>EMAIL ADDRESS</Text>
                  <Text fw={600} size="sm" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                    {formatFallbackValue(supplier.email)}
                  </Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IconMapPin size={18} color="#868e96" style={{ marginTop: 4 }} />
                <div>
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>COMPANY ADDRESS</Text>
                  <Text fw={500} size="sm" style={{ lineHeight: 1.4, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(supplier.address)}</Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* Right: History Deliveries (2 cols) */}
          <Paper p="xl" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
            <Title order={3} mb="sm" style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: '#1e5b3a' }}>
              Raw Material Intake History
            </Title>
            <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              All raw material batch deliveries logged in SCM supplied by this vendor
            </Text>

            <Table.ScrollContainer minWidth={500}>
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
                    <Table.Th style={{ fontWeight: 600 }}>Intake Number</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Raw Material</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Batch Number</Table.Th>
                    <Table.Th style={{ textAlign: 'right', fontWeight: 600 }}>Quantity</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>QC Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {deliveries.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'var(--ds-gray-500)', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        No delivery logs recorded for this supplier.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    deliveries.map(item => {
                      let badgeColor = 'gray';
                      let badgeText = 'Pending';
                      if (item.status === 'PENDING_QC') {
                        badgeColor = 'orange';
                        badgeText = 'Pending QC';
                      } else if (item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION') {
                        badgeColor = 'teal';
                        badgeText = 'QC Passed';
                      } else if (item.status === 'QC_REJECTED') {
                        badgeColor = 'red';
                        badgeText = 'QC Rejected';
                      }

                      return (
                        <Table.Tr key={item.id}>
                          <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            <Text size="xs" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                              {formatFallbackValue(item.intake_number)}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            <Text size="xs" fw={600} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                              {formatFallbackValue(item.material_name)}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                              {formatFallbackValue(item.batch_code)}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            <Text size="xs" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                              {item.weight_kg} {formatFallbackValue(item.unit || 'kg')}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            <Badge
                              color={badgeColor}
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
                              {badgeText}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </SimpleGrid>
      </Stack>

      {/* Edit Profile Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Supplier Details"
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
        <form onSubmit={handleEditSubmit}>
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
              <Button variant="outline" color="gray" onClick={() => setEditModalOpened(false)} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cancel</Button>
              <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}

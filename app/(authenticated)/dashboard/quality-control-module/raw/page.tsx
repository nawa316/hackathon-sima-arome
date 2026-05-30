'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  TextInput,
  Select,
  Skeleton,
  Breadcrumbs,
  Anchor,
  SimpleGrid,
} from '@mantine/core';
import {
  IconSearch,
  IconFilter,
  IconCalendar,
  IconEye,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import Link from 'next/link';

interface RawMaterial {
  id: string;
  batch_code: string;
  material_name: string;
  status: 'PENDING_QC' | 'QC_ACCEPTED' | 'QC_REJECTED' | 'IN_PRODUCTION';
  received_at: string;
  weight_kg: number;
  offer_id: string;
}

interface Offer {
  id: string;
  supplier_id: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function RawMaterialQCListPage() {
  useSetModuleTitle('Raw Material QC');

  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [materialsData, offersData, suppliersData] = await Promise.all([
          daasAPI.getItems<RawMaterial>('raw_materials'),
          daasAPI.getItems<Offer>('offers'),
          daasAPI.getItems<Supplier>('suppliers'),
        ]);

        setRawMaterials(materialsData);
        setOffers(offersData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Error fetching raw material data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Relationship Mapping: offer_id -> supplier_id -> supplier name
  const rawMaterialsWithSuppliers = useMemo(() => {
    const offerToSupplierMap = new Map<string, string>();
    offers.forEach((off) => {
      offerToSupplierMap.set(off.id, off.supplier_id);
    });

    const supplierMap = new Map<string, string>();
    suppliers.forEach((sup) => {
      supplierMap.set(sup.id, sup.name);
    });

    return rawMaterials.map((mat) => {
      const supplierId = offerToSupplierMap.get(mat.offer_id);
      const supplierName = supplierId ? (supplierMap.get(supplierId) || 'Unknown Supplier') : 'Unknown Supplier';

      return {
        ...mat,
        supplierName,
      };
    });
  }, [rawMaterials, offers, suppliers]);

  // Apply Search, Status, and Date Filters
  const filteredMaterials = useMemo(() => {
    return rawMaterialsWithSuppliers.filter((item) => {
      // 1. Search Query Filter (Batch code or material name)
      const matchesSearch =
        item.batch_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material_name.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status Filter
      let matchesStatus = true;
      if (statusFilter === 'PENDING') {
        matchesStatus = item.status === 'PENDING_QC';
      } else if (statusFilter === 'ACCEPTED') {
        matchesStatus = item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION';
      } else if (statusFilter === 'REJECTED') {
        matchesStatus = item.status === 'QC_REJECTED';
      }

      // 3. Date Filter (Today, Last 7 days, Last 30 days)
      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const receivedDate = new Date(item.received_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - receivedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === 'TODAY') {
          matchesDate = receivedDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'WEEK') {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === 'MONTH') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [rawMaterialsWithSuppliers, searchQuery, statusFilter, dateFilter]);

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/quality-control-module' },
    { title: 'Raw Material QC', href: '/dashboard/quality-control-module/raw' },
  ].map((item, index) => (
    <Anchor component={Link} href={item.href} key={index} style={{ fontSize: 'var(--ds-font-size-xs)' }}>
      {item.title}
    </Anchor>
  ));

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Skeleton height={30} width={200} radius="md" />
          <Skeleton height={50} radius="md" />
          <Skeleton height={300} radius="md" />
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        {/* Page Title Header */}
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary)' }}>
              Raw Material QC Batches
            </Title>
            <Text c="dimmed">Perform inspections and review logs for raw material batches</Text>
          </div>
        </Group>

        {/* Filter Toolbar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Search Batch */}
            <TextInput
              placeholder="Search by batch number or material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              label="Search"
            />

            {/* Filter by Status */}
            <Select
              label="QC Status"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              data={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending QC' },
                { value: 'ACCEPTED', label: 'Accepted QC' },
                { value: 'REJECTED', label: 'Rejected QC' },
              ]}
              leftSection={<IconFilter size={16} />}
            />

            {/* Filter by Date */}
            <Select
              label="Received Date"
              value={dateFilter}
              onChange={(val) => setDateFilter(val || 'ALL')}
              data={[
                { value: 'ALL', label: 'All Time' },
                { value: 'TODAY', label: 'Today' },
                { value: 'WEEK', label: 'Last 7 Days' },
                { value: 'MONTH', label: 'Last 30 Days' },
              ]}
              leftSection={<IconCalendar size={16} />}
            />
          </SimpleGrid>
        </Paper>

        {/* Materials Table */}
        <Paper p="lg" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
          {filteredMaterials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text c="dimmed" size="lg">No batches matching your filters found.</Text>
            </div>
          ) : (
            <Table striped highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Batch Number</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Material Name</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Supplier</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Quantity</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Received Date</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>QC Status</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredMaterials.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ fontWeight: 600, color: 'var(--ds-gray-800)' }}>{item.batch_code}</Table.Td>
                    <Table.Td>{item.material_name}</Table.Td>
                    <Table.Td>{item.supplierName}</Table.Td>
                    <Table.Td style={{ fontWeight: 500 }}>{item.weight_kg} kg</Table.Td>
                    <Table.Td>
                      {new Date(item.received_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="filled"
                        color={
                          item.status === 'PENDING_QC'
                            ? 'yellow'
                            : item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION'
                              ? 'green'
                              : 'red'
                        }
                      >
                        {item.status === 'PENDING_QC'
                          ? 'Pending QC'
                          : item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION'
                            ? 'Accepted QC'
                            : 'Rejected QC'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {item.status === 'PENDING_QC' ? (
                          <Button
                            size="xs"
                            variant="filled"
                            color="primary"
                            leftSection={<IconClipboardCheck size={14} />}
                            component={Link}
                            href={`/dashboard/quality-control-module/raw/${item.id}`}
                          >
                            Perform QC
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="light"
                            color="gray"
                            leftSection={<IconEye size={14} />}
                            component={Link}
                            href={`/dashboard/quality-control-module/raw/${item.id}`}
                          >
                            View Detail
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

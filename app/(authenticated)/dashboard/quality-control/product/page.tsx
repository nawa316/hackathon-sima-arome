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

interface Production {
  id: string;
  lot_number: string;
  products_id: string;
  scheduled_date: string;
  actual_quantity: number;
  planned_quantity: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface Product {
  id: string;
  type: string;
  categories: string;
  price: number;
}

interface QCRecord {
  id: string;
  production_id?: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
}

export default function ProductQCListPage() {
  useSetModuleTitle('Product QC');

  const [loading, setLoading] = useState(true);
  const [productions, setProductions] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [qcRecords, setQcRecords] = useState<QCRecord[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [productionsData, productsData, qcData] = await Promise.all([
          daasAPI.getItems<Production>('productions'),
          daasAPI.getItems<Product>('products'),
          daasAPI.getItems<QCRecord>('quality_control'),
        ]);

        setProductions(productionsData);
        setProducts(productsData);
        setQcRecords(qcData);
      } catch (error) {
        console.error('Error fetching product QC data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Relationship Mapping: productions -> products, productions -> quality_control
  const productionsWithQC = useMemo(() => {
    const productMap = new Map<string, Product>();
    products.forEach((p) => {
      productMap.set(p.id, p);
    });

    const qcMap = new Map<string, QCRecord>();
    qcRecords.forEach((q) => {
      if (q.production_id) {
        qcMap.set(q.production_id, q);
      }
    });

    return productions.map((prod) => {
      const product = productMap.get(prod.products_id);
      const productName = product ? product.type : 'Unknown Product';

      const qcRecord = qcMap.get(prod.id);
      let qcStatus = 'PENDING';
      if (qcRecord) {
        qcStatus = qcRecord.qc_status;
      }

      return {
        ...prod,
        productName,
        qcStatus,
      };
    });
  }, [productions, products, qcRecords]);

  // Apply Search, Status, and Date Filters
  const filteredProductions = useMemo(() => {
    return productionsWithQC.filter((item) => {
      // 1. Search Query Filter (Lot Number or Product Name)
      const lotNum = item.lot_number || '';
      const matchesSearch =
        lotNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status Filter
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = item.qcStatus === statusFilter;
      }

      // 3. Date Filter (Today, Last 7 days, Last 30 days)
      let matchesDate = true;
      if (dateFilter !== 'ALL' && item.scheduled_date) {
        const prodDate = new Date(item.scheduled_date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - prodDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === 'TODAY') {
          matchesDate = prodDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'WEEK') {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === 'MONTH') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [productionsWithQC, searchQuery, statusFilter, dateFilter]);

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/quality-control' },
    { title: 'Product QC', href: '/dashboard/quality-control/product' },
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
              Product QC Batches
            </Title>
            <Text c="dimmed">Perform inspections and review logs for completed product batches</Text>
          </div>
        </Group>

        {/* Filter Toolbar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Search Batch */}
            <TextInput
              placeholder="Search by lot number or product name..."
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
                { value: 'PASSED', label: 'Accepted QC' },
                { value: 'FAILED', label: 'Rejected QC' },
              ]}
              leftSection={<IconFilter size={16} />}
            />

            {/* Filter by Date */}
            <Select
              label="Production Date"
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

        {/* Product Batches Table */}
        <Paper p="lg" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
          {filteredProductions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text c="dimmed" size="lg">No product batches matching your filters found.</Text>
            </div>
          ) : (
            <Table striped highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Batch Number (Lot)</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Product Name</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Production Date</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Quantity</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>QC Status</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredProductions.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ fontWeight: 600, color: 'var(--ds-gray-800)' }}>
                      {item.lot_number || 'N/A'}
                    </Table.Td>
                    <Table.Td>{item.productName}</Table.Td>
                    <Table.Td>
                      {item.scheduled_date
                        ? new Date(item.scheduled_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        : 'N/A'}
                    </Table.Td>
                    <Table.Td style={{ fontWeight: 500 }}>
                      {item.actual_quantity || item.planned_quantity} units
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="filled"
                        color={
                          item.qcStatus === 'PENDING'
                            ? 'yellow'
                            : item.qcStatus === 'PASSED'
                              ? 'green'
                              : 'red'
                        }
                      >
                        {item.qcStatus === 'PENDING'
                          ? 'Pending QC'
                          : item.qcStatus === 'PASSED'
                            ? 'Accepted QC'
                            : 'Rejected QC'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {item.qcStatus === 'PENDING' ? (
                          <Button
                            size="xs"
                            variant="filled"
                            color="primary"
                            leftSection={<IconClipboardCheck size={14} />}
                            component={Link}
                            href={`/dashboard/quality-control/product/${item.id}`}
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
                            href={`/dashboard/quality-control/product/${item.id}`}
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

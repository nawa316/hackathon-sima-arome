'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  RingProgress,
  Skeleton,
  Card,
} from '@mantine/core';
import {
  IconClipboardCheck,
  IconAward,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { useAuth } from '@/lib/buildpad/hooks';
import Link from 'next/link';

interface RawMaterial {
  id: string;
  batch_code: string;
  material_name: string;
  status: 'PENDING_QC' | 'QC_ACCEPTED' | 'QC_REJECTED' | 'IN_PRODUCTION';
  received_at: string;
  weight_kg: number;
}

interface Production {
  id: string;
  lot_number: string;
  scheduled_date: string;
  actual_quantity: number;
  planned_quantity: number;
  status: string;
}

interface QCRecord {
  id: string;
  raw_material_id?: string;
  production_id?: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
  qc_notes: string;
  created_at: string;
  checked_by: string;
}

interface DaaSUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function QCDashboardPage() {
  useSetModuleTitle('QC Dashboard');
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [qcRecords, setQcRecords] = useState<QCRecord[]>([]);
  const [users, setUsers] = useState<DaaSUser[]>([]);

  // Fetch all QC data from DaaS backend
  useEffect(() => {
    async function fetchQCData() {
      try {
        setLoading(true);
        const [materialsData, productionsData, qcData, usersData] = await Promise.all([
          daasAPI.getItems<RawMaterial>('raw_materials').catch(() => []),
          daasAPI.getItems<Production>('productions').catch(() => []),
          daasAPI.getItems<QCRecord>('quality_control').catch(() => []),
          daasAPI.getItems<DaaSUser>('daas_users').catch(() => []),
        ]);

        setRawMaterials(materialsData);
        setProductions(productionsData);
        setQcRecords(qcData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching QC data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchQCData();
  }, []);

  // Map user ID to full name
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
      map.set(u.id, name || u.email);
    });
    return map;
  }, [users]);

  // Calculate Metrics
  const stats = useMemo(() => {
    const totalRaw = rawMaterials.length;
    const totalProd = productions.length;
    const totalBatch = totalRaw + totalProd;

    // Pending Raw
    const pendingRaw = rawMaterials.filter((m) => m.status === 'PENDING_QC').length;
    // Pending Product (completed productions that don't have QC record yet or have pending QC record)
    const completedProdIds = productions.filter(p => p.status === 'COMPLETED').map(p => p.id);
    const prodQcMap = new Map<string, QCRecord>();
    qcRecords.forEach(q => {
      if (q.production_id) prodQcMap.set(q.production_id, q);
    });

    let pendingProd = 0;
    productions.forEach(p => {
      // If production is completed or progress and has no completed QC record, it's waiting for QC inspection
      const qc = prodQcMap.get(p.id);
      if (!qc || qc.qc_status === 'PENDING') {
        pendingProd++;
      }
    });

    const pendingQC = pendingRaw + pendingProd;

    // Accepted
    const acceptedQC = qcRecords.filter((q) => q.qc_status === 'PASSED').length;

    // Rejected
    const rejectedQC = qcRecords.filter((q) => q.qc_status === 'FAILED').length;

    const totalInspected = acceptedQC + rejectedQC;
    const acceptanceRate = totalInspected > 0 ? Math.round((acceptedQC / totalInspected) * 100) : 0;
    const rejectionRate = totalInspected > 0 ? Math.round((rejectedQC / totalInspected) * 100) : 0;

    return {
      totalBatch,
      pendingQC,
      acceptedQC,
      rejectedQC,
      acceptanceRate,
      rejectionRate,
    };
  }, [rawMaterials, productions, qcRecords]);

  // Get Recent Inspections
  const recentActivities = useMemo(() => {
    const sortedQc = [...qcRecords]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return sortedQc.map((record) => {
      // Find corresponding batch details
      let batchNumber = '-';
      let batchType = 'Product';

      if (record.raw_material_id) {
        const material = rawMaterials.find((m) => m.id === record.raw_material_id);
        batchNumber = material?.batch_code || 'RM-Batch';
        batchType = 'Raw Material';
      } else if (record.production_id) {
        const prod = productions.find((p) => p.id === record.production_id);
        batchNumber = prod?.lot_number || 'PR-Batch';
        batchType = 'Product';
      }

      return {
        id: record.id,
        date: new Date(record.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        batchNumber,
        batchType,
        qcResult: record.qc_status === 'PASSED' ? 'Accepted' : record.qc_status === 'FAILED' ? 'Rejected' : 'Pending',
        qcStaff: userMap.get(record.checked_by) || 'QC Staff',
      };
    });
  }, [qcRecords, rawMaterials, productions, userMap]);

  // Trend data for the last 7 days
  const trendData = useMemo(() => {
    const days = 7;
    const result = [];
    const dateCounts = new Map<string, number>();

    // Count records per day
    qcRecords.forEach((rec) => {
      const d = new Date(rec.created_at).toISOString().split('T')[0];
      dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dateCounts.get(dateStr) || 0;

      const label = date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit' });
      result.push({ label, count });
    }

    return result;
  }, [qcRecords]);

  // Pie chart calculation
  const donutChartSegments = useMemo(() => {
    const total = stats.acceptedQC + stats.rejectedQC + stats.pendingQC;
    if (total === 0) return { passed: 0, failed: 0, pending: 100 };
    return {
      passed: Math.round((stats.acceptedQC / total) * 100),
      failed: Math.round((stats.rejectedQC / total) * 100),
      pending: Math.round((stats.pendingQC / total) * 100),
    };
  }, [stats]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Skeleton height={80} radius="md" />
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            <Skeleton height={120} radius="md" />
            <Skeleton height={120} radius="md" />
            <Skeleton height={120} radius="md" />
            <Skeleton height={120} radius="md" />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Skeleton height={300} radius="md" />
            <Skeleton height={300} radius="md" />
          </SimpleGrid>
          <Skeleton height={200} radius="md" />
        </Stack>
      </Container>
    );
  }

  // Maximum value in trend for graphing scale
  const maxTrendVal = Math.max(...trendData.map((d) => d.count), 5);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary)' }}>
              Hello, {currentUser?.first_name || 'QC Staff'}!
            </Title>
            <Text c="dimmed">Here's what's happening in your quality operations today</Text>
          </div>
          <Group gap="sm">
            <Button component={Link} href="/dashboard/quality-control-module/raw" variant="filled" color="primary">
              Inspect Raw Material
            </Button>
            <Button component={Link} href="/dashboard/quality-control-module/product" variant="light" color="primary">
              Inspect Product Batch
            </Button>
          </Group>
        </Group>

        {/* Metric KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <MetricCard
            title="Total Batches"
            value={stats.totalBatch}
            subtitle="Total batches in queue"
            icon={<IconClipboardCheck size={24} style={{ color: 'var(--ds-primary)' }} />}
            color="var(--ds-primary-100)"
          />
          <MetricCard
            title="Pending QC"
            value={stats.pendingQC}
            subtitle="Batches waiting inspection"
            icon={<IconClock size={24} style={{ color: 'var(--ds-warning)' }} />}
            color="var(--ds-warning-100)"
          />
          <MetricCard
            title="Accepted QC"
            value={stats.acceptedQC}
            subtitle={`Acceptance Rate: ${stats.acceptanceRate}%`}
            icon={<IconCircleCheck size={24} style={{ color: 'var(--ds-success)' }} />}
            color="var(--ds-success-100)"
          />
          <MetricCard
            title="Rejected QC"
            value={stats.rejectedQC}
            subtitle={`Rejection Rate: ${stats.rejectionRate}%`}
            icon={<IconCircleX size={24} style={{ color: 'var(--ds-danger)' }} />}
            color="var(--ds-danger-100)"
          />
        </SimpleGrid>

        {/* Charts Section */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Pie Chart / QC Result Distribution */}
          <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
            <Title order={3} mb="xs" style={{ fontFamily: 'var(--ds-font-display)' }}>
              QC Result Distribution
            </Title>
            <Text size="sm" c="dimmed" mb="xl">
              Distribution of inspected batches status
            </Text>

            <Group justify="space-around" align="center" wrap="wrap">
              {/* Custom SVG Donut Chart */}
              <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-chart">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--ds-gray-300)" strokeWidth="3" />

                  {/* segment 1: Passed (Success Green) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="var(--ds-success)"
                    strokeWidth="4.5"
                    strokeDasharray={`${donutChartSegments.passed} ${100 - donutChartSegments.passed}`}
                    strokeDashoffset="25"
                  />

                  {/* segment 2: Rejected (Danger Red) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="var(--ds-danger)"
                    strokeWidth="4.5"
                    strokeDasharray={`${donutChartSegments.failed} ${100 - donutChartSegments.failed}`}
                    strokeDashoffset={`${25 - donutChartSegments.passed}`}
                  />

                  {/* segment 3: Pending (Warning Amber) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="var(--ds-warning)"
                    strokeWidth="4.5"
                    strokeDasharray={`${donutChartSegments.pending} ${100 - donutChartSegments.pending}`}
                    strokeDashoffset={`${25 - donutChartSegments.passed - donutChartSegments.failed}`}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <Title order={2} style={{ color: 'var(--ds-gray-800)' }}>
                    {qcRecords.length}
                  </Title>
                  <Text size="xs" c="dimmed">Inspected</Text>
                </div>
              </div>

              {/* Legends */}
              <Stack gap="xs" style={{ minWidth: '150px' }}>
                <LegendRow color="var(--ds-success)" label="Accepted QC" percentage={`${donutChartSegments.passed}%`} count={stats.acceptedQC} />
                <LegendRow color="var(--ds-danger)" label="Rejected QC" percentage={`${donutChartSegments.failed}%`} count={stats.rejectedQC} />
                <LegendRow color="var(--ds-warning)" label="Pending QC" percentage={`${donutChartSegments.pending}%`} count={stats.pendingQC} />
              </Stack>
            </Group>
          </Paper>

          {/* Line Chart / QC Activity Trend */}
          <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
            <Title order={3} mb="xs" style={{ fontFamily: 'var(--ds-font-display)' }}>
              QC Activity Trend
            </Title>
            <Text size="sm" c="dimmed" mb="xl">
              Daily inspection rates over the last 7 days
            </Text>

            {/* Custom SVG Line Chart */}
            <div style={{ width: '100%', height: '180px' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
                {/* Defs for Premium Gradient */}
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="30" y1="10" x2="390" y2="10" stroke="var(--ds-gray-300)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="30" y1="50" x2="390" y2="50" stroke="var(--ds-gray-300)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="30" y1="90" x2="390" y2="90" stroke="var(--ds-gray-300)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="30" y1="130" x2="390" y2="130" stroke="var(--ds-gray-300)" strokeWidth="0.5" />

                {/* Generate points for SVG path */}
                {(() => {
                  const paddingLeft = 40;
                  const paddingRight = 380;
                  const stepX = (paddingRight - paddingLeft) / (trendData.length - 1);
                  const graphHeight = 120; // from y=10 to y=130

                  const points = trendData.map((d, index) => {
                    const x = paddingLeft + index * stepX;
                    const y = 130 - (d.count / maxTrendVal) * graphHeight;
                    return { x, y };
                  });

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`;

                  return (
                    <>
                      {/* Area under the line */}
                      <path d={areaD} fill="url(#areaGrad)" />
                      {/* Trend Line */}
                      <path d={pathD} fill="none" stroke="var(--ds-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Data Dots & Tooltip Markers */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill="var(--ds-primary)" stroke="var(--ds-gray-100)" strokeWidth="1.5" />
                          {/* Value label on top of dot */}
                          <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="bold" fill="var(--ds-gray-700)" textAnchor="middle">
                            {trendData[i].count}
                          </text>
                          {/* X Axis Labels */}
                          <text x={p.x} y="145" fontSize="9" fill="var(--ds-gray-500)" textAnchor="middle">
                            {trendData[i].label}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </Paper>
        </SimpleGrid>

        {/* Recent QC Activity Table */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
          <Group justify="space-between" align="center" mb="lg">
            <div>
              <Title order={3} style={{ fontFamily: 'var(--ds-font-display)' }}>
                Recent QC Activity
              </Title>
              <Text size="sm" c="dimmed">
                Latest completed batch inspections
              </Text>
            </div>
            <Button variant="outline" color="primary" component={Link} href="/dashboard/quality-control-module/raw">
              View Activity Log
            </Button>
          </Group>

          {recentActivities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text c="dimmed">No recent inspections found. Get started by performing a batch QC!</Text>
            </div>
          ) : (
            <Table striped highlightOnHover verticalSpacing="md" className="recent-qc-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Date</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Batch Number</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>Batch Type</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>QC Result</Table.Th>
                  <Table.Th style={{ color: 'var(--ds-gray-600)' }}>QC Staff</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recentActivities.map((act) => (
                  <Table.Tr key={act.id}>
                    <Table.Td>{act.date}</Table.Td>
                    <Table.Td style={{ fontWeight: 600, color: 'var(--ds-gray-800)' }}>{act.batchNumber}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={act.batchType === 'Raw Material' ? 'orange' : 'teal'}>
                        {act.batchType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="filled"
                        color={act.qcResult === 'Accepted' ? 'green' : act.qcResult === 'Rejected' ? 'red' : 'yellow'}
                      >
                        {act.qcResult} QC
                      </Badge>
                    </Table.Td>
                    <Table.Td>{act.qcStaff}</Table.Td>
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

/**
 * Reusable Custom KPI Metric Card
 */
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card p="lg" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
      <Group justify="space-between" align="center" mb="sm">
        <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', tracking: '0.5px' }}>
          {title}
        </Text>
        <div style={{
          backgroundColor: color,
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {icon}
        </div>
      </Group>
      <Title order={2} style={{ color: 'var(--ds-gray-900)' }}>
        {value}
      </Title>
      <Text size="xs" c="dimmed" mt={4}>
        {subtitle}
      </Text>
    </Card>
  );
}

/**
 * Legend Helper Component for Donut Chart
 */
function LegendRow({
  color,
  label,
  percentage,
  count,
}: {
  color: string;
  label: string;
  percentage: string;
  count: number;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Group gap="xs" wrap="nowrap">
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
        <Text size="xs" fw={500} c="var(--ds-gray-800)">
          {label}
        </Text>
      </Group>
      <Text size="xs" fw={700} style={{ color: 'var(--ds-gray-800)' }}>
        {count} <span style={{ color: 'var(--ds-gray-500)', fontWeight: 400 }}>({percentage})</span>
      </Text>
    </Group>
  );
}

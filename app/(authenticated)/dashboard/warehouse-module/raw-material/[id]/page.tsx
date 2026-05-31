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
  Divider,
  Timeline,
  Textarea,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPackages,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconBuildingWarehouse,
  IconCalendar,
  IconUser,
  IconActivity,
  IconClipboardCheck,
  IconClock,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { RawMaterial, Warehouse, StockMovement, QualityControl } from '@/types/sima-arome';

export default function RawMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useSetModuleTitle('Raw Material Stock Detail');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [qcRecord, setQcRecord] = useState<QualityControl | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStockDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stock item (raw material)
      const matRes = await fetch(`/api/items/raw_materials/${id}`);
      if (!matRes.ok) throw new Error('Stock item not found');
      const matData = await matRes.json();
      const matObj: RawMaterial = matData.data || matData;
      setMaterial(matObj);

      // Fetch warehouses for joins
      const whRes = await fetch('/api/items/warehouses');
      if (whRes.ok) {
        const whJson = await whRes.json();
        setWarehouses(Array.isArray(whJson.data) ? whJson.data : (Array.isArray(whJson) ? whJson : []));
      }

      // Fetch stock movement history
      const smFilter = encodeURIComponent(JSON.stringify({ raw_material_id: { _eq: id } }));
      const smRes = await fetch(`/api/items/stock_movements?filter=${smFilter}`);
      if (smRes.ok) {
        const smJson = await smRes.json();
        setMovements(Array.isArray(smJson.data) ? smJson.data : (Array.isArray(smJson) ? smJson : []));
      }

      // Fetch quality control inspection if exists
      const qcFilter = encodeURIComponent(JSON.stringify({ raw_material_id: { _eq: id } }));
      const qcRes = await fetch(`/api/items/quality_control?filter=${qcFilter}`);
      if (qcRes.ok) {
        const qcJson = await qcRes.json();
        const qcList = Array.isArray(qcJson.data) ? qcJson.data : (Array.isArray(qcJson) ? qcJson : []);
        if (qcList.length > 0) {
          setQcRecord(qcList[0]);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load stock inventory details from the DaaS database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockDetails();
  }, [id]);



  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Connecting to stock details DaaS...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !material) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="gray"
            onClick={() => router.push('/dashboard/warehouse-module/raw-material')}
          >
            Back to Inventory
          </Button>
          <Alert icon={<IconAlertTriangle size={16} />} title="Warning" color="red">
            {error || 'Stock inventory data could not be found.'}
          </Alert>
        </Stack>
      </Container>
    );
  }

  // Joins
  const warehouseObj = warehouses.find(w => w.id === material.warehouse_id);
  const warehouseName = warehouseObj ? warehouseObj.name : 'Unknown Warehouse';

  const qty = Number(material.weight_kg || 0);

  // Category mapping
  const lowerName = material.material_name.toLowerCase();
  const category = (lowerName.includes('oil') || lowerName.includes('atsiri') || lowerName.includes('lavender')) 
    ? 'Essential Oil' 
    : (lowerName.includes('fix') ? 'Fixative' : 'Solvent');

  // Dates (Simulated as requested)
  const productionDate = new Date(new Date(material.received_at).getTime() - 1000 * 60 * 60 * 24 * 5).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const expiredDate = new Date(new Date(material.received_at).getTime() + 1000 * 60 * 60 * 24 * 365).toLocaleDateString('en-US', { dateStyle: 'medium' });

  // Map stock status and timeline state
  let currentActiveTimeline = 0;
  let qcStatusLabel = 'Pending QC';
  let qcColor = 'orange';

  if (material.status === 'PENDING_QC') {
    currentActiveTimeline = 1;
    qcStatusLabel = 'Pending QC (Awaiting Inspection)';
    qcColor = 'orange';
  } else if (material.status === 'QC_ACCEPTED') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'QC Accepted';
    qcColor = 'teal';
  } else if (material.status === 'QC_REJECTED') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'QC Rejected';
    qcColor = 'red';
  } else if (material.status === 'IN_PRODUCTION') {
    currentActiveTimeline = 3;
    qcStatusLabel = 'In Production';
    qcColor = 'blue';
  }

  // Unified movements
  const listMovements = movements.length > 0 
    ? movements 
    : [
        {
          id: 'mov-init',
          activity_type: 'STOCK_IN' as const,
          quantity: qty,
          description: `Initial receipt of raw material Batch ${material.batch_code} at ${warehouseName}.`,
          created_at: material.received_at,
        }
      ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Back Navigation */}
        <Group>
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="violet"
            onClick={() => router.push('/dashboard/warehouse-module/raw-material')}
          >
            Back to Stock List
          </Button>
        </Group>

        {/* Title Block */}
        <Group justify="space-between" align="center">
          <Group gap="md">
            <Paper p="xs" radius="md" bg="violet.0" c="violet.7">
              <IconPackages size={32} />
            </Paper>
            <div>
              <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', fontWeight: 700 }}>
                {material.material_name}
              </Title>
              <Text size="sm" c="dimmed">Batch Code: <strong>{material.batch_code}</strong></Text>
            </div>
          </Group>
          <Badge size="lg" color={qcColor} variant="filled">
            {qcStatusLabel}
          </Badge>
        </Group>

        {/* Business Rules Alerts */}
        {material.status === 'QC_REJECTED' && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Material Rejected by Quality Control" color="red" variant="filled">
            This raw material is declared as <strong>REJECTED QC</strong>. In accordance with Sima Arôme's business rules, this material <strong>must not be used</strong> in fragrance production recipe formulations and must be immediately marked for disposal or vendor return.
          </Alert>
        )}
        {material.status === 'PENDING_QC' && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Quality Control Inspection Required" color="orange">
            This raw material is currently in <strong>PENDING QC</strong> status. Physical inspection and laboratory aroma testing are required before the material is allowed into the compounding production tank.
          </Alert>
        )}
        {material.status === 'QC_ACCEPTED' && (
          <Alert icon={<IconCheck size={16} />} title="Material Ready for Use" color="teal">
            This raw material has a <strong>QC ACCEPTED</strong> status. The material is in prime condition and is 100% approved for use in fragrance compounding and maceration production recipes.
          </Alert>
        )}

        {/* Info Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Item Specifications */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="sm">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Specifications & Stock Information
              </Title>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Material Category:</Text>
                <Badge color="indigo" variant="light">{category}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Batch Number:</Text>
                <Text size="sm" fw={600}>{material.batch_code}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Warehouse Location:</Text>
                <Group gap="xs">
                  <IconBuildingWarehouse size={14} />
                  <Text size="sm" fw={600}>{warehouseName}</Text>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Stored Quantity:</Text>
                <Text size="sm" fw={700} c={qty < 100 ? 'orange' : 'teal'}>
                  {qty.toLocaleString()} Kg
                </Text>
              </Group>
              
              <Divider my="xs" label="Schedules & Expiration" labelPosition="center" />
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconCalendar size={14} />
                  <Text size="xs">Production Date:</Text>
                </Group>
                <Text size="xs" fw={600}>{productionDate}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconCalendar size={14} />
                  <Text size="xs">Expiration Date:</Text>
                </Group>
                <Text size="xs" fw={600} c="red">{expiredDate}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs" c="dimmed">
                  <IconUser size={14} />
                  <Text size="xs">Received By:</Text>
                </Group>
                <Text size="xs" fw={600}>Sima Arôme Warehouse Staff</Text>
              </Group>
            </Stack>
          </Paper>

          {/* QC Integration and Flow Tracker */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="stretch">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Quality Control (QC) Flow
              </Title>
              <Divider />
              
              <Timeline active={currentActiveTimeline} bulletSize={24} lineWidth={2}>
                <Timeline.Item bullet={<IconCheck size={12} />} title="Stock Received">
                  <Text size="xs" c="dimmed">Material arrived at the warehouse dock and was recorded in the system.</Text>
                  <Text size="xxs" mt={4}>{new Date(material.received_at).toLocaleDateString('en-US', { dateStyle: 'short' })}</Text>
                </Timeline.Item>

                <Timeline.Item bullet={<IconClock size={12} />} title="Pending QC">
                  <Text size="xs" c="dimmed">Awaiting visual physical inspection by the Quality Control team.</Text>
                </Timeline.Item>

                <Timeline.Item 
                  bullet={<IconClipboardCheck size={12} />} 
                  title="QC Inspection"
                  lineVariant={material.status === 'QC_REJECTED' ? 'dashed' : 'solid'}
                >
                  <Text size="xs" c="dimmed">Aromatic density check and quality validation.</Text>
                </Timeline.Item>

                <Timeline.Item 
                  bullet={material.status === 'QC_REJECTED' ? <IconX size={12} /> : <IconCheck size={12} />} 
                  title="QC Completed"
                  color={material.status === 'QC_REJECTED' ? 'red' : 'teal'}
                >
                  {qcRecord ? (
                    <Stack gap="xxs" mt="xs" bg="gray.0" p="xs" style={{ borderRadius: 4 }}>
                      <Text size="xs" fw={700}>Inspector Notes:</Text>
                      <Text size="xs" fs="italic" c="dimmed">"{qcRecord.qc_notes}"</Text>
                      <Text size="xxs" c="dimmed" mt={4}>
                        Inspected on: {new Date(qcRecord.created_at).toLocaleDateString('en-US')}
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed">Material is ready to be used or rejected.</Text>
                  )}
                </Timeline.Item>
              </Timeline>


            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Stock Movement History Table */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconActivity size={20} color="violet" />
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Stock Movement History
              </Title>
            </Group>
            <Text size="xs" c="dimmed">Chronological record of stock ins and outs, volume adjustments, and physical stock audits.</Text>

            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 150 }}>Date & Time</Table.Th>
                  <Table.Th style={{ width: 180 }}>Activity Type</Table.Th>
                  <Table.Th style={{ width: 140 }}>Quantity</Table.Th>
                  <Table.Th>Transaction Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {listMovements.map((mov, idx) => {
                  let badgeColor = 'gray';
                  if (mov.activity_type === 'STOCK_IN') badgeColor = 'green';
                  else if (mov.activity_type === 'STOCK_OUT') badgeColor = 'red';
                  else if (mov.activity_type === 'STOCK_ADJUSTMENT') badgeColor = 'orange';

                  return (
                    <Table.Tr key={mov.id || idx}>
                      <Table.Td>
                        <Text size="xs">
                          {new Date(mov.created_at).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={badgeColor} variant="light">
                          {mov.activity_type === 'STOCK_IN' ? 'Stock In' : mov.activity_type === 'STOCK_OUT' ? 'Stock Out' : 'Adjustment'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700}>
                          {mov.activity_type === 'STOCK_OUT' ? '-' : '+'}{Number(mov.quantity).toLocaleString()} Kg
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{mov.description}</Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      </Stack>

    </Container>
  );
}

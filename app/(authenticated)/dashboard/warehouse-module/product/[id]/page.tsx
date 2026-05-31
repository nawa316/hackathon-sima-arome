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
  TextInput,
  Textarea,
  Modal,
  Select,
  NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPackages,
  IconAlertTriangle,
  IconCheck,
  IconBuildingWarehouse,
  IconActivity,
  IconClipboardCheck,
  IconPlus,
  IconEdit,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { useRouter } from 'next/navigation';
import type { ProductStock, Product, Warehouse, StockMovement } from '@/types/sima-arome';

export default function ProductStockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useSetModuleTitle('Product Stock Detail');
  const router = useRouter();

  // State Management
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<ProductStock | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Adjustment Modal Form State
  const [adjustModalOpened, setAdjustModalOpened] = useState(false);
  const [adjustType, setAdjustType] = useState<string | null>('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState<number | string>(10);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStockDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch product stock record
      const stockRes = await fetch(`/api/items/product_stocks/${id}`);
      if (!stockRes.ok) throw new Error('Product stock record not found');
      const stockData = await stockRes.json();
      const stockObj: ProductStock = stockData.data || stockData;
      setStock(stockObj);

      // 2. Fetch corresponding product and warehouse metadata
      const smFilter = encodeURIComponent(JSON.stringify({ product_stock_id: { _eq: id } }));
      const [prodRes, whRes, smRes] = await Promise.all([
        fetch(`/api/items/products/${stockObj.product_id}`),
        fetch(`/api/items/warehouses/${stockObj.warehouse_id}`),
        fetch(`/api/items/stock_movements?filter=${smFilter}`),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProduct(prodData.data || prodData);
      }

      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouse(whData.data || whData);
      }

      if (smRes.ok) {
        const smJson = await smRes.json();
        setMovements(Array.isArray(smJson.data) ? smJson.data : (Array.isArray(smJson) ? smJson : []));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load finished product stock details from the DaaS database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockDetails();
  }, [id]);

  // Handle Inventory Adjustments
  const handleAdjustmentSubmit = async () => {
    if (!stock || !adjustType || adjustQty === '') return;
    try {
      setSubmitting(true);
      const qtyNum = Number(adjustQty);
      const currentQty = Number(stock.amount || 0);
      let newAmount = currentQty;

      if (adjustType === 'STOCK_IN') {
        newAmount = currentQty + qtyNum;
      } else if (adjustType === 'STOCK_OUT') {
        if (qtyNum > currentQty) {
          notifications.show({
            title: 'Invalid Quantity',
            message: 'Cannot deduct more than currently stored stock amount.',
            color: 'red',
          });
          setSubmitting(false);
          return;
        }
        newAmount = currentQty - qtyNum;
      } else if (adjustType === 'STOCK_ADJUSTMENT') {
        newAmount = qtyNum;
      }

      const notesText = adjustNotes.trim() || `Manual stock adjustment of ${qtyNum} units.`;

      // 1. Update product_stocks table quantity
      const stockUpdate = await fetch(`/api/items/product_stocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: newAmount,
        }),
      });

      if (!stockUpdate.ok) throw new Error('Failed to update stock quantity');

      // 2. Post a record to stock_movements
      const smResponse = await fetch('/api/items/stock_movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_stock_id: id,
          activity_type: adjustType,
          quantity: qtyNum,
          description: notesText,
          created_at: new Date().toISOString(),
        }),
      });

      if (!smResponse.ok) throw new Error('Failed to record stock movement');

      // 3. Post audit trail
      await fetch('/api/items/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Stock Level Adjusted',
          target_table: 'product_stocks',
          record_id: id,
          new_data: JSON.stringify({ adjust_type: adjustType, amount: newAmount }),
        }),
      });

      notifications.show({
        title: 'Adjustment Successful',
        message: `Inventory stock has been adjusted successfully to ${newAmount} units!`,
        color: 'teal',
      });

      setAdjustModalOpened(false);
      setAdjustNotes('');
      setAdjustQty(10);
      fetchStockDetails();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save stock adjustment details. Please check your data connection.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !stock) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Loader size="xl" color="violet" />
          <Text c="dimmed">Connecting to stock details DaaS...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !stock) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            color="gray"
            onClick={() => router.push('/dashboard/warehouse-module/product')}
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

  const productName = product ? product.type : 'Finished Good Product';
  const productCategory = product ? product.categories : 'Fragrance';
  const productPrice = product ? product.price : 0;
  const warehouseName = warehouse ? warehouse.name : 'Unknown Warehouse';
  const qty = Number(stock.amount || 0);

  // Availability status color
  const statusColor = qty <= 0 ? 'red' : qty < 50 ? 'orange' : 'teal';
  const statusText = qty <= 0 ? 'Out of Stock' : qty < 50 ? 'Low Stock' : 'Available (Safe)';

  // Chronological list of movements
  const listMovements = movements.length > 0
    ? movements
    : [
        {
          id: 'mov-init',
          activity_type: 'STOCK_IN' as const,
          quantity: qty,
          description: `Initial finished goods receipt recorded in the warehouse database.`,
          created_at: new Date().toISOString(),
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
            onClick={() => router.push('/dashboard/warehouse-module/product')}
          >
            Back to Product List
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
                {productName}
              </Title>
              <Text size="sm" c="dimmed">Product Code: <strong>{stock.product_id.substring(0, 8).toUpperCase()}</strong></Text>
            </div>
          </Group>
          <Badge size="lg" color={statusColor} variant="filled">
            {statusText}
          </Badge>
        </Group>

        {/* Business Rule Alerts */}
        {qty <= 0 && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Out of Stock - Immediate Action Required" color="red" variant="filled">
            This finished product has an empty inventory! Formulations or bottling schedules must be initiated in the production module.
          </Alert>
        )}
        {qty > 0 && qty < 50 && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Low Stock Warning Threshold Triggered" color="orange">
            This finished product is below the minimum safety threshold (50 units). Please trigger production replenishment schedules.
          </Alert>
        )}
        {qty >= 50 && (
          <Alert icon={<IconCheck size={16} />} title="Stock Level Stable" color="teal">
            The current finished product inventory level is in prime stable condition and fully capable of satisfying distribution orders.
          </Alert>
        )}

        {/* Specifications & Info Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Specifications */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                  Product Card Specifications
                </Title>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  color="violet"
                  onClick={() => setAdjustModalOpened(true)}
                >
                  Adjust Stock
                </Button>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Product Name:</Text>
                <Text size="sm" fw={600}>{productName}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Category:</Text>
                <Badge color="indigo" variant="light">{productCategory}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Warehouse Location:</Text>
                <Group gap="xs">
                  <IconBuildingWarehouse size={14} />
                  <Text size="sm" fw={600}>{warehouseName}</Text>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Sale Price (IDR):</Text>
                <Text size="sm" fw={600}>Rp {productPrice.toLocaleString('id-ID')}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Stored Quantity:</Text>
                <Text size="sm" fw={700} c={statusColor}>
                  {qty.toLocaleString()} Units
                </Text>
              </Group>
            </Stack>
          </Paper>

          {/* History Flow Visual Tracker */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="stretch">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Stock Movement Summary
              </Title>
              <Divider />

              <Timeline active={0} bulletSize={24} lineWidth={2}>
                {listMovements.slice(0, 3).map((mov, idx) => {
                  let movIcon = <IconActivity size={12} />;
                  let movColor = 'violet';
                  if (mov.activity_type === 'STOCK_IN') {
                    movColor = 'teal';
                  } else if (mov.activity_type === 'STOCK_OUT') {
                    movColor = 'red';
                  }

                  return (
                    <Timeline.Item
                      key={mov.id || idx}
                      bullet={movIcon}
                      color={movColor}
                      title={mov.activity_type === 'STOCK_IN' ? 'Stock Added' : mov.activity_type === 'STOCK_OUT' ? 'Stock Dispatched' : 'Adjustment'}
                    >
                      <Text size="xs" c="dimmed">{mov.description}</Text>
                      <Text size="xxs" mt={4}>{new Date(mov.created_at).toLocaleString()}</Text>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Detailed Stock Movement History Table */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconActivity size={20} color="violet" />
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)' }}>
                Stock Movement Audit Log
              </Title>
            </Group>
            <Text size="xs" c="dimmed">Chronological ledger of finished goods dispatch orders, warehouse storage receipts, and recounts.</Text>

            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 180 }}>Date & Time</Table.Th>
                  <Table.Th style={{ width: 180 }}>Movement Type</Table.Th>
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
                          {mov.activity_type === 'STOCK_OUT' ? '-' : '+'}{Number(mov.quantity).toLocaleString()} Units
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

      {/* INVENTORY ADJUSTMENT MODAL */}
      <Modal
        opened={adjustModalOpened}
        onClose={() => setAdjustModalOpened(false)}
        title={
          <Group gap="xs">
            <IconEdit size={20} color="violet" />
            <Title order={3} size="h4">Adjust Finished Goods Stock</Title>
          </Group>
        }
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Record a stock movement transaction for <strong>{productName}</strong>. This will modify the live warehouse stock balance.
          </Text>

          <Select
            label="Transaction Type"
            placeholder="Select type"
            data={[
              { value: 'STOCK_IN', label: 'Stock In (Incoming Delivery / Production Receipt)' },
              { value: 'STOCK_OUT', label: 'Stock Out (Distribution Dispatch / Sale Shipment)' },
              { value: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment (Physical Stock Audit Recount)' },
            ]}
            value={adjustType}
            onChange={setAdjustType}
            required
          />

          <NumberInput
            label="Quantity"
            placeholder="e.g. 50"
            value={adjustQty}
            onChange={setAdjustQty}
            min={0}
            required
          />

          <Textarea
            label="Transaction Notes / Description"
            placeholder="Provide reasons, reference order numbers, or physical count discrepancy details..."
            required
            minRows={3}
            value={adjustNotes}
            onChange={(e) => setAdjustNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" color="gray" onClick={() => setAdjustModalOpened(false)}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={handleAdjustmentSubmit}
              loading={submitting}
            >
              Post Transaction
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

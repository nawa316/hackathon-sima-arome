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
  NumberInput,
  Textarea,
  Divider,
  ActionIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconEye,
  IconCalendar,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { useAuth } from '@/lib/buildpad/hooks';
import { logAuditTrail } from '@/lib/api/audit';
import type { RawMaterial, Supplier, Offer, ProductSupplier, Warehouse } from '@/types/sima-arome';
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

export default function RawMaterialIntakePage() {
  useSetModuleTitle('Raw Material Intake');
  const { user: currentUser } = useAuth();

  // List States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intakes, setIntakes] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Modal State
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formIntakeNumber, setFormIntakeNumber] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formOfferId, setFormOfferId] = useState<string>('');
  const [formBatchCode, setFormBatchCode] = useState('');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formCategory, setFormCategory] = useState('Essential Oil');
  const [formWeightKg, setFormWeightKg] = useState<number>(50);
  const [formUnit, setFormUnit] = useState('kg');
  const [formReceivedAt, setFormReceivedAt] = useState<string | null>(() => new Date().toISOString().split('T')[0]);
  const [formExpiredDate, setFormExpiredDate] = useState<string | null>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1); // 1 year expiry default
    return d.toISOString().split('T')[0];
  });
  const [formNotes, setFormNotes] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState<string>('');
  const [formTotalPrice, setFormTotalPrice] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rmData, supData, offersData, psData, whData] = await Promise.all([
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<Offer>('offers'),
        daasAPI.getItems<ProductSupplier>('product_suppliers'),
        daasAPI.getItems<Warehouse>('warehouses'),
      ]);

      setIntakes(Array.isArray(rmData) ? rmData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProductSuppliers(Array.isArray(psData) ? psData : []);
      
      const whList = Array.isArray(whData) ? whData : [];
      setWarehouses(whList);
      
      // Default to first active warehouse if available
      if (whList.length > 0) {
        setFormWarehouseId(whList[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load raw material intakes. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate Intake Number on Modal Open
  const handleOpenModal = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    setFormIntakeNumber(`INTAKE-${dateStr}-${randomSuffix}`);
    setFormSupplierId('');
    setFormOfferId('');
    setFormBatchCode('');
    setFormMaterialName('');
    setFormWeightKg(50);
    setFormTotalPrice(0);
    setFormNotes('');
    setOpened(true);
  };

  // Mappings
  const supplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const productSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    productSuppliers.forEach(p => map.set(p.id, p.name));
    return map;
  }, [productSuppliers]);

  const offerToSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach(o => map.set(o.id, o.supplier_id));
    return map;
  }, [offers]);

  const getSupplierName = (item: RawMaterial): string => {
    if (item.supplier_id && supplierMap.has(item.supplier_id)) {
      return supplierMap.get(item.supplier_id)!;
    }
    if (item.offer_id && offerToSupplierMap.has(item.offer_id)) {
      const sId = offerToSupplierMap.get(item.offer_id)!;
      return supplierMap.get(sId) || 'Sima Arôme Supplier';
    }
    return 'Sima Arôme Supplier';
  };

  // Filter supplier offers
  const filteredOffers = React.useMemo(() => {
    if (!formSupplierId) return [];
    return offers
      .filter(o => o.supplier_id === formSupplierId)
      .map(o => {
        const prodName = productSupplierMap.get(o.product_supplier_id) || 'Raw Material';
        return {
          value: o.id,
          label: `${prodName} (Rp ${o.price.toLocaleString('id-ID')}/${o.lead_time} days)`,
          price: o.price,
          name: prodName
        };
      });
  }, [formSupplierId, offers, productSupplierMap]);

  // Recalculate price when offer or quantity changes
  const handleOfferChange = (offerId: string | null) => {
    if (!offerId) return;
    setFormOfferId(offerId);
    const selected = filteredOffers.find(o => o.value === offerId);
    if (selected) {
      setFormMaterialName(selected.name);
      const computedPrice = selected.price * formWeightKg;
      setFormTotalPrice(computedPrice);
    }
  };

  const handleWeightChange = (val: number | string) => {
    const qty = Number(val) || 0;
    setFormWeightKg(qty);
    const selected = filteredOffers.find(o => o.value === formOfferId);
    if (selected) {
      setFormTotalPrice(selected.price * qty);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSupplierId || !formOfferId || !formBatchCode || !formWarehouseId || !currentUser) {
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
        supplier_id: formSupplierId,
        offer_id: formOfferId,
        warehouse_id: formWarehouseId,
        intake_number: formIntakeNumber,
        batch_code: formBatchCode,
        material_name: formMaterialName,
        category: formCategory,
        weight_kg: formWeightKg,
        unit: formUnit,
        received_by: currentUser.id,
        received_at: formReceivedAt ? new Date(formReceivedAt).toISOString() : new Date().toISOString(),
        expired_date: formExpiredDate ? new Date(formExpiredDate).toISOString() : null,
        notes: formNotes,
        total_price: formTotalPrice,
        status: 'PENDING_QC',
      };

      const newItem = await daasAPI.createItem<{ id: string }>('raw_materials', payload);
      
      // Log Audit Trail
      await logAuditTrail(
        'Raw Material Intake Logged',
        'raw_materials',
        newItem.id,
        undefined,
        `Logged raw material intake ${formMaterialName} with number ${formIntakeNumber} from supplier`
      );

      notifications.show({
        title: 'Successfully Logged',
        message: `Raw material ${formMaterialName} was successfully logged with Pending QC status.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      setOpened(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Saving Failed',
        message: 'A system error occurred while saving intake data.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Table Data Filtering
  const filteredIntakes = React.useMemo(() => {
    return intakes.filter(item => {
      const searchMatch = 
        item.intake_number?.toLowerCase().includes(search.toLowerCase()) ||
        item.material_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.batch_code?.toLowerCase().includes(search.toLowerCase());

      const supplierId = item.supplier_id || (item.offer_id ? offerToSupplierMap.get(item.offer_id) : null);
      const supplierMatch = !filterSupplier || supplierId === filterSupplier;

      const statusMatch = !filterStatus || item.status === filterStatus;

      return searchMatch && supplierMatch && statusMatch;
    });
  }, [intakes, search, filterSupplier, filterStatus, offerToSupplierMap]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Page Title & Button */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Raw Material Intakes
            </Title>
            <Text c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              Record, search, and monitor the logistics of raw material deliveries received from SCM suppliers
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            color="emerald"
            onClick={handleOpenModal}
            style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}
          >
            Add Intake
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Search Intake No., Material, or Batch..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ minWidth: 280, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />
            <Select
              placeholder="Filter by Supplier"
              clearable
              value={filterSupplier}
              onChange={setFilterSupplier}
              data={suppliers.map(s => ({ value: s.id, label: s.name }))}
              style={{ minWidth: 220, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />
            <Select
              placeholder="Filter by QC Status"
              clearable
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: 'PENDING_QC', label: 'Pending QC' },
                { value: 'QC_ACCEPTED', label: 'QC Passed' },
                { value: 'QC_REJECTED', label: 'QC Rejected' },
              ]}
              style={{ minWidth: 180, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />
          </Group>
        </Paper>

        {/* Table list */}
        <Paper p="md" radius="md" withBorder>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader size="md" color="emerald" />
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Loading intakes directory...
              </Text>
            </Stack>
          ) : filteredIntakes.length === 0 ? (
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                No raw material intake transactions found.
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
                    <Table.Th style={{ fontWeight: 600 }}>Intake Number</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Material Name</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Batch Number</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Supplier</Table.Th>
                    <Table.Th style={{ textAlign: 'right', fontWeight: 600 }}>Quantity</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Arrival Date</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>QC Status</Table.Th>
                    <Table.Th style={{ width: 80 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredIntakes.map((item) => {
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
                          <Text size="sm" fw={600} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(item.material_name)}
                          </Text>
                          <Text size="xxs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(item.category || 'Essential Oil')}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(item.batch_code)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          <Text size="xs" fw={500} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {formatFallbackValue(getSupplierName(item))}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          <Text size="sm" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {item.weight_kg} {formatFallbackValue(item.unit || 'kg')}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          <Text size="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {new Date(item.received_at).toLocaleDateString('en-US', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          <Badge
                            color={badgeColor}
                            variant="light"
                            size="sm"
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
                        <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <ActionIcon
                            component={Link}
                            href={`/dashboard/raw-materials-module/intake/${item.id}`}
                            variant="subtle"
                            color="emerald"
                            size="md"
                            radius="md"
                            style={{
                              color: 'var(--ds-primary, #1e5b3a)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
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

      {/* Create Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Record New Raw Material Intake"
        size="lg"
        radius="md"
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
                label="Intake Number"
                value={formIntakeNumber}
                readOnly
                disabled
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <Select
                label="Storage Warehouse"
                placeholder="Select Warehouse"
                data={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                value={formWarehouseId}
                onChange={(val) => setFormWarehouseId(val || '')}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </Group>

            <Select
              label="Supplier"
              placeholder="Select Supplier"
              searchable
              data={suppliers.filter(s => s.status !== 'INACTIVE').map(s => ({ value: s.id, label: s.name }))}
              value={formSupplierId}
              onChange={(val) => {
                setFormSupplierId(val || '');
                setFormOfferId('');
              }}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <Select
              label="Offered Material"
              placeholder={formSupplierId ? "Select Material" : "Select Supplier First"}
              disabled={!formSupplierId}
              data={filteredOffers}
              value={formOfferId}
              onChange={handleOfferChange}
              required
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <Group grow style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <TextInput
                label="Supplier Batch Number"
                placeholder="e.g., RM-LAV-2026"
                value={formBatchCode}
                onChange={(e) => setFormBatchCode(e.currentTarget.value)}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <TextInput
                label="Material Category"
                value={formCategory}
                onChange={(e) => setFormCategory(e.currentTarget.value)}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </Group>

            <Group grow style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <NumberInput
                label="Quantity (Volume)"
                min={0.1}
                decimalScale={2}
                value={formWeightKg}
                onChange={handleWeightChange}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <Select
                label="Unit"
                data={['kg', 'liter', 'gram']}
                value={formUnit}
                onChange={(val) => setFormUnit(val || 'kg')}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                  dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </Group>

            <Group grow style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <DateInput
                label="Intake Date"
                placeholder="Select Date"
                value={formReceivedAt ? new Date(formReceivedAt) : null}
                onChange={(d: any) => setFormReceivedAt(d ? d.toISOString().split('T')[0] : null)}
                leftSection={<IconCalendar size={16} />}
                required
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
              <DateInput
                label="Expiration Date"
                placeholder="Select Date"
                value={formExpiredDate ? new Date(formExpiredDate) : null}
                onChange={(d: any) => setFormExpiredDate(d ? d.toISOString().split('T')[0] : null)}
                leftSection={<IconCalendar size={16} />}
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                styles={{
                  input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
                }}
              />
            </Group>

            <Textarea
              label="Physical Condition / Cargo Notes"
              placeholder="Enter arrival condition remarks (e.g. seal is secure, container temperature is 18°C...)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.currentTarget.value)}
              minRows={3}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' }
              }}
            />

            <Divider my="xs" />

            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>ESTIMATED TOTAL COST</Text>
                <Text size="lg" fw={800} c="var(--ds-primary, #1e5b3a)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  Rp {formTotalPrice.toLocaleString('id-ID')}
                </Text>
              </div>
              <Group>
                <Button variant="outline" color="gray" onClick={() => setOpened(false)} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cancel</Button>
                <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  Save Intake
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

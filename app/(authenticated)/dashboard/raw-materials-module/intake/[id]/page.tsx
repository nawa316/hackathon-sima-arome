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
  ThemeIcon,
  TextInput,
  Select,
  Modal,
  NumberInput,
  Textarea,
  ActionIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconShieldCheck,
  IconShieldX,
  IconHourglass,
  IconBuildingWarehouse,
  IconPackage,
  IconCalendar,
  IconEdit,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { logAuditTrail } from '@/lib/api/audit';
import type { RawMaterial, Supplier, Offer, ProductSupplier, QualityControl, Warehouse, User } from '@/types/sima-arome';
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

export default function RawMaterialIntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const [moduleTitle, setModuleTitle] = useState('Intake Details');
  useSetModuleTitle(moduleTitle);

  // Detail States
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [supplierName, setSupplierName] = useState('Unknown Supplier');
  const [warehouseName, setWarehouseName] = useState('Unknown Warehouse');
  const [receiverName, setReceiverName] = useState('System Receiver');
  const [qcRecord, setQcRecord] = useState<QualityControl | null>(null);
  const [inspectorName, setInspectorName] = useState('QC Inspector');

  // Supporting Dropdown Lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Edit Modal States
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Form Fields
  const [formIntakeNumber, setFormIntakeNumber] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formProductSupplierId, setFormProductSupplierId] = useState<string>('');
  const [formOfferId, setFormOfferId] = useState<string>('');
  const [formBatchCode, setFormBatchCode] = useState('');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formCategory, setFormCategory] = useState('Essential Oil');
  const [formWeightKg, setFormWeightKg] = useState<number>(50);
  const [formUnit, setFormUnit] = useState('kg');
  const [formReceivedAt, setFormReceivedAt] = useState<string | null>(null);
  const [formExpiredDate, setFormExpiredDate] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState<string>('');
  const [formTotalPrice, setFormTotalPrice] = useState<number>(0);

  const fetchDetail = async () => {
    try {
      setLoading(true);

      // 1. Fetch auxiliary lists for relationships & dropdowns
      const [supData, offersData, psData, whData] = await Promise.all([
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<Offer>('offers'),
        daasAPI.getItems<ProductSupplier>('product_suppliers'),
        daasAPI.getItems<Warehouse>('warehouses'),
      ]);

      const loadedSuppliers = Array.isArray(supData) ? supData : [];
      const loadedOffers = Array.isArray(offersData) ? offersData : [];
      const loadedProductSuppliers = Array.isArray(psData) ? psData : [];
      const loadedWarehouses = Array.isArray(whData) ? whData : [];

      setSuppliers(loadedSuppliers);
      setOffers(loadedOffers);
      setProductSuppliers(loadedProductSuppliers);
      setWarehouses(loadedWarehouses);

      // 2. Fetch raw material
      const mat = await daasAPI.getItem<RawMaterial>('raw_materials', id);
      if (!mat) return;
      setMaterial(mat);
      setModuleTitle(mat.intake_number ? `Intake: ${mat.intake_number}` : 'Intake Details');

      // 3. Resolve Supplier Name
      let sId = mat.supplier_id;
      if (!sId && mat.offer_id) {
        const foundOffer = loadedOffers.find(o => o.id === mat.offer_id);
        if (foundOffer) sId = foundOffer.supplier_id;
      }
      if (sId) {
        const foundSupplier = loadedSuppliers.find(s => s.id === sId);
        if (foundSupplier) {
          setSupplierName(foundSupplier.name);
        } else {
          setSupplierName('Unknown Supplier');
        }
      } else {
        setSupplierName('Unknown Supplier');
      }

      // 4. Resolve Material Name via product catalog (product_suppliers) if possible
      let matName = mat.material_name;
      if (mat.offer_id) {
        const foundOffer = loadedOffers.find(o => o.id === mat.offer_id);
        if (foundOffer && foundOffer.product_supplier_id) {
          const foundPS = loadedProductSuppliers.find(ps => ps.id === foundOffer.product_supplier_id);
          if (foundPS) matName = foundPS.name;
        }
      }
      if (matName) {
        mat.material_name = matName;
      }

      // 5. Fetch Warehouse Name
      if (mat.warehouse_id) {
        const foundWh = loadedWarehouses.find(w => w.id === mat.warehouse_id);
        if (foundWh) {
          setWarehouseName(foundWh.name);
        } else {
          setWarehouseName('Unknown Warehouse');
        }
      } else {
        setWarehouseName('Unknown Warehouse');
      }

      // 6. Fetch Receiver (Procurement User)
      if (mat.received_by) {
        try {
          const rec = await daasAPI.getItem<User>('daas_users', mat.received_by);
          if (rec) {
            const fullName = [rec.fullname || (rec as any).first_name, (rec as any).last_name].filter(Boolean).join(' ');
            setReceiverName(fullName || rec.email);
          }
        } catch (err) {
          console.warn('Failed to fetch receiver profile:', err);
        }
      }

      // 7. Fetch related QC Record if exists
      try {
        const qcResults = await daasAPI.getItems<QualityControl>('quality_control', {
          filter: { raw_material_id: { _eq: id } },
          limit: 1,
        });

        if (qcResults && qcResults.length > 0) {
          const qc = qcResults[0];
          setQcRecord(qc);

          // Fetch inspector profile
          if (qc.checked_by) {
            try {
              const inspector = await daasAPI.getItem<User>('daas_users', qc.checked_by);
              if (inspector) {
                const fullName = [inspector.fullname || (inspector as any).first_name, (inspector as any).last_name].filter(Boolean).join(' ');
                setInspectorName(fullName || inspector.email);
              }
            } catch (err) {
              console.warn('Failed to fetch inspector details:', err);
            }
          }
        } else {
          setQcRecord(null);
        }
      } catch (qcErr) {
        console.warn('No QC record found:', qcErr);
      }
    } catch (err) {
      console.error('Error loading detail page:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load raw material details.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Maps & Select filter logic
  const productSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    productSuppliers.forEach(p => map.set(p.id, p.name));
    return map;
  }, [productSuppliers]);

  // Master catalog options for Offered Material dropdown
  const catalogOptions = React.useMemo(() => {
    return productSuppliers.map(ps => ({
      value: ps.id,
      label: `${ps.name} (Rp ${ps.price.toLocaleString('id-ID')}/${ps.unit})`,
      price: ps.price,
      name: ps.name
    }));
  }, [productSuppliers]);

  const handleOpenEditModal = () => {
    if (!material) return;
    setFormIntakeNumber(material.intake_number || '');
    setFormSupplierId(material.supplier_id || '');
    setFormOfferId(material.offer_id || '');
    setFormBatchCode(material.batch_code || '');
    setFormMaterialName(material.material_name || '');
    setFormCategory(material.category || 'Essential Oil');
    setFormWeightKg(material.weight_kg);
    setFormUnit(material.unit || 'kg');
    setFormReceivedAt(material.received_at ? new Date(material.received_at).toISOString().split('T')[0] : null);
    setFormExpiredDate(material.expired_date ? new Date(material.expired_date).toISOString().split('T')[0] : null);
    setFormNotes(material.notes || '');
    setFormWarehouseId(material.warehouse_id || '');
    setFormTotalPrice(material.total_price || 0);

    // Resolve formProductSupplierId when opening edit modal
    let psId = '';
    if (material.offer_id) {
      const foundOffer = offers.find(o => o.id === material.offer_id);
      if (foundOffer) psId = foundOffer.product_supplier_id;
    }
    if (!psId && material.material_name) {
      const foundPS = productSuppliers.find(ps => ps.name === material.material_name);
      if (foundPS) psId = foundPS.id;
    }
    setFormProductSupplierId(psId);

    setEditModalOpened(true);
  };

  const handleCatalogChange = (prodId: string | null) => {
    if (!prodId) {
      setFormProductSupplierId('');
      setFormOfferId('');
      setFormMaterialName('');
      setFormTotalPrice(0);
      return;
    }

    setFormProductSupplierId(prodId);
    
    // Find if there is an existing negotiated Offer for this supplier and product
    const foundOffer = offers.find(o => o.supplier_id === formSupplierId && o.product_supplier_id === prodId);
    const prod = productSuppliers.find(p => p.id === prodId);
    
    if (foundOffer) {
      setFormOfferId(foundOffer.id);
      setFormMaterialName(prod ? prod.name : 'Raw Material');
      setFormTotalPrice(foundOffer.price * formWeightKg);
    } else {
      setFormOfferId(''); // Null if no customized offer
      setFormMaterialName(prod ? prod.name : 'Raw Material');
      setFormTotalPrice((prod ? prod.price : 0) * formWeightKg);
    }
  };

  const handleWeightChange = (val: number | string) => {
    const qty = Number(val) || 0;
    setFormWeightKg(qty);
    
    const foundOffer = offers.find(o => o.supplier_id === formSupplierId && o.product_supplier_id === formProductSupplierId);
    const prod = productSuppliers.find(p => p.id === formProductSupplierId);
    
    if (foundOffer) {
      setFormTotalPrice(foundOffer.price * qty);
    } else if (prod) {
      setFormTotalPrice(prod.price * qty);
    } else {
      setFormTotalPrice(0);
    }
  };

  const handleUpdateIntake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSupplierId || !formProductSupplierId || !formBatchCode || !formWarehouseId) {
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
        offer_id: formOfferId || null,
        warehouse_id: formWarehouseId,
        intake_number: formIntakeNumber,
        batch_code: formBatchCode,
        material_name: formMaterialName,
        category: formCategory,
        weight_kg: formWeightKg,
        unit: formUnit,
        received_at: formReceivedAt ? new Date(formReceivedAt).toISOString() : new Date().toISOString(),
        expired_date: formExpiredDate ? new Date(formExpiredDate).toISOString() : null,
        notes: formNotes,
        total_price: formTotalPrice,
      };

      await daasAPI.updateItem('raw_materials', id, payload);

      // Log Audit Trail
      await logAuditTrail(
        'Raw Material Intake Updated',
        'raw_materials',
        id,
        JSON.stringify(material),
        `Updated raw material intake ${formMaterialName} with number ${formIntakeNumber}`
      );

      notifications.show({
        title: 'Successfully Updated',
        message: `Intake record ${formIntakeNumber} has been updated.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      setEditModalOpened(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Update Failed',
        message: 'A system error occurred while updating intake data.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIntake = async () => {
    if (!window.confirm(`Are you sure you want to delete intake transaction "${material?.intake_number}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      // Log Audit Trail
      await logAuditTrail(
        'Raw Material Intake Deleted',
        'raw_materials',
        id,
        JSON.stringify(material),
        `Deleted raw material intake transaction ${material?.material_name} (${material?.intake_number})`
      );

      await daasAPI.deleteItem('raw_materials', id);

      notifications.show({
        title: 'Intake Deleted',
        message: `Intake transaction "${material?.intake_number}" has been successfully deleted.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      router.push('/dashboard/raw-materials-module/intake');
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Deletion Failed',
        message: 'Failed to delete the intake transaction.',
        color: 'red'
      });
      setLoading(false);
    }
  };

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/raw-materials-module' },
    { title: 'Intake Logs', href: '/dashboard/raw-materials-module/intake' },
    { title: material?.intake_number || 'Details', href: `/dashboard/raw-materials-module/intake/${id}` },
  ].map((item, index) => (
    <Anchor component={Link} href={item.href} key={index} style={{ fontSize: 'var(--ds-font-size-xs)' }}>
      {item.title}
    </Anchor>
  ));

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '300px' }}>
          <Loader size="lg" color="emerald" />
          <Text c="dimmed">Loading batch arrival details...</Text>
        </Stack>
      </Container>
    );
  }

  if (!material) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Raw material intake transaction with ID {id} was not found in the system.
        </Notification>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navigation & Breadcrumbs */}
        <Group justify="space-between">
          <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          <Button
            component={Link}
            href="/dashboard/raw-materials-module/intake"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            color="gray"
          >
            Back to List
          </Button>
        </Group>

        {/* Header Title */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Intake: {formatFallbackValue(material.intake_number)}
            </Title>
            <Text c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Incoming logistics transaction and material quality qualification check</Text>
          </div>
          <Group gap="sm">
            <Badge
              size="lg"
              variant="filled"
              color={
                material.status === 'PENDING_QC'
                  ? 'orange'
                  : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                    ? 'teal'
                    : 'red'
              }
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              {material.status === 'PENDING_QC'
                ? 'Pending QC'
                : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                  ? 'QC Passed'
                  : 'QC Rejected'}
            </Badge>
            <Button
              leftSection={<IconEdit size={16} />}
              color="blue"
              onClick={handleOpenEditModal}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Edit Intake
            </Button>
            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="outline"
              onClick={handleDeleteIntake}
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              Delete Intake
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left: General Info Card */}
          <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
            <Group gap="xs" mb="sm">
              <IconPackage size={20} color="#1e5b3a" />
              <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: '#1e5b3a' }}>
                Material Intake Information
              </Title>
            </Group>
            <Divider mb="lg" />

            <SimpleGrid cols={2} spacing="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>INTAKE NUMBER</Text>
                <Text fw={700} size="md" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(material.intake_number)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>RAW MATERIAL NAME</Text>
                <Text fw={600} size="md" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(material.material_name)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>MATERIAL CATEGORY</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(material.category || 'Essential Oil')}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>SUPPLIER BATCH NUMBER</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(material.batch_code)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>SUPPLIER</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(supplierName)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>INCOMING VOLUME</Text>
                <Text fw={700} size="md" c="#e67700" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{material.weight_kg} {formatFallbackValue(material.unit || 'kg')}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>ARRIVAL DATE</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  {new Date(material.received_at).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>EXPIRATION DATE</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  {material.expired_date
                    ? new Date(material.expired_date).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : formatFallbackValue(null)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>ALLOCATED WAREHOUSE</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(warehouseName)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>RECEIVED BY</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{formatFallbackValue(receiverName)}</Text>
              </div>
            </SimpleGrid>

            <Divider my="md" />

            <div>
              <Text size="xs" c="dimmed" fw={700} mb={4} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>LOGISTICS / CARGO CONDITION NOTES</Text>
              <Paper p="sm" withBorder style={{ backgroundColor: '#f8f9fa', borderRadius: 8, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  {material.notes || 'No specific notes recorded upon cargo intake.'}
                </Text>
              </Paper>
            </div>
          </Card>

          {/* Right: Quality Control (QC) Inspection Result Card */}
          <Stack gap="lg">
            {qcRecord ? (
              <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                <Group gap="xs" mb="sm">
                  {qcRecord.qc_status === 'PASSED' ? (
                    <IconShieldCheck size={24} color="#0ca678" />
                  ) : (
                    <IconShieldX size={24} color="#f03e3e" />
                  )}
                  <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: qcRecord.qc_status === 'PASSED' ? '#0ca678' : '#f03e3e' }}>
                    QC Laboratory Inspection Results
                  </Title>
                </Group>
                <Divider mb="lg" />

                <Stack gap="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  <SimpleGrid cols={2} spacing="md" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                    <div>
                      <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>QUALIFICATION DECISION</Text>
                      <Badge
                        variant="filled"
                        size="md"
                        color={qcRecord.qc_status === 'PASSED' ? 'teal' : 'red'}
                        mt={4}
                        style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
                      >
                        {qcRecord.qc_status === 'PASSED' ? 'QC Passed (PASSED)' : 'QC Rejected (FAILED)'}
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>INSPECTION DATE</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        {new Date(qcRecord.created_at).toLocaleString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>QC LAB INSPECTOR</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{inspectorName}</Text>
                    </div>
                  </SimpleGrid>

                  <Divider />

                  <div>
                    <Text size="xs" c="dimmed" fw={700} mb={4} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>INSPECTION FINDINGS & LAB ANALYSIS</Text>
                    <Paper p="sm" withBorder style={{ backgroundColor: qcRecord.qc_status === 'PASSED' ? '#f4faf6' : '#fff5f5', border: qcRecord.qc_status === 'PASSED' ? '1px solid #c2ffd8' : '1px solid #ffe3e3', borderRadius: 8 }}>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{qcRecord.qc_notes}</Text>
                    </Paper>
                  </div>
                </Stack>
              </Card>
            ) : (
              /* If no QC record has been generated yet, show locked lockbox card */
              <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#fff9db', borderColor: '#ffe066', display: 'flex', alignItems: 'center', justifycontent: 'center', minHeight: '320px' }}>
                <Stack align="center" gap="md" style={{ textAlign: 'center', maxWidth: '360px' }}>
                  <IconHourglass size={48} color="#f08c00" />
                  <Title order={3} c="#f08c00" style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)' }}>Awaiting QC Lab Testing</Title>
                  <Text size="sm" c="var(--ds-gray-700)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                    This raw material batch has **not yet been approved** by the Quality Control team.
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                    In accordance with ERP procedures: Raw materials cannot be allocated to formulation compounding machines until status changes to "QC Passed".
                  </Text>
                </Stack>
              </Card>
            )}

            {/* Warehouse Storage Zone Security Details */}
            <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              <Group gap="xs" mb="sm">
                <IconBuildingWarehouse size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader, sans-serif)', color: '#1e5b3a' }}>
                  Warehouse Storage Guidelines
                </Title>
              </Group>
              <Divider mb="lg" />
              <Stack gap="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>TEMPERATURE STANDARDS</Text>
                <Text size="sm" fw={600} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cold Storage Zone A (Target: 2°C - 5°C)</Text>
                <Text size="xs" c="dimmed" mt="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>MATERIAL HANDLING PROCEDURES</Text>
                <Text size="xs" c="var(--ds-gray-700)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  - Ensure packaging is placed on plastic pallets to prevent floor dampness.
                </Text>
                <Text size="xs" c="var(--ds-gray-700)" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  - Use First-In, First-Out (FIFO) method for material retrieval to prevent expired stocking.
                </Text>
              </Stack>
            </Card>
          </Stack>
        </SimpleGrid>
      </Stack>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Raw Material Intake"
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
        <form onSubmit={handleUpdateIntake}>
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
                setFormProductSupplierId('');
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
              data={catalogOptions}
              value={formProductSupplierId}
              onChange={handleCatalogChange}
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
              placeholder="Enter arrival remarks..."
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
                <Button variant="outline" color="gray" onClick={() => setEditModalOpened(false)} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Cancel</Button>
                <Button type="submit" color="blue" loading={submitting} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  Save Changes
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

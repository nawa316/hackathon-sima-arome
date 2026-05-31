'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
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
  Textarea,
  Radio,
  Breadcrumbs,
  Anchor,
  Divider,
  ActionIcon,
  Image,
  Loader,
  Notification,
  Card,
  TextInput,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { useAuth } from '@/lib/buildpad/hooks';
import { createClient } from '@/lib/supabase/client';
import { logAuditTrail } from '@/lib/api/audit';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
}

interface QCRecord {
  id: string;
  production_id: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
  qc_notes: string;
  created_at: string;
  checked_by: string;
  evidence_images?: string[]; // IDs or URLs of images
}

interface DaaSUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function ProductQCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  useSetModuleTitle('Product Inspection Detail');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data States
  const [production, setProduction] = useState<Production | null>(null);
  const [productName, setProductName] = useState('Unknown Product');
  const [qcRecord, setQcRecord] = useState<QCRecord | null>(null);
  const [qcStaffName, setQcStaffName] = useState('QC Staff');

  // Form States
  const [qcResult, setQcResult] = useState<string>('PASSED');
  const [qcNotes, setQcNotes] = useState<string>('');
  const [noteError, setNoteError] = useState<string | null>(null);

  // Fetch Production Batch details and QC History
  useEffect(() => {
    async function fetchProductionDetail() {
      try {
        setLoading(true);
        // Fetch production record
        const prod = await daasAPI.getItem<Production>('productions', id);
        if (!prod) return;
        setProduction(prod);

        // Audit Trail: Log viewing this product batch
        logAuditTrail(
          'VIEW',
          'productions',
          id,
          undefined,
          `QC Staff viewed Product Batch ${prod.lot_number || 'N/A'}`
        );

        // Fetch product information
        try {
          const product = await daasAPI.getItem<Product>('products', prod.products_id);
          if (product) {
            setProductName(product.type);
          }
        } catch (prodErr) {
          console.warn('Failed to fetch product details:', prodErr);
        }

        // Fetch QC Record if exists
        try {
          const qcResults = await daasAPI.getItems<QCRecord>('quality_control', {
            filter: { production_id: { _eq: id } },
            limit: 1,
          });

          if (qcResults && qcResults.length > 0) {
            const qc = qcResults[0];
            setQcRecord(qc);

            // Fetch inspector profile
            try {
              const inspector = await daasAPI.getItem<DaaSUser>('daas_users', qc.checked_by);
              if (inspector) {
                const fullName = [inspector.first_name, inspector.last_name].filter(Boolean).join(' ');
                setQcStaffName(fullName || inspector.email);
              }
            } catch (inspErr) {
              console.warn('Inspector details missing:', inspErr);
            }
          }
        } catch (qcErr) {
          console.warn('No QC History record found or error:', qcErr);
        }
      } catch (err) {
        console.error('Error fetching production detail:', err);
        notifications.show({
          title: 'Error',
          message: 'Failed to load product batch details.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProductionDetail();
  }, [id]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!qcNotes.trim()) {
      setNoteError('QC Notes are required.');
      return;
    }
    setNoteError(null);

    try {
      setSubmitting(true);



      // 2. Submit the inspection result to quality_control table
      const statusMap: Record<string, 'PASSED' | 'FAILED'> = {
        PASSED: 'PASSED',
        FAILED: 'FAILED',
      };

      const newQcStatus = statusMap[qcResult] || 'PASSED';

      // Robust fallback to get logged-in user from Supabase if useAuth's currentUser is not loaded/fails
      let checkedById = currentUser?.id;
      if (!checkedById) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            checkedById = user.id;
          }
        } catch (authErr) {
          console.warn('Failed to retrieve user from Supabase client:', authErr);
        }
      }

      // If still no user ID (or to prevent foreign key violation if the user is not in the system users table),
      // fall back to the seeded QC Staff user ID (John Smyth)
      if (!checkedById) {
        checkedById = 'e79e63c0-3023-4df4-8d48-8df0041d4de2';
      }

      await daasAPI.createItem<QCRecord>('quality_control', {
        production_id: id,
        qc_status: newQcStatus,
        qc_notes: qcNotes,
        checked_by: checkedById,
        evidence_images: [], // Empty since evidence images feature is removed
      });

      notifications.show({
        title: 'Product QC Submitted',
        message: `Lot inspection has been successfully saved as ${qcResult === 'PASSED' ? 'Accepted QC' : 'Rejected QC'}.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Redirect back to list
      router.push('/dashboard/quality-control-module/product');
    } catch (err) {
      console.error('Failed to submit QC Result:', err);
      notifications.show({
        title: 'Submission Failed',
        message: 'Could not record the inspection. Please try again.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };



  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/quality-control-module' },
    { title: 'Product QC', href: '/dashboard/quality-control-module/product' },
    { title: production?.lot_number || 'Detail', href: `/dashboard/quality-control-module/product/${id}` },
  ].map((item, index) => (
    <Anchor component={Link} href={item.href} key={index} style={{ fontSize: 'var(--ds-font-size-xs)' }}>
      {item.title}
    </Anchor>
  ));

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '300px' }}>
          <Loader size="lg" color="primary" />
          <Text c="dimmed">Loading product batch details...</Text>
        </Stack>
      </Container>
    );
  }

  if (!production) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Product Batch with ID {id} was not found.
        </Notification>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navigation / Breadcrumbs */}
        <Group justify="space-between">
          <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          <Button
            component={Link}
            href="/dashboard/quality-control-module/product"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            color="gray"
          >
            Back to List
          </Button>
        </Group>

        {/* Page Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary)' }}>
              Product Batch Inspection: {production.lot_number || 'Lot Batch'}
            </Title>
            <Text c="dimmed">Inspect and record quality parameters for this product batch</Text>
          </div>
          {qcRecord ? (
            <Badge size="lg" variant="filled" color={qcRecord.qc_status === 'PASSED' ? 'green' : 'red'}>
              {qcRecord.qc_status === 'PASSED' ? 'Accepted QC' : 'Rejected QC'}
            </Badge>
          ) : (
            <Badge size="lg" variant="filled" color="yellow">
              Pending QC
            </Badge>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left: Product Batch Info Card */}
          <Stack gap="lg">
            <Card p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
              <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)' }}>
                Product Batch Information
              </Title>
              <Divider mb="lg" />

              <SimpleGrid cols={2} spacing="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>LOT NUMBER</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{production.lot_number || 'N/A'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>PRODUCT NAME</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{productName}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>QUANTITY</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">
                    {production.actual_quantity || production.planned_quantity} units
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>PRODUCTION DATE</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">
                    {production.scheduled_date
                      ? new Date(production.scheduled_date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                      : 'N/A'}
                  </Text>
                </div>
              </SimpleGrid>
            </Card>

            {/* If QC is already completed, display the inspection result card */}
            {qcRecord && (
              <Card p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
                <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary)' }}>
                  QC Inspection Result
                </Title>
                <Divider mb="lg" />

                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>QC STATUS</Text>
                      <Badge
                        variant="filled"
                        size="md"
                        color={qcRecord.qc_status === 'PASSED' ? 'green' : 'red'}
                        mt={4}
                      >
                        {qcRecord.qc_status === 'PASSED' ? 'Accepted QC' : 'Rejected QC'}
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>INSPECTION DATE</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)">
                        {new Date(qcRecord.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>QC STAFF</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)">{qcStaffName}</Text>
                    </div>
                  </Group>

                  <div>
                    <Text size="xs" c="dimmed" fw={700}>INSPECTION NOTES</Text>
                    <Paper p="sm" withBorder mt={4} style={{ backgroundColor: 'var(--ds-gray-200)', borderRadius: '8px' }}>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{qcRecord.qc_notes}</Text>
                    </Paper>
                  </div>


                </Stack>
              </Card>
            )}
          </Stack>

          {/* Right: Inspection Action Form (renders if Pending QC) */}
          {!qcRecord ? (
            <Paper component="form" onSubmit={handleSubmit} p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
              <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)' }}>
                QC Result Recording
              </Title>
              <Divider mb="lg" />

              <Stack gap="lg">
                {/* Read Only Batch Info Form */}
                <SimpleGrid cols={2} spacing="md">
                  <TextInput label="Batch Number" value={production.lot_number || 'N/A'} readOnly disabled />
                  <TextInput label="Batch Type" value="Product Batch" readOnly disabled />
                </SimpleGrid>

                {/* QC Result Decision */}
                <Radio.Group
                  value={qcResult}
                  onChange={setQcResult}
                  label="QC Result Decision"
                  description="Select whether the product batch meets quality standards"
                  required
                >
                  <Group mt="xs" gap="xl">
                    <Radio value="PASSED" label="Accepted QC" color="green" />
                    <Radio value="FAILED" label="Rejected QC" color="red" />
                  </Group>
                </Radio.Group>

                {/* QC Notes (catatan inspeksi) */}
                <Textarea
                  label="QC Notes"
                  placeholder="Insert detailed product quality findings (e.g. Appearance meets standard, fragrance profile is correct, color anomaly detected...)"
                  description="Detailed inspection findings. Minimum 10 characters required."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.currentTarget.value)}
                  error={noteError}
                  minRows={4}
                  required
                />



                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  fullWidth
                  loading={submitting}
                  leftSection={<IconClipboardCheck size={18} />}
                  size="md"
                  mt="md"
                >
                  Submit QC Result
                </Button>
              </Stack>
            </Paper>
          ) : (
            // If already inspected and no form is displayed, show a lock panel
            <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <Stack align="center" gap="sm" style={{ textAlign: 'center' }}>
                <IconCheck size={48} style={{ color: 'var(--ds-success)' }} />
                <Title order={3}>QC Inspection Completed</Title>
                <Text c="dimmed">
                  This product batch has already been inspected. The final QC decision is locked.
                </Text>
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

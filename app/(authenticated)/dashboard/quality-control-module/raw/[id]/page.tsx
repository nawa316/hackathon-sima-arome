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
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import {
  IconArrowLeft,
  IconUpload,
  IconPhoto,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { useAuth } from '@/lib/buildpad/hooks';
import { logAuditTrail } from '@/lib/api/audit';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@mantine/dropzone/styles.css';

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

interface QCRecord {
  id: string;
  raw_material_id: string;
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

export default function RawMaterialQCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  useSetModuleTitle('Batch Inspection Detail');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data States
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [supplierName, setSupplierName] = useState('Unknown Supplier');
  const [qcRecord, setQcRecord] = useState<QCRecord | null>(null);
  const [qcStaffName, setQcStaffName] = useState('QC Staff');

  // Form States
  const [qcResult, setQcResult] = useState<string>('PASSED');
  const [qcNotes, setQcNotes] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<FileWithPath[]>([]);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Fetch Batch details and QC History
  useEffect(() => {
    async function fetchBatchDetail() {
      try {
        setLoading(true);
        // Fetch raw material
        const mat = await daasAPI.getItem<RawMaterial>('raw_materials', id);
        if (!mat) return;
        setMaterial(mat);

        // Audit Trail: Log viewing this batch
        logAuditTrail('VIEW', 'raw_materials', id, undefined, `QC Staff viewed Batch ${mat.batch_code}`);

        // Fetch supplier mapping via offer
        try {
          const offer = await daasAPI.getItem<Offer>('offers', mat.offer_id);
          if (offer) {
            const supplier = await daasAPI.getItem<Supplier>('suppliers', offer.supplier_id);
            if (supplier) {
              setSupplierName(supplier.name);
            }
          }
        } catch (offerErr) {
          console.warn('Failed to fetch supplier details:', offerErr);
        }

        // Fetch QC Record if exists
        try {
          const qcResults = await daasAPI.getItems<QCRecord>('quality_control', {
            filter: { raw_material_id: { _eq: id } },
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
        console.error('Error fetching batch detail:', err);
        notifications.show({
          title: 'Error',
          message: 'Failed to load raw material batch details.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBatchDetail();
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

      let imageIds: string[] = [];

      // 1. Upload evidence images to DaaS storage if any files selected
      if (evidenceFiles.length > 0) {
        try {
          const uploaded = await daasAPI.uploadFiles(evidenceFiles, {
            folder: 'qc_evidence',
          });
          imageIds = uploaded.map((f) => f.id);
        } catch (uploadErr) {
          console.error('Failed to upload evidence images:', uploadErr);
          notifications.show({
            title: 'Upload Failed',
            message: 'Failed to upload inspection evidence images. Proceeding without photos.',
            color: 'orange',
          });
        }
      }

      // 2. Submit the inspection result to the quality_control table
      const statusMap: Record<string, 'PASSED' | 'FAILED'> = {
        PASSED: 'PASSED',
        FAILED: 'FAILED',
      };

      const newQcStatus = statusMap[qcResult] || 'PASSED';

      const newQcRecord = await daasAPI.createItem<QCRecord>('quality_control', {
        raw_material_id: id,
        qc_status: newQcStatus,
        qc_notes: qcNotes,
        checked_by: currentUser?.id || '',
        evidence_images: imageIds, // JSONB array of file IDs
      });

      // 3. Update the raw material batch status
      const newBatchStatus = qcResult === 'PASSED' ? 'QC_ACCEPTED' : 'QC_REJECTED';
      await daasAPI.updateItem('raw_materials', id, {
        status: newBatchStatus,
      });

      notifications.show({
        title: 'QC Submitted Successfully',
        message: `Batch status has been successfully updated to ${qcResult === 'PASSED' ? 'Accepted QC' : 'Rejected QC'}.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Redirect back to list
      router.push('/dashboard/quality-control-module/raw');
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

  // Files management
  const handleDrop = (files: FileWithPath[]) => {
    setEvidenceFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/quality-control-module' },
    { title: 'Raw Material QC', href: '/dashboard/quality-control-module/raw' },
    { title: material?.batch_code || 'Detail', href: `/dashboard/quality-control-module/raw/${id}` },
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
          <Text c="dimmed">Loading batch details...</Text>
        </Stack>
      </Container>
    );
  }

  if (!material) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Raw Material Batch with ID {id} was not found.
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
            href="/dashboard/quality-control-module/raw"
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
              Batch Inspection: {material.batch_code}
            </Title>
            <Text c="dimmed">Inspect and record quality parameters for this raw material</Text>
          </div>
          <Badge
            size="lg"
            variant="filled"
            color={
              material.status === 'PENDING_QC'
                ? 'yellow'
                : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                  ? 'green'
                  : 'red'
            }
          >
            {material.status === 'PENDING_QC'
              ? 'Pending QC'
              : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                ? 'Accepted QC'
                : 'Rejected QC'}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left: Batch Info Card */}
          <Stack gap="lg">
            <Card p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
              <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)' }}>
                Raw Material Information
              </Title>
              <Divider mb="lg" />

              <SimpleGrid cols={2} spacing="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>BATCH NUMBER</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{material.batch_code}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>MATERIAL NAME</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{material.material_name}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>SUPPLIER</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{supplierName}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>QUANTITY</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">{material.weight_kg} kg</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={700}>RECEIVED DATE</Text>
                  <Text fw={600} size="md" c="var(--ds-gray-800)">
                    {new Date(material.received_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
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

                  {qcRecord.evidence_images && qcRecord.evidence_images.length > 0 && (
                    <div>
                      <Text size="xs" c="dimmed" fw={700} mb="xs">EVIDENCE IMAGES</Text>
                      <SimpleGrid cols={3} spacing="xs">
                        {qcRecord.evidence_images.map((imgId, idx) => (
                          <Paper key={idx} withBorder radius="md" style={{ overflow: 'hidden', height: '100px' }}>
                            <Image
                              src={daasAPI.getFileUrl(imgId, { width: 300, height: 300, quality: 80 })}
                              alt={`Evidence ${idx + 1}`}
                              height={100}
                              fit="cover"
                            />
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </div>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>

          {/* Right: Inspection Action Form (renders if Pending QC) */}
          {!qcRecord && material.status === 'PENDING_QC' ? (
            <Paper component="form" onSubmit={handleSubmit} p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)' }}>
              <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)' }}>
                QC Result Recording
              </Title>
              <Divider mb="lg" />

              <Stack gap="lg">
                {/* Read Only Batch Info Form */}
                <SimpleGrid cols={2} spacing="md">
                  <TextInput label="Batch Number" value={material.batch_code} readOnly disabled />
                  <TextInput label="Batch Type" value="Raw Material" readOnly disabled />
                </SimpleGrid>

                {/* QC Result Decision */}
                <Radio.Group
                  value={qcResult}
                  onChange={setQcResult}
                  label="QC Result Decision"
                  description="Select whether the batch meets quality standards"
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
                  placeholder="Insert detailed condition findings (e.g. Packaging condition is acceptable, meets quality standards, color does not match standard...)"
                  description="Detailed inspection findings. Minimum 10 characters required."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.currentTarget.value)}
                  error={noteError}
                  minRows={4}
                  required
                />

                {/* Image Upload Dropzone */}
                <div>
                  <Text size="sm" fw={600} mb={4}>
                    Evidence Images (JPG, PNG)
                  </Text>
                  <Text size="xs" c="dimmed" mb={8}>
                    Provide one or multiple files as inspection evidence for future AI visual defect model.
                  </Text>

                  <Dropzone
                    onDrop={handleDrop}
                    accept={IMAGE_MIME_TYPE}
                    maxSize={5 * 1024 * 1024} // 5MB max
                    radius="md"
                    styles={{
                      root: {
                        border: '2px dashed var(--ds-gray-400)',
                        backgroundColor: 'var(--ds-gray-200)',
                        '&:hover': {
                          backgroundColor: 'var(--ds-gray-300)',
                        },
                      },
                    }}
                  >
                    <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                      <Dropzone.Accept>
                        <IconUpload size={40} stroke={1.5} color="var(--ds-primary)" />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <IconX size={40} stroke={1.5} color="var(--ds-danger)" />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <IconPhoto size={40} stroke={1.5} color="var(--ds-gray-500)" />
                      </Dropzone.Idle>

                      <div>
                        <Text size="sm" inline>
                          Drag images here or click to select files
                        </Text>
                        <Text size="xs" c="dimmed" inline mt={7}>
                          Upload up to 5 images, maximum 5MB per file
                        </Text>
                      </div>
                    </Group>
                  </Dropzone>


                  {/* Uploaded File Previews */}
                  {evidenceFiles.length > 0 && (
                    <SimpleGrid cols={4} spacing="xs" mt="md">
                      {evidenceFiles.map((file, index) => {
                        const imageUrl = URL.createObjectURL(file);
                        return (
                          <div key={index} style={{ position: 'relative', height: '80px' }}>
                            <Image
                              src={imageUrl}
                              alt={`Preview ${index}`}
                              height={80}
                              fit="cover"
                              radius="md"
                            />
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="filled"
                              style={{ position: 'absolute', top: 4, right: 4 }}
                              onClick={() => handleRemoveFile(index)}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </div>
                        );
                      })}
                    </SimpleGrid>
                  )}
                </div>

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
            // If already inspected and no form is displayed, show a prompt
            <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--ds-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <Stack align="center" gap="sm" style={{ textAlign: 'center' }}>
                <IconCheck size={48} style={{ color: 'var(--ds-success)' }} />
                <Title order={3}>QC Inspection Completed</Title>
                <Text c="dimmed">
                  This raw material batch has already been inspected. The final QC decision is locked.
                </Text>
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

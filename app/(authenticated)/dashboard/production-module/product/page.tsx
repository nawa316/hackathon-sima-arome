'use client';

import { useState, useCallback } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Loader,
  Center,
  Paper,
  Tooltip,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconSearch,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types/collections';
import { usePaginatedProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from './hooks';

/**
 * Products List Page
 * CRUD untuk data produk
 */
export default function ProductsPage() {
  useSetModuleTitle('Productions Module');

  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const { products, loading, refetch } = usePaginatedProducts(search);
  const { create, loading: creating } = useCreateProduct();
  const { update, loading: updating } = useUpdateProduct();
  const { remove, loading: deleting } = useDeleteProduct();

  const handleCreate = useCallback(async (data: CreateProductRequest) => {
    await create(data);
    closeCreate();
    refetch();
    notifications.show({ title: 'Success', message: 'Product created successfully', color: 'teal' });
  }, [create, closeCreate, refetch]);

  const handleEdit = useCallback(async (data: UpdateProductRequest) => {
    if (!editTarget) return;
    await update(editTarget.id, data);
    closeEdit();
    refetch();
    notifications.show({ title: 'Success', message: 'Product updated successfully', color: 'teal' });
  }, [update, editTarget, closeEdit, refetch]);


  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    closeDelete();
    refetch();
    setDeleteTarget(null);
    notifications.show({ title: 'Deleted', message: 'Product deleted successfully', color: 'red' });
  }, [remove, deleteTarget, closeDelete, refetch]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Products</Title>
            <Text c="dimmed" size="sm">Manage your product catalog and recipes</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Add Product
          </Button>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search by type or category..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={400}
        />

        {/* Table */}
        <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
          {loading ? (
            <Center py="xl"><Loader /></Center>
          ) : products.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed">No products found.</Text>
                <Button variant="light" size="xs" onClick={openCreate}>Add your first product</Button>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Categories</Table.Th>
                  <Table.Th>Price</Table.Th>
                  <Table.Th style={{ width: 120 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((product: Product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>
                      <Text fw={500}>{product.type}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="teal">{product.categories}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text>Rp {product.price.toLocaleString('id-ID')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View detail & recipes">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => router.push(`/dashboard/production-module/product/${product.id}`)}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit product">
                          <ActionIcon
                            variant="light"
                            color="yellow"
                            size="sm"
                            onClick={() => {
                              setEditTarget(product);
                              openEdit();
                            }}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete product">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget(product);
                              openDelete();
                            }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* Create Modal */}
      <ProductCreateModal
        opened={createOpened}
        onClose={closeCreate}
        onSubmit={handleCreate}
        loading={creating}
      />

      {/* Edit Modal */}
      <ProductEditModal
        key={editTarget?.id ?? 'edit'}
        opened={editOpened}
        onClose={closeEdit}
        onSubmit={handleEdit}
        loading={updating}
        initialValues={editTarget ?? undefined}
      />

      {/* Delete Confirm Modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Product" centered size="sm">
        <Stack gap="md">
          <Text>Are you sure you want to delete <strong>{deleteTarget?.type}</strong>? This action cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// ────────────────────────────────────────────────────────────
// Product Form Modals
// ────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'Aromatic Chemical', label: 'Aromatic Chemical' },
  { value: 'Essential Oil', label: 'Essential Oil' },
  { value: 'Natural Extract', label: 'Natural Extract' },
];

function ProductCreateModal({
  opened,
  onClose,
  onSubmit,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductRequest) => void;
  loading: boolean;
}) {
  const [type, setType] = useState('');
  const [categories, setCategories] = useState('');
  const [price, setPrice] = useState<number | string>('');

  const handleSubmit = () => {
    if (!type || !categories || price === '') return;
    onSubmit({ type, categories, price: Number(price) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Product" centered>
      <Stack gap="md">
        <TextInput
          label="Product Type / Name"
          placeholder="e.g. Lavender Essential Oil"
          value={type}
          onChange={(e) => setType(e.currentTarget.value)}
          required
        />
        <Select
          label="Category"
          placeholder="Select category"
          data={CATEGORY_OPTIONS}
          value={categories}
          onChange={(val) => setCategories(val ?? '')}
          required
        />
        <NumberInput
          label="Price (Rp)"
          placeholder="e.g. 50000"
          value={price}
          onChange={setPrice}
          min={0}
          thousandSeparator="."
          decimalSeparator=","
          required
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add Product</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ProductEditModal({
  opened,
  onClose,
  onSubmit,
  loading,
  initialValues,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateProductRequest) => void;
  loading: boolean;
  initialValues?: Partial<Product>;
}) {
  const [type, setType] = useState(initialValues?.type ?? '');
  const [categories, setCategories] = useState(initialValues?.categories ?? '');
  const [price, setPrice] = useState<number | string>(initialValues?.price ?? '');

  const handleSubmit = () => {
    if (!type || !categories || price === '') return;
    onSubmit({ type, categories, price: Number(price) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Product" centered>
      <Stack gap="md">
        <TextInput
          label="Product Type / Name"
          placeholder="e.g. Lavender Essential Oil"
          value={type}
          onChange={(e) => setType(e.currentTarget.value)}
          required
        />
        <Select
          label="Category"
          placeholder="Select category"
          data={CATEGORY_OPTIONS}
          value={categories}
          onChange={(val) => setCategories(val ?? '')}
          required
        />
        <NumberInput
          label="Price (Rp)"
          placeholder="e.g. 50000"
          value={price}
          onChange={setPrice}
          min={0}
          thousandSeparator="."
          decimalSeparator=","
          required
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

'use client';

import { Container, Paper, SimpleGrid, Stack, Text, Title, Group, RingProgress, Button } from '@mantine/core';
import { IconTrendingUp, IconUsers, IconFileText } from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';

/**
 * Dashboard Main Page
 * Shows dashboard overview with key metrics
 */
export default function DashboardPage() {
  useSetModuleTitle('Dashboard');

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Hello, Essentials!</Title>
            <Text c="dimmed">Here's what's happening in your operations today</Text>
          </div>
          <Button variant="light">Generate Report</Button>
        </Group>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {/* Total Active Users */}
          <MetricCard
            title="Total Active Users"
            value="2,543"
            icon={<IconUsers size={20} />}
            change={12}
          />

          {/* Revenue */}
          <MetricCard
            title="Total Revenue"
            value="$45,231"
            icon={<IconTrendingUp size={20} />}
            change={8.5}
          />

          {/* Pending Tasks */}
          <MetricCard
            title="Pending Tasks"
            value="18"
            icon={<IconFileText size={20} />}
            change={-3}
          />

          {/* Conversion Rate */}
          <MetricCard
            title="Conversion Rate"
            value="3.24%"
            icon={<IconTrendingUp size={20} />}
            change={2.1}
          />
        </SimpleGrid>

        {/* Content Area */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <Title order={3}>Recent Activity</Title>
              <Text c="dimmed" size="sm">
                No recent activity to display. Try creating some tasks or inviting team members.
              </Text>
            </div>
            <Button variant="light" fullWidth>
              View Full Activity Log
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

/**
 * Reusable Metric Card Component
 */
function MetricCard({
  title,
  value,
  icon,
  change,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
}) {
  const isPositive = change >= 0;

  return (
    <Paper p="lg" radius="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Stack gap="sm" style={{ flex: 1 }}>
          <Text size="sm" fw={500} c="dimmed">
            {title}
          </Text>
          <Title order={3}>{value}</Title>
          <Text size="xs" c={isPositive ? 'teal' : 'red'}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}% from last month
          </Text>
        </Stack>
        <div style={{ opacity: 0.5 }}>{icon}</div>
      </Group>
    </Paper>
  );
}

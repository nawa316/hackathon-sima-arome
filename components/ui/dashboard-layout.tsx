'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';
import {
  AppShell,
  Group,
  Stack,
  Avatar,
  Menu,
  ActionIcon,
  Badge,
  ScrollArea,
  UnstyledButton,
  rem,
  Box,
} from '@mantine/core';
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import classes from './dashboard-layout.module.css';

/**
 * Menu item configuration for the sidebar
 */
export interface DashboardMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item */
  label: string;
  /** Icon component to display (React component or icon) */
  icon: React.ReactNode;
  /** Route path */
  href: string;
  /** Optional badge count/label */
  badge?: string | number;
  /** Whether this item is currently active */
  active?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * Props for DashboardLayout component
 */
export interface DashboardLayoutProps {
  /** The main content to display */
  children: ReactNode;
  /** Array of menu items for the sidebar */
  menuItems: DashboardMenuItem[];
  /** Title/brand name displayed in sidebar header */
  brandTitle?: string;
  /** Logo/icon component displayed in sidebar header */
  brandIcon?: React.ReactNode;
  /** Alternative: Logo image path */
  logoSrc?: string;
  /** User information for header profile section */
  userInfo?: {
    name: string;
    role?: string;
    avatar?: string;
  };
  /** Callback when a menu item is clicked */
  onMenuItemClick?: (item: DashboardMenuItem) => void;
  /** Callback when user logs out */
  onLogout?: () => void;
  /** Notification count badge */
  notificationCount?: number;
  /** Additional header actions */
  headerActions?: React.ReactNode;
  /** Module title shown on top bar (left side) */
  moduleTitle?: string;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Header height in pixels */
  headerHeight?: number;
  /** Option to hide the profile avatar */
  hideAvatar?: boolean;
}

/**
 * Menu Item Component
 */
function MenuItem({
  item,
  onItemClick,
}: {
  item: DashboardMenuItem;
  onItemClick: (item: DashboardMenuItem) => void;
}) {
  const handleClick = () => {
    item.onClick?.();
    onItemClick(item);
  };

  return (
    <div key={item.id}>
      <UnstyledButton
        onClick={handleClick}
        className={classes.menuItem}
        data-active={item.active}
        style={{ paddingLeft: '12px' }}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Box className={classes.menuIcon}>{item.icon}</Box>
            <span className={classes.menuLabel}>{item.label}</span>
          </Group>
          <Group gap={4} wrap="nowrap">
            {item.badge && (
              <Badge size="sm" variant="filled" color="rgba(255, 255, 255, 0.2)" radius="sm" style={{ fontWeight: 600 }}>
                {item.badge}
              </Badge>
            )}
          </Group>
        </Group>
      </UnstyledButton>
    </div>
  );
}

/**
 * DashboardLayout Component
 * A reusable dashboard layout with customizable sidebar menu and header
 */
export function DashboardLayout({
  children,
  menuItems,
  brandTitle = 'Dashboard',
  brandIcon,
  logoSrc,
  userInfo,
  onMenuItemClick,
  onLogout,
  notificationCount = 0,
  headerActions,
  moduleTitle,
  sidebarWidth = 280,
  headerHeight = 70,
  hideAvatar = false,
}: DashboardLayoutProps) {
  return (
    <AppShell
      navbar={{ width: sidebarWidth, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding={0}
    >
      {/* Sidebar */}
      <AppShell.Navbar className={classes.navbar}>
        {/* Brand Section */}
        <AppShell.Section className={classes.brandSection}>
          {logoSrc ? (
            <Box className={classes.brandLogo}>
              <Image
                src={logoSrc}
                alt={brandTitle}
                width={1200}
                height={420}
                priority
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </Box>
          ) : typeof brandIcon === 'string' ? (
            <Box className={classes.brandLogo}>
              <Image
                src={brandIcon}
                alt={brandTitle}
                width={1200}
                height={420}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </Box>
          ) : (
            <Box className={classes.brandLogo}>{brandIcon}</Box>
          )}
        </AppShell.Section>

        {/* Menu Items */}
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={0} className={classes.menuStack}>
            {menuItems.map((item) => (
              <MenuItem
                key={item.id}
                item={item}
                onItemClick={onMenuItemClick || (() => {})}
              />
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Box className={classes.header} style={{ height: rem(headerHeight) }}>
          <Group h="100%" px="md" w="100%">
            {moduleTitle && <div className={classes.moduleTitle}>{moduleTitle}</div>}
            <Group gap="lg" ml="auto">
              {headerActions}

              {/* Notifications */}
              <Box className={classes.notificationBell}>
                <ActionIcon
                  variant="light"
                  size="lg"
                  radius="md"
                  pos="relative"
                  style={{ overflow: 'visible' }}
                >
                  <IconBell size={20} />
                  {notificationCount > 0 && (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="red"
                      pos="absolute"
                      top={-8}
                      right={-8}
                      style={{ minWidth: '20px', display: 'flex', justifyContent: 'center', fontWeight: 600 }}
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </ActionIcon>
              </Box>

              {/* User Profile Menu */}
              {userInfo && (
                <Menu position="bottom-end" shadow="md">
                  <Menu.Target>
                    <Group gap="xs" style={{ cursor: 'pointer' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className={classes.userName}>{userInfo.name}</div>
                        {userInfo.role && (
                          <div className={classes.userRole}>{userInfo.role}</div>
                        )}
                      </div>
                      {!hideAvatar && (
                        <Avatar
                          src={userInfo.avatar}
                          alt={userInfo.name}
                          size="md"
                          radius="md"
                        />
                      )}
                      <IconChevronDown size={16} />
                    </Group>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconSettings size={14} />}
                    >
                      Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={14} />}
                      onClick={onLogout}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          </Group>
        </Box>

        <Box p="md">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default DashboardLayout;

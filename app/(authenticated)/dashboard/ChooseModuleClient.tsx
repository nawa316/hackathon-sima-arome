'use client';

import React from 'react';
import { Box, Paper, Stack, Text, Group, ThemeIcon } from '@mantine/core';
import { useRouter } from 'next/navigation';
import {
  IconShieldLock,
  IconBuildingWarehouse,
  IconFlask,
  IconLeaf,
  IconClipboardCheck,
  IconAlertCircle
} from '@tabler/icons-react';

interface ChooseModuleClientProps {
  displayName: string;
  allowedModuleCodes: string[];
  isSuperAdmin: boolean;
  errorMessage: string | null;
}

export default function ChooseModuleClient({
  displayName,
  allowedModuleCodes,
  isSuperAdmin,
  errorMessage,
}: ChooseModuleClientProps) {
  const router = useRouter();

  // All 5 core system modules
  const allModules = [
    {
      id: 'authenticator',
      permissionCode: 'authenticator',
      title: 'Authenticator',
      icon: <IconShieldLock size={32} stroke={1.5} />,
      href: '/dashboard/auth-module',
      description: 'Access roles, users, and system credentials',
    },
    {
      id: 'warehouse',
      permissionCode: 'warehouse',
      title: 'Warehouse',
      icon: <IconBuildingWarehouse size={32} stroke={1.5} />,
      href: '/dashboard/warehouse-module',
      description: 'Manage cold storage inventory & stocks',
    },
    {
      id: 'productions',
      permissionCode: 'productions',
      title: 'Productions',
      icon: <IconFlask size={32} stroke={1.5} />,
      href: '/dashboard/productions',
      description: 'Track compounding timeline & batching',
    },
    {
      id: 'raw-materials',
      permissionCode: 'raw_materials',
      title: 'Raw Materials',
      icon: <IconLeaf size={32} stroke={1.5} />,
      href: '/dashboard/raw-materials',
      description: 'Monitor procurement and formulas',
    },
    {
      id: 'quality-control',
      permissionCode: 'quality_control',
      title: 'Quality Control',
      icon: <IconClipboardCheck size={32} stroke={1.5} />,
      href: '/dashboard/quality-control',
      description: 'Verify raw materials & lots testing',
    }
  ];

  // Filter modules based on server-verified allowed permissions (or show all if Super Admin)
  const filteredModules = isSuperAdmin
    ? allModules
    : allModules.filter(mod =>
      allowedModuleCodes.includes(mod.permissionCode) ||
      allowedModuleCodes.includes(mod.id)
    );

  return (
    <>
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #F9F8F4 !important;
          overflow-x: hidden;
        }
        
        .module-page-container {
          min-height: 100vh;
          width: 100vw;
          background-image: url('/image/bg-essential-oil-hero.png');
          background-size: cover;
          background-position: center;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: auto;
        }

        .header-welcome-bar {
          background-color: var(--ds-primary, #1e5b3a);
          width: 100%;
          padding: 14px 24px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-welcome-text {
          color: #ffffff;
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: 1.5px;
          margin: 0;
          text-transform: uppercase;
        }

        .module-card {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ds-gray-300);
          box-shadow: var(--ds-shadow-md);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 230px;
          width: 100%;
          flex: 1 1 180px;
          max-width: 190px;
          min-width: 170px;
        }

        .module-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--ds-shadow-lg);
        }

        .module-card-header {
          background-color: var(--ds-primary-700, #143c26);
          width: 100%;
          padding: 12px;
          text-align: center;
        }

        .module-card-title {
          color: #ffffff;
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
          font-weight: 600;
          font-size: 0.95rem;
          margin: 0;
          text-align: center;
        }
        
        .philosophy-text {
          font-family: var(--ds-font-display, serif);
          color: #143c26;
          font-style: italic;
          font-size: 1.25rem;
          font-weight: 500;
          text-align: center;
        }
      `}</style>

      <Box className="module-page-container">
        {/* Header Bar */}
        <Box className="header-welcome-bar">
          <h2 className="header-welcome-text">
            WELCOME BACK, {displayName}!
          </h2>
        </Box>

        {/* Content Body */}
        <Stack align="center" justify="center" style={{ flex: 1, padding: '40px 20px', zIndex: 1 }} gap="xl">
          {/* Logo & Philosophy Quote */}
          <Stack align="center" gap="xs">
            <img
              src="/assets/images/logo-sima-arome.png"
              alt="Sima Arôme Logo"
              style={{ width: '320px', maxWidth: '100%', objectFit: 'contain' }}
            />
            <Text className="philosophy-text">
              The Natural Sense Creator
            </Text>
          </Stack>

          {/* White Card Container */}
          <Paper
            p={40}
            radius="lg"
            shadow="xl"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '1100px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {/* Title Banner */}
            <Stack align="center" gap="xs" mb="xl">
              <Box
                style={{
                  backgroundColor: 'var(--ds-primary, #1e5b3a)',
                  color: 'white',
                  borderRadius: '9999px',
                  padding: '10px 40px',
                  fontWeight: 'bold',
                  fontSize: '1.4rem',
                  textAlign: 'center',
                  fontFamily: 'var(--ds-font-subheader, sans-serif)',
                  boxShadow: '0 4px 10px rgba(30, 91, 58, 0.2)',
                  width: 'fit-content',
                }}
              >
                Choose Your Module
              </Box>
              <Text size="sm" c="dimmed" ta="center" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)', fontWeight: 500 }}>
                Please select the workspace you'd like to access.
              </Text>
            </Stack>

            {/* Error Message Fallback */}
            {errorMessage ? (
              <Stack align="center" gap="sm" py="xl" style={{ maxWidth: '480px' }}>
                <ThemeIcon size={48} radius="xl" color="red" variant="light">
                  <IconAlertCircle size={28} />
                </ThemeIcon>
                <Text fw={700} size="md" c="red" ta="center" style={{ fontFamily: "var(--ds-font-subheader, 'Montserrat', sans-serif)" }}>
                  Akses Terbatas
                </Text>
                <Text size="sm" c="dimmed" ta="center" style={{ fontFamily: "var(--ds-font-sans, 'Inter', sans-serif)", lineHeight: 1.5 }}>
                  {errorMessage}
                </Text>
              </Stack>
            ) : filteredModules.length === 0 ? (
              <Stack align="center" gap="sm" py="xl" style={{ maxWidth: '480px' }}>
                <ThemeIcon size={48} radius="xl" color="orange" variant="light">
                  <IconAlertCircle size={28} />
                </ThemeIcon>
                <Text fw={700} size="md" c="orange" ta="center" style={{ fontFamily: "var(--ds-font-subheader, 'Montserrat', sans-serif)" }}>
                  Akses Belum Ditemukan
                </Text>
                <Text size="sm" c="dimmed" ta="center" style={{ fontFamily: "var(--ds-font-sans, 'Inter', sans-serif)", lineHeight: 1.5 }}>
                  Anda belum memiliki akses ke modul mana pun. Silakan hubungi Super Admin.
                </Text>
              </Stack>
            ) : (
              /* Autosizing Proportional Flex Container (Centered and aesthetically perfect for < 5 cards) */
              <Group
                justify="center"
                align="stretch"
                gap="lg"
                style={{ width: '100%', display: 'flex', flexWrap: 'wrap' }}
              >
                {filteredModules.map((mod) => (
                  <Box
                    key={mod.id}
                    className="module-card"
                    onClick={() => router.push(mod.href)}
                  >
                    <Box className="module-card-header">
                      <h3 className="module-card-title">{mod.title}</h3>
                    </Box>
                    <Stack align="center" justify="center" gap="sm" style={{ flex: 1, padding: '20px 12px' }}>
                      <ThemeIcon
                        radius="xl"
                        size={64}
                        style={{
                          backgroundColor: 'var(--ds-primary-100, #ebf7f0)',
                          color: 'var(--ds-primary, #1e5b3a)',
                          boxShadow: '0 4px 10px rgba(30, 91, 58, 0.08)',
                        }}
                      >
                        {mod.icon}
                      </ThemeIcon>
                      <Text
                        size="xs"
                        c="dimmed"
                        ta="center"
                        style={{
                          fontFamily: "var(--ds-font-sans, 'Inter', sans-serif)",
                          lineHeight: 1.4,
                          fontWeight: 400
                        }}
                      >
                        {mod.description}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </Group>
            )}
          </Paper>
        </Stack>
      </Box>
    </>
  );
}

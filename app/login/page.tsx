/**
 * @buildpad-origin @buildpad/cli/api-routes/login-page
 * @buildpad-version 1.0.0
 *
 * This file was copied from Buildpad UI Packages.
 * To update, run: npx @buildpad/cli add api-routes/login-page --overwrite
 *
 * Docs: https://buildpad.dev/components/api-routes/login-page
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Box,
  Group,
  Anchor,
  Checkbox,
  Select,
  Grid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Layout View State: 'login' | 'forgot_step1' | 'forgot_step2' | 'forgot_step3'
  const [viewState, setViewState] = useState<'login' | 'forgot_step1' | 'forgot_step2' | 'forgot_step3'>('login');

  // Step 1 Form States
  const [fullname, setFullname] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [role, setRole] = useState<string | null>(null); // Initialized to null for active placeholder

  // Step 2 Form States
  const [verificationCode, setVerificationCode] = useState('');
  const [otpError, setOtpError] = useState('');

  // Step 3 Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (!value ? 'Email is required' : /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (!value ? 'Password is required' : null),
    },
  });

  // Load persisted credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sima_arome_login_email');
    const savedRememberMe = localStorage.getItem('sima_arome_login_remember');
    if (savedRememberMe === 'true' && savedEmail) {
      setRememberMe(true);
      form.setFieldValue('email', savedEmail);
    }
  }, []);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);

    try {
      // Use proxy endpoint — NOT calling Supabase directly
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include', // Include cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || 'Login failed');
      }

      // Handle remember me persistence
      if (rememberMe) {
        localStorage.setItem('sima_arome_login_email', values.email);
        localStorage.setItem('sima_arome_login_remember', 'true');
      } else {
        localStorage.removeItem('sima_arome_login_email');
        localStorage.removeItem('sima_arome_login_remember');
      }

      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // State Resets when returning to Login View
  const handleReturnToLogin = () => {
    setViewState('login');
    setFullname('');
    setEmailAddress('');
    setRole(null);
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpError('');
    setPasswordError('');
  };

  const handleStep1Submit = () => {
    if (!fullname || !emailAddress || !role) {
      notifications.show({
        title: 'Form Incomplete',
        message: 'Please fill in all fields to request a verification code.',
        color: 'orange',
      });
      return;
    }
    setViewState('forgot_step2');
  };

  const handleStep2Submit = () => {
    if (verificationCode === '100989') {
      setOtpError('');
      setViewState('forgot_step3');
    } else {
      setOtpError('Verification code is invalid. Please try again.');
    }
  };

  const handleStep3Submit = () => {
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in both password fields.');
      return;
    }

    // Password validation: must include a lowercase letter and a number
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLowercase || !hasNumber) {
      setPasswordError('Password must include a lowercase letter and a number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordError('');

    notifications.show({
      title: 'Success',
      message: 'Password successfully updated! Please sign in with your new password.',
      color: 'green',
    });

    handleReturnToLogin();
  };

  // Roles from Sima Arôme system specification (Viewer removed as requested)
  const roleOptions = [
    { value: 'Super Admin', label: 'Super Admin' },
    { value: 'Procurement', label: 'Procurement' },
    { value: 'Quality Controller', label: 'Quality Controller' },
    { value: 'Warehouse Staff', label: 'Warehouse Staff' },
    { value: 'Production Team', label: 'Production Team' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Manager', label: 'Manager' },
  ];

  const isForgotFlow = viewState !== 'login';

  return (
    <>
      <style>{`
        /* Force body reset to guarantee zero gaps at screen edges */
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #F9F8F4 !important;
          overflow: hidden !important;
        }
        
        .login-container {
          display: flex;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #F9F8F4;
          font-family: var(--ds-font-sans, 'Inter', sans-serif);
        }
        
        .login-left {
          width: 33%;
          background-image: url('/assets/images/essential-oil-hero.png');
          background-size: cover;
          background-position: center;
          margin: 0;
          padding: 0;
          height: 100vh;
        }
        
        .login-right {
          width: 67%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--ds-spacing-6);
          position: relative;
          height: 100vh;
          margin: 0;
          transition: background-color 0.3s ease, background-image 0.3s ease;
        }
        
        .login-container input, 
        .login-container button, 
        .login-container label,
        .login-container select,
        .login-container span,
        .login-container a {
          font-family: var(--ds-font-sans, 'Inter', sans-serif) !important;
        }
        
        /* Thin/bright custom placeholder style overrides */
        .login-container ::placeholder,
        .login-container input::placeholder,
        .login-container select::placeholder,
        .login-container textarea::placeholder,
        .login-container .mantine-Select-placeholder {
          color: #CFCFCF !important;
          opacity: 1 !important;
        }
        
        /* Font dropdown fix (prevents Serif/Times New Roman inside Mantine Portal) */
        .mantine-Select-dropdown,
        .mantine-Select-option,
        .mantine-Select-dropdown *,
        .mantine-Select-option * {
          font-family: var(--ds-font-sans, 'Inter', sans-serif) !important;
        }
        
        .forgot-subheader {
          font-family: var(--ds-font-subheader, 'Montserrat', sans-serif) !important;
        }
        
        @media (max-width: 768px) {
          .login-left {
            display: none;
          }
          .login-right {
            width: 100%;
            padding: var(--ds-spacing-4);
          }
        }
      `}</style>

      {/* Root container box forces light mode attributes to keep theme light */}
      <Box className="login-container" data-mantine-color-scheme="light">
        {/* Left Side: Essential Oil Hero Image Cover (Mentok Kiri, zero margins) */}
        <Box className="login-left" />

        {/* Right Side: Center Aligned Forms */}
        <Box 
          className="login-right"
          style={{
            backgroundColor: isForgotFlow ? undefined : '#F9F8F4',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box style={{ width: '100%', maxWidth: isForgotFlow ? 580 : 450, zIndex: 1 }}>
            
            {/* ── Persistent Brand Logo (Header removed, always visible at top) ── */}
            <Stack align="center" gap="md" mb="lg">
              <img
                src="/assets/images/logo-sima-arome.png"
                alt="Sima Arôme Logo"
                style={{ width: '280px', maxWidth: '100%', objectFit: 'contain' }}
              />
              {viewState === 'login' && (
                <Text size="md" c="dimmed" ta="center" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)', fontWeight: 500 }}>
                  Sign in to access your dashboard
                </Text>
              )}
            </Stack>

            {/* ── View 1: Standard Login Form Card ── */}
            {viewState === 'login' && (
              <Paper 
                withBorder 
                shadow="md" 
                p={30} 
                radius="md" 
                style={{ 
                  border: '1px solid var(--ds-gray-300)',
                  backgroundColor: '#ffffff'
                }}
              >
                <form onSubmit={form.onSubmit(handleLogin)}>
                  <Stack gap="md">
                    <TextInput
                      label="Email"
                      placeholder="Enter your email"
                      required
                      {...form.getInputProps('email')}
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '10px',
                          height: '46px',
                          backgroundColor: '#ffffff',
                        },
                        label: {
                          fontWeight: 600,
                          marginBottom: '4px',
                        },
                      }}
                    />

                    <PasswordInput
                      label="Password"
                      placeholder="Enter your password"
                      required
                      {...form.getInputProps('password')}
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '10px',
                          height: '46px',
                          backgroundColor: '#ffffff',
                        },
                        innerInput: {
                          height: '44px',
                        },
                        label: {
                          fontWeight: 600,
                          marginBottom: '4px',
                        },
                      }}
                    />

                    <Group justify="space-between" align="center" mt="xs">
                      <Checkbox
                        label="Remember me"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.currentTarget.checked)}
                        styles={{
                          label: {
                            fontSize: 'var(--ds-font-size-sm)',
                            color: 'var(--ds-gray-800)',
                          },
                        }}
                      />
                      <Anchor
                        component="button"
                        type="button"
                        size="sm"
                        onClick={() => setViewState('forgot_step1')}
                        style={{
                          color: 'var(--ds-primary)',
                          fontWeight: 600,
                          fontFamily: 'var(--ds-font-family)',
                        }}
                      >
                        Forgot password?
                      </Anchor>
                    </Group>

                    <Button
                      type="submit"
                      fullWidth
                      loading={loading}
                      size="md"
                      radius="md"
                      mt="md"
                      style={{
                        backgroundColor: 'var(--ds-primary)',
                        color: 'white',
                        fontWeight: 600,
                        height: '48px',
                      }}
                    >
                      Sign In
                    </Button>
                  </Stack>
                </form>
              </Paper>
            )}

            {/* ── View 2: Forgot Password Flow Inside Panel Card ── */}
            {isForgotFlow && (
              <Paper 
                withBorder 
                shadow="xl" 
                p={40} 
                radius="xl" 
                style={{ 
                  backgroundColor: '#fdfdfb',
                  borderRadius: '24px',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <Stack gap="xl">
                  {/* Green Title Pill Banner - Adjusted font size to fit in one line */}
                  <Stack align="center" gap="xs">
                    <Box
                      style={{
                        backgroundColor: 'var(--ds-primary)',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '10px 40px',
                        fontWeight: 'bold',
                        fontSize: '1.4rem',
                        textAlign: 'center',
                        boxShadow: '0 4px 10px rgba(30, 91, 58, 0.2)',
                        width: 'fit-content',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {viewState === 'forgot_step1' && 'Forget Your Password?'}
                      {viewState === 'forgot_step2' && 'Input Your Verification Code'}
                      {viewState === 'forgot_step3' && 'Create New Password'}
                    </Box>
                    <Text
                      size="sm"
                      c="dimmed"
                      ta="center"
                      className="forgot-subheader"
                      style={{ fontWeight: 500 }}
                    >
                      {viewState === 'forgot_step1' && 'Verified your account with email verification.'}
                      {viewState === 'forgot_step2' && 'Check your verification code in your email.'}
                      {viewState === 'forgot_step3' && 'Input your new password for the next sign in.'}
                    </Text>
                  </Stack>

                  {/* Step 1: Request Code */}
                  {viewState === 'forgot_step1' && (
                    <Stack gap="md">
                      <TextInput
                        label="Fullname"
                        placeholder="e.g., John Smyth"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                          },
                        }}
                      />

                      <TextInput
                        label="Email Address"
                        placeholder="e.g., john.smyth@gmail.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                          },
                        }}
                      />

                      <Select
                        label="Role"
                        data={roleOptions}
                        value={role}
                        onChange={setRole}
                        placeholder="Choose your role"
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                            fontFamily: "var(--ds-font-sans, 'Inter', sans-serif)",
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                            fontFamily: "var(--ds-font-sans, 'Inter', sans-serif)",
                          },
                          dropdown: {
                            fontFamily: "var(--ds-font-sans, 'Inter', sans-serif) !important",
                          },
                          option: {
                            fontFamily: "var(--ds-font-sans, 'Inter', sans-serif) !important",
                          }
                        }}
                      />

                      <Grid mt="lg" gutter="md">
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            onClick={handleStep1Submit}
                            style={{
                              backgroundColor: 'var(--ds-primary)',
                              color: 'white',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Get My Verification Code
                          </Button>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            variant="default"
                            onClick={handleReturnToLogin}
                            style={{
                              backgroundColor: '#d1d1d6',
                              color: '#2d2d2d',
                              border: 'none',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Cancel
                          </Button>
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  )}

                  {/* Step 2: Input OTP */}
                  {viewState === 'forgot_step2' && (
                    <Stack gap="md">
                      <TextInput
                        label="Verification Code"
                        placeholder="Input 6 number code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        error={otpError}
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: otpError ? '1px solid var(--mantine-color-red-filled)' : '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                          },
                        }}
                      />

                      <Grid mt="lg" gutter="md">
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            onClick={handleStep2Submit}
                            style={{
                              backgroundColor: 'var(--ds-primary)',
                              color: 'white',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Get Your Account
                          </Button>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            variant="default"
                            onClick={handleReturnToLogin}
                            style={{
                              backgroundColor: '#d1d1d6',
                              color: '#2d2d2d',
                              border: 'none',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Cancel
                          </Button>
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  )}

                  {/* Step 3: Reset Password */}
                  {viewState === 'forgot_step3' && (
                    <Stack gap="md">
                      <TextInput
                        label="New Password"
                        placeholder="Must include a lowercase letter and a number, e.g., john12"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                          },
                        }}
                      />

                      <TextInput
                        label="Confirm New Password"
                        placeholder="Must include a lowercase letter and a number, e.g., john12"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={passwordError}
                        styles={{
                          input: {
                            backgroundColor: '#f7f7f9',
                            border: passwordError ? '1px solid var(--mantine-color-red-filled)' : '1px solid #e7e7eb',
                            borderRadius: '12px',
                            height: '48px',
                            fontSize: '0.95rem',
                          },
                          label: {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#2d2d2d',
                            marginBottom: '8px',
                          },
                        }}
                      />

                      <Grid mt="lg" gutter="md">
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            onClick={handleStep3Submit}
                            style={{
                              backgroundColor: 'var(--ds-primary)',
                              color: 'white',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Create Password
                          </Button>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            variant="default"
                            onClick={handleReturnToLogin}
                            style={{
                              backgroundColor: '#d1d1d6',
                              color: '#2d2d2d',
                              border: 'none',
                              fontWeight: 600,
                              height: '48px',
                            }}
                          >
                            Cancel
                          </Button>
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            )}

            {/* Form Footer Copyright */}
            <Text size="xs" c="dimmed" ta="center" mt="xl" style={{ fontFamily: 'var(--ds-font-family, sans-serif)' }}>
              © 2026 Sima Arome. All rights reserved.
            </Text>
          </Box>
        </Box>
      </Box>
    </>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
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
  Grid,
  Select,
  Slider,
  Divider,
  Card,
  Tooltip,
  NumberInput,
} from '@mantine/core';
import {
  IconAward,
  IconCheck,
  IconAlertTriangle,
  IconScale,
  IconListNumbers,
  IconUsers,
  IconStarFilled,
  IconDownload,
  IconDeviceFloppy,
  IconFilter,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import type { Supplier, RawMaterial, Offer, ProductSupplier } from '@/types/sima-arome';
import { calculateAHPWeights, calculateSupplierScore, getRecommendation, type SupplierScoreInput } from '@/lib/ahpEngine';
import { notifications } from '@mantine/notifications';

// Available options for pairwise comparison (Saaty scale)
const COMPARISON_OPTIONS = [
  { value: '9', label: '9 (Absolute)' },
  { value: '7', label: '7 (Very Strong)' },
  { value: '5', label: '5 (Strong)' },
  { value: '3', label: '3 (Moderate)' },
  { value: '1', label: '1 (Equal)' },
  { value: '0.333', label: '1/3 (Moderate)' },
  { value: '0.2', label: '1/5 (Strong)' },
  { value: '0.143', label: '1/7 (Very Strong)' },
  { value: '0.111', label: '1/9 (Absolute)' },
];

// Zero-Dependency Custom SVG Radar Chart Component
interface RadarChartProps {
  data: {
    name: string;
    code: string;
    scores: {
      productQuality: number;
      deliveryAccuracy: number;
      deliveryTimeliness: number;
      priceCompetitiveness: number;
      serviceResponsiveness: number;
    };
    color: string;
  }[];
}

function SupplierRadarChart({ data }: RadarChartProps) {
  const width = 320;
  const height = 260;
  const cx = width / 2;
  const cy = height / 2 - 10;
  const r = 70;

  const criteria = [
    { label: 'Quality (C1)', key: 'productQuality' },
    { label: 'Accuracy (C2)', key: 'deliveryAccuracy' },
    { label: 'Timeliness (C3)', key: 'deliveryTimeliness' },
    { label: 'Price (C4)', key: 'priceCompetitiveness' },
    { label: 'Service (C5)', key: 'serviceResponsiveness' },
  ];

  const getCoordinates = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + r * (value / 100) * Math.cos(angle);
    const y = cy + r * (value / 100) * Math.sin(angle);
    return { x, y };
  };

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grids */}
        {gridLevels.map((level) => {
          const points = Array.from({ length: 5 }).map((_, i) => {
            const coord = getCoordinates(i, level);
            return `${coord.x},${coord.y}`;
          }).join(' ');

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#e9ecef"
              strokeWidth="1"
            />
          );
        })}

        {/* Axes */}
        {Array.from({ length: 5 }).map((_, i) => {
          const outerCoord = getCoordinates(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outerCoord.x}
              y2={outerCoord.y}
              stroke="#dee2e6"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Axes Labels */}
        {criteria.map((c, i) => {
          const labelCoord = getCoordinates(i, 120);
          let textAnchor: 'inherit' | 'end' | 'start' | 'middle' | undefined = 'middle';
          if (i === 1 || i === 2) textAnchor = 'start';
          if (i === 3 || i === 4) textAnchor = 'end';

          return (
            <text
              key={c.key}
              x={labelCoord.x}
              y={labelCoord.y + 4}
              textAnchor={textAnchor}
              fontSize="9"
              fontWeight="700"
              fill="#495057"
              style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
            >
              {c.label}
            </text>
          );
        })}

        {/* Polygons */}
        {data.map((vendor) => {
          const points = criteria.map((c, i) => {
            const val = vendor.scores[c.key as keyof typeof vendor.scores] || 0;
            const coord = getCoordinates(i, val);
            return `${coord.x},${coord.y}`;
          }).join(' ');

          return (
            <g key={vendor.name}>
              <polygon
                points={points}
                fill={vendor.color}
                fillOpacity="0.12"
                stroke={vendor.color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {criteria.map((c, i) => {
                const val = vendor.scores[c.key as keyof typeof vendor.scores] || 0;
                const coord = getCoordinates(i, val);
                return (
                  <circle
                    key={i}
                    cx={coord.x}
                    cy={coord.y}
                    r="3.5"
                    fill="#ffffff"
                    stroke={vendor.color}
                    strokeWidth="1.8"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
        {data.map((vendor) => (
          <div key={vendor.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: vendor.color }} />
            <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--ds-font-sans, sans-serif)', color: '#495057' }}>
              {vendor.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupplierEvaluationPage() {
  useSetModuleTitle('AHP Supplier Evaluation');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);

  // Material filter: only evaluate suppliers who supply this material
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // 1. AHP Comparison Matrix State (5x5)
  // Row/Col index mappings:
  // 0: Quality, 1: Accuracy, 2: Timeliness, 3: Price, 4: Service
  const [matrix, setMatrix] = useState<number[][]>([
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ]);

  // 2. Supplier Scores (Quality, Accuracy, Timeliness, Price, Service) that users can adjust manually
  const [supplierQualitativeRatings, setSupplierQualitativeRatings] = useState<Record<string, {
    quality: number | string;
    accuracy: number | string;
    timeliness: number | string;
    price: number | string;
    service: number | string;
  }>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supData, rmData, offersData, psData, weightsData] = await Promise.all([
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Offer>('offers'),
        daasAPI.getItems<ProductSupplier>('product_suppliers'),
        daasAPI.getItems<any>('ahp_weights'),
      ]);

      console.log('[AHP Debug] Suppliers fetched from DaaS:', supData);

      const activeSuppliers = (Array.isArray(supData) ? supData : []).filter(s => s.status !== 'INACTIVE');
      setSuppliers(activeSuppliers);
      setRawMaterials(Array.isArray(rmData) ? rmData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProductSuppliers(Array.isArray(psData) ? psData : []);

      // Initialize manual ratings from database values!
      const initRatings: Record<string, {
        quality: number | string;
        accuracy: number | string;
        timeliness: number | string;
        price: number | string;
        service: number | string;
      }> = {};
      activeSuppliers.forEach(sup => {
        initRatings[sup.id] = {
          quality: sup.ahp_quality != null ? sup.ahp_quality : '',
          accuracy: sup.ahp_accuracy != null ? sup.ahp_accuracy : '',
          timeliness: sup.ahp_timeliness != null ? sup.ahp_timeliness : '',
          price: sup.ahp_price != null ? sup.ahp_price : '',
          service: sup.ahp_service != null ? sup.ahp_service : '',
        };
      });
      setSupplierQualitativeRatings(initRatings);
    } catch (err) {
      console.error(err);
      setError('Failed to load supplier evaluation data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle cell modification in comparison matrix
  const handleMatrixCellChange = (r: number, c: number, valueStr: string | null) => {
    if (!valueStr) return;
    const value = parseFloat(valueStr);
    
    setMatrix(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      // Reciprocal cell is set automatically
      next[c][r] = 1 / value;
      return next;
    });
  };

  // 3. Compute AHP Weights and Consistency
  const ahpResult = React.useMemo(() => {
    try {
      return calculateAHPWeights(matrix);
    } catch (err) {
      console.error('AHP Weight calculation error:', err);
      return {
        weights: [0.2, 0.2, 0.2, 0.2, 0.2],
        consistencyRatio: 0,
        isConsistent: true,
        lambdaMax: 5,
      };
    }
  }, [matrix]);

  // 4. Map supplier-offer lookups
  const offerToSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach(o => map.set(o.id, o.supplier_id));
    return map;
  }, [offers]);

  // Handle Qualitative/Manual Slider Adjustments
  const handleRatingChange = (
    supId: string,
    key: 'quality' | 'accuracy' | 'timeliness' | 'price' | 'service',
    val: string | number
  ) => {
    setSupplierQualitativeRatings(prev => ({
      ...prev,
      [supId]: {
        ...prev[supId],
        [key]: val,
      }
    }));
  };

  // 5. Final Dynamic AHP Supplier Rankings
  //    When selectedMaterialId is set, restrict to suppliers who have at least
  //    one offer for that product_supplier (catalog entry).
  const rankedSuppliers = React.useMemo(() => {
    // Determine which supplier IDs to include based on material filter
    let eligibleSuppliers = suppliers;
    if (selectedMaterialId) {
      const eligibleIds = new Set(
        offers
          .filter(o => o.product_supplier_id === selectedMaterialId)
          .map(o => o.supplier_id)
      );
      eligibleSuppliers = suppliers.filter(s => eligibleIds.has(s.id));
    }

    return eligibleSuppliers
      .map(sup => {
        // C1 to C5 are manually adjustable scores from the sliders
        const ratings = supplierQualitativeRatings[sup.id] || {
          quality: '',
          accuracy: '',
          timeliness: '',
          price: '',
          service: '',
        };

        const scores: SupplierScoreInput = {
          productQuality: ratings.quality !== '' && ratings.quality !== undefined && ratings.quality !== null ? Number(ratings.quality) : 0,
          deliveryAccuracy: ratings.accuracy !== '' && ratings.accuracy !== undefined && ratings.accuracy !== null ? Number(ratings.accuracy) : 0,
          deliveryTimeliness: ratings.timeliness !== '' && ratings.timeliness !== undefined && ratings.timeliness !== null ? Number(ratings.timeliness) : 0,
          priceCompetitiveness: ratings.price !== '' && ratings.price !== undefined && ratings.price !== null ? Number(ratings.price) : 0,
          serviceResponsiveness: ratings.service !== '' && ratings.service !== undefined && ratings.service !== null ? Number(ratings.service) : 0,
        };

        const finalScore = calculateSupplierScore(scores, ahpResult.weights);

        return {
          id: sup.id,
          name: sup.name,
          code: sup.code || '',        // use empty string; render via formatFallbackValue
          scores,
          finalScore,
          recommendation: getRecommendation(finalScore),
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [suppliers, selectedMaterialId, offers, supplierQualitativeRatings, ahpResult.weights]);

  // Dynamic data for Radar Chart
  const radarChartData = React.useMemo(() => {
    const colors = ['#1e5b3a', '#3b5bdb', '#e67700', '#cc5de8', '#0ca678'];
    return rankedSuppliers.map((sup, idx) => ({
      name: sup.name,
      code: sup.code,
      scores: sup.scores,
      color: colors[idx % colors.length],
    }));
  }, [rankedSuppliers]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '60vh' }}>
          <Loader size="xl" color="emerald" />
          <Text c="dimmed">Initializing AHP calculation worksheet...</Text>
        </Stack>
      </Container>
    );
  }

  // formatFallbackValue helper (inline for this page)
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

  // Color helper based on dynamic scoring ranges
  const getScoreColor = (score: number | string | undefined | null): string => {
    const num = score !== '' && score !== undefined && score !== null ? Number(score) : 0;
    if (num === 0) return '#adb5bd'; // light gray for empty inputs
    if (num <= 40) return '#f03e3e';
    if (num <= 79) return '#e67700';
    return '#1e5b3a';
  };

  // Save AHP Decision handler
  const handleSaveDecision = async () => {
    try {
      const selectedMaterial = productSuppliers.find(ps => ps.id === selectedMaterialId);
      const payload = {
        timestamp: new Date().toISOString(),
        material: selectedMaterial ? { id: selectedMaterial.id, name: selectedMaterial.name } : 'All Materials',
        ahpWeights: {
          quality_c1: ahpResult.weights[0],
          accuracy_c2: ahpResult.weights[1],
          timeliness_c3: ahpResult.weights[2],
          price_c4: ahpResult.weights[3],
          service_c5: ahpResult.weights[4],
        },
        consistencyRatio: ahpResult.consistencyRatio,
        isConsistent: ahpResult.isConsistent,
        ranking: rankedSuppliers.map(s => ({
          rank: s.rank,
          supplierId: s.id,
          supplierName: s.name,
          supplierCode: s.code,
          finalScore: Math.round(s.finalScore * 100) / 100,
          recommendation: s.recommendation,
          scores: {
            quality: Math.round(s.scores.productQuality),
            accuracy: Math.round(s.scores.deliveryAccuracy),
            timeliness: Math.round(s.scores.deliveryTimeliness),
            price: Math.round(s.scores.priceCompetitiveness),
            service: Math.round(s.scores.serviceResponsiveness),
          },
        })),
      };

      // 1. Save global weights to ahp_weights collection in DaaS (UPSERT)
      const weightsPayload = {
        id: 'global_weights',
        quality_c1: ahpResult.weights[0],
        accuracy_c2: ahpResult.weights[1],
        timeliness_c3: ahpResult.weights[2],
        price_c4: ahpResult.weights[3],
        service_c5: ahpResult.weights[4],
        consistency_ratio: ahpResult.consistencyRatio,
      };

      try {
        await daasAPI.createItem('ahp_weights', weightsPayload);
      } catch {
        try {
          await daasAPI.updateItem('ahp_weights', 'global_weights', weightsPayload);
        } catch (err) {
          console.error('Failed to update AHP weights:', err);
        }
      }

      // 2. Save each supplier's ratings back to DaaS (statis, UPSERT)
      await Promise.all(
        suppliers.map(async (sup) => {
          const ratings = supplierQualitativeRatings[sup.id] || {
            quality: '',
            accuracy: '',
            timeliness: '',
            price: '',
            service: '',
          };
          
          await daasAPI.updateItem('suppliers', sup.id, {
            ahp_quality: ratings.quality,
            ahp_accuracy: ratings.accuracy,
            ahp_timeliness: ratings.timeliness,
            ahp_price: ratings.price,
            ahp_service: ratings.service,
          });
        })
      );

      console.log('[AHP Decision Saved]', JSON.stringify(payload, null, 2));
      notifications.show({
        title: 'AHP Decision Saved',
        message: `AHP criteria weights and supplier ratings successfully stored in the database! Winner: ${rankedSuppliers[0]?.name ?? '—'}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Save Failed',
        message: 'A database error occurred while saving AHP decisions.',
        color: 'red'
      });
    }
  };

  const handleExportReport = () => {
    notifications.show({
      title: 'Export Coming Soon',
      message: 'PDF/Excel export will be available in the next release.',
      color: 'blue',
      icon: <IconDownload size={16} />,
    });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Title */}
        <div>
          <Title order={1} style={{ fontFamily: 'var(--ds-font-subheader)', color: 'var(--ds-primary, #1e5b3a)' }}>
            Supplier Performance Evaluation (AHP)
          </Title>
          <Text c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
            Apply the scientific <em>Analytic Hierarchy Process</em> (AHP) to evaluate raw material criteria priorities and rank optimal SCM suppliers
          </Text>
        </div>

        {error && <Alert color="red">{error}</Alert>}

        {/* Material Filter Toolbar */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md" align="center">
            <IconFilter size={18} color="#1e5b3a" />
            <Text size="sm" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)', color: '#1e5b3a' }}>
              Evaluate by Material:
            </Text>
            <Select
              placeholder="All Suppliers (no filter)"
              clearable
              value={selectedMaterialId}
              onChange={setSelectedMaterialId}
              data={productSuppliers.map(ps => ({ value: ps.id, label: `${ps.name} (${ps.unit})` }))}
              style={{ minWidth: 300, fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              styles={{
                input: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
                dropdown: { fontFamily: 'var(--ds-font-sans, sans-serif)' },
              }}
            />
            {selectedMaterialId && (
              <Badge color="teal" variant="light" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                {rankedSuppliers.length} supplier(s) evaluated
              </Badge>
            )}
          </Group>
        </Paper>

        {/* Section Atas (Full Width): Matrix Card and Weights Results Card */}
        <Stack gap="lg">
          {/* Matrix Card */}
          <Paper p="xl" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <IconScale size={20} color="#1e5b3a" />
              <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
                Criteria Pairwise Comparison Matrix
              </Title>
            </Group>
            <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
              Set comparative importance weight of row vs column (1: Equal, 3: Moderate, 5: Strong, 7: Very Strong, 9: Absolute)
            </Text>

            <Table.ScrollContainer minWidth={600}>
              <Table withTableBorder withColumnBorders verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                    <Table.Th style={{ width: 120, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Criteria</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Quality (C1)</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Accuracy (C2)</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Timeliness (C3)</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Price (C4)</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Service (C5)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {matrix.map((rowArr, rIdx) => {
                    const criteriaLabels = [
                      'Quality (C1)',
                      'Accuracy (C2)',
                      'Timeliness (C3)',
                      'Price (C4)',
                      'Service (C5)',
                    ];

                    return (
                      <Table.Tr key={rIdx}>
                        <Table.Td style={{ fontWeight: 700, fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{criteriaLabels[rIdx]}</Table.Td>
                        {rowArr.map((val, cIdx) => {
                          // Diagonal cells are locked at 1
                          if (rIdx === cIdx) {
                            return (
                              <Table.Td key={cIdx} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontWeight: 'bold' }}>
                                1
                              </Table.Td>
                            );
                          }

                          // Lower-left triangle is display only (reciprocals)
                          if (rIdx > cIdx) {
                            const reciprocalVal = val < 1 ? `1/${Math.round(1 / val)}` : `${Math.round(val)}`;
                            return (
                              <Table.Td key={cIdx} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontSize: 11, color: '#868e96' }}>
                                {val < 1 ? reciprocalVal : val.toFixed(2)}
                              </Table.Td>
                            );
                          }

                          // Upper-right triangle is select editable
                          return (
                            <Table.Td key={cIdx} p="2">
                              <Select
                                value={String(matrix[rIdx][cIdx])}
                                onChange={(v) => handleMatrixCellChange(rIdx, cIdx, v)}
                                data={COMPARISON_OPTIONS}
                                size="xs"
                                variant="unstyled"
                                styles={{
                                  input: {
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#1e5b3a',
                                    backgroundColor: '#ebf7f0',
                                    borderRadius: '4px',
                                    height: '28px',
                                    fontFamily: 'var(--ds-font-sans, sans-serif)'
                                  },
                                  dropdown: {
                                    fontFamily: 'var(--ds-font-sans, sans-serif)'
                                  }
                                }}
                              />
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>

          {/* Weights Results Card */}
          <Paper p="xl" radius="md" withBorder>
             <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
              Criteria Priority Weights Results
            </Title>
            <Divider mb="lg" />

            <Stack gap="md">
              {(() => {
                const labels = [
                  'Product Quality (C1)',
                  'Delivery Accuracy (C2)',
                  'Delivery Timeliness (C3)',
                  'Price Competitiveness (C4)',
                  'Service Responsiveness (C5)',
                ];

                return labels.map((lbl, idx) => {
                  const weightPct = Math.round(ahpResult.weights[idx] * 100);
                  return (
                    <div key={idx}>
                      <Group justify="space-between" mb="3">
                        <Text size="xs" fw={700} c="var(--ds-gray-700)">{lbl}</Text>
                        <Text size="xs" fw={800} c="#1e5b3a">{weightPct}%</Text>
                      </Group>
                      <div style={{ height: 10, width: '100%', backgroundColor: '#e9ecef', borderRadius: 5, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${weightPct}%`, 
                            backgroundColor: '#1e5b3a',
                            transition: 'width 0.5s ease'
                          }} 
                        />
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Consistency Ratio Audit Alert */}
              {ahpResult.isConsistent ? (
                <Alert icon={<IconCheck size={16} />} title="Consistent Comparison" color="teal">
                  Your pairwise comparison matrix has a valid consistency ratio (CR = {ahpResult.consistencyRatio.toFixed(3)} &lt; 0.1). Priority weights are ready for decision-making.
                </Alert>
              ) : (
                <Alert icon={<IconAlertTriangle size={16} />} title="Inconsistent Comparison!" color="orange">
                  The pairwise comparison matrix exceeds the consistency threshold (CR = {ahpResult.consistencyRatio.toFixed(3)} &ge; 0.1). Please adjust some ratings to ensure logical consistency.
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stack>

        {/* Section Bawah (Split 2 Kolom): Ratings Table (Kiri) and Radar Chart (Kanan) */}
        <Grid gutter="lg" align="stretch">
          {/* Column Left: Manual Supplier Performance Ratings — 8/12 cols */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper p="xl" radius="md" withBorder style={{ height: '100%' }}>
              <Group gap="xs" mb="sm">
                <IconUsers size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
                  Manual Supplier Performance Ratings
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                All performance criteria are fully adjustable. Enter numbers from 1-100 to evaluate each supplier manually:
              </Text>

              <Table.ScrollContainer minWidth={600}>
                <Table striped highlightOnHover verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                      <Table.Th style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Supplier Name</Table.Th>
                      <Table.Th style={{ width: 110, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Quality (C1)</Table.Th>
                      <Table.Th style={{ width: 110, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Accuracy (C2)</Table.Th>
                      <Table.Th style={{ width: 110, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Timeliness (C3)</Table.Th>
                      <Table.Th style={{ width: 110, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Price (C4)</Table.Th>
                      <Table.Th style={{ width: 110, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Service (C5)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {suppliers.map(sup => {
                      const ratings = supplierQualitativeRatings[sup.id] || {
                        quality: '',
                        accuracy: '',
                        timeliness: '',
                        price: '',
                        service: '',
                      };

                      return (
                        <Table.Tr key={sup.id}>
                          <Table.Td style={{ fontWeight: 700, fontFamily: 'var(--ds-font-sans, sans-serif)', color: 'var(--ds-primary, #1e5b3a)', verticalAlign: 'middle' }}>
                            {sup.name}
                          </Table.Td>
                          
                          {/* Quality (C1) */}
                          <Table.Td p="2" style={{ verticalAlign: 'middle' }}>
                            <NumberInput
                              min={1}
                              max={100}
                              value={ratings.quality}
                              onChange={(val) => handleRatingChange(sup.id, 'quality', val)}
                              size="xs"
                              placeholder="0"
                              styles={{
                                input: {
                                  textAlign: 'center',
                                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                                  borderColor: getScoreColor(ratings.quality),
                                  color: getScoreColor(ratings.quality),
                                  fontWeight: 700
                                }
                              }}
                            />
                          </Table.Td>

                          {/* Accuracy (C2) */}
                          <Table.Td p="2" style={{ verticalAlign: 'middle' }}>
                            <NumberInput
                              min={1}
                              max={100}
                              value={ratings.accuracy}
                              onChange={(val) => handleRatingChange(sup.id, 'accuracy', val)}
                              size="xs"
                              placeholder="0"
                              styles={{
                                input: {
                                  textAlign: 'center',
                                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                                  borderColor: getScoreColor(ratings.accuracy),
                                  color: getScoreColor(ratings.accuracy),
                                  fontWeight: 700
                                }
                              }}
                            />
                          </Table.Td>

                          {/* Timeliness (C3) */}
                          <Table.Td p="2" style={{ verticalAlign: 'middle' }}>
                            <NumberInput
                              min={1}
                              max={100}
                              value={ratings.timeliness}
                              onChange={(val) => handleRatingChange(sup.id, 'timeliness', val)}
                              size="xs"
                              placeholder="0"
                              styles={{
                                input: {
                                  textAlign: 'center',
                                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                                  borderColor: getScoreColor(ratings.timeliness),
                                  color: getScoreColor(ratings.timeliness),
                                  fontWeight: 700
                                }
                              }}
                            />
                          </Table.Td>

                          {/* Price (C4) */}
                          <Table.Td p="2" style={{ verticalAlign: 'middle' }}>
                            <NumberInput
                              min={1}
                              max={100}
                              value={ratings.price}
                              onChange={(val) => handleRatingChange(sup.id, 'price', val)}
                              size="xs"
                              placeholder="0"
                              styles={{
                                input: {
                                  textAlign: 'center',
                                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                                  borderColor: getScoreColor(ratings.price),
                                  color: getScoreColor(ratings.price),
                                  fontWeight: 700
                                }
                              }}
                            />
                          </Table.Td>

                          {/* Service (C5) */}
                          <Table.Td p="2" style={{ verticalAlign: 'middle' }}>
                            <NumberInput
                              min={1}
                              max={100}
                              value={ratings.service}
                              onChange={(val) => handleRatingChange(sup.id, 'service', val)}
                              size="xs"
                              placeholder="0"
                              styles={{
                                input: {
                                  textAlign: 'center',
                                  fontFamily: 'var(--ds-font-sans, sans-serif)',
                                  borderColor: getScoreColor(ratings.service),
                                  color: getScoreColor(ratings.service),
                                  fontWeight: 700
                                }
                              }}
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </Grid.Col>

          {/* Column Right: Radar Chart — 4/12 cols */}
          <Grid.Col span={{ base: 12, lg: 4 }} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Zero-Dependency SVG Radar Chart Card */}
            <Paper p="xl" radius="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Group gap="xs" mb="sm">
                <IconAward size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
                  Criteria Visualization (Radar Chart)
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Visual profile comparing criteria scores for all evaluated supplier alternatives
              </Text>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <SupplierRadarChart data={radarChartData} />
              </div>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Dynamic AHP Supplier Rankings Output Table */}
        <Paper p="xl" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <IconListNumbers size={20} color="#1e5b3a" />
            <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
              Rankings & Supplier Recommendations
            </Title>
          </Group>
          <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
            Scientific rankings calculated by cross-multiplying criteria weights with database logs and qualitative ratings
          </Text>

          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                  <Table.Th style={{ width: 80, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Rank</Table.Th>
                  <Table.Th style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Supplier</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Quality (C1)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Accuracy (C2)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Timeliness (C3)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Price (C4)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Service (C5)</Table.Th>
                  <Table.Th style={{ textAlign: 'right', fontFamily: 'var(--ds-font-sans, sans-serif)' }}>AHP Score</Table.Th>
                  <Table.Th style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>Recommendation</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rankedSuppliers.map((sup) => {
                  let recColor = 'gray';
                  let recText = 'Pending';
                  if (sup.recommendation === 'Excellent Supplier') {
                    recColor = 'green';
                    recText = 'Excellent (Primary Source)';
                  } else if (sup.recommendation === 'Good Supplier') {
                    recColor = 'blue';
                    recText = 'Good (Secondary Source)';
                  } else {
                    recColor = 'orange';
                    recText = 'Needs Evaluation';
                  }

                  return (
                    <Table.Tr 
                      key={sup.id} 
                      style={{ 
                        backgroundColor: sup.rank === 1 ? '#f4faf6' : 'transparent',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <Table.Td 
                        style={{ 
                          textAlign: 'center',
                          borderLeft: sup.rank === 1 ? '4px solid #1e5b3a' : 'none',
                          paddingLeft: sup.rank === 1 ? '8px' : '10px',
                        }}
                      >
                        <Box style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          backgroundColor: sup.rank === 1 ? '#1e5b3a' : '#e9ecef', 
                          color: sup.rank === 1 ? '#ffffff' : '#495057',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 12
                        }}>
                          {sup.rank}
                        </Box>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" align="center">
                          <Text size="sm" fw={700} style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                            {sup.name}
                          </Text>
                          {sup.rank === 1 && (
                            <Badge 
                              color="yellow" 
                              variant="filled" 
                              size="xs" 
                              leftSection={<IconStarFilled size={10} />}
                              style={{ 
                                backgroundColor: '#fab005', 
                                color: '#ffffff',
                                fontWeight: 800,
                                fontFamily: 'var(--ds-font-sans, sans-serif)'
                              }}
                            >
                              Winner
                            </Badge>
                          )}
                        </Group>
                        <Text size="xxs" c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {sup.code ? sup.code : <span style={{ color: 'var(--ds-gray-400, #adb5bd)', fontWeight: 300 }}>—</span>}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.scores.productQuality)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.scores.deliveryAccuracy)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.scores.deliveryTimeliness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.scores.priceCompetitiveness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.scores.serviceResponsiveness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="md" fw={800} c="#1e5b3a" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{Math.round(sup.finalScore)}%</Text>
                      </Table.Td>
                      <Table.Td style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                        <Badge color={recColor} variant="light" size="sm" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                          {recText}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {/* Save Decision & Export */}
          <Group justify="flex-end" mt="lg" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Tooltip label="Export PDF/Excel report (coming soon)" withArrow>
              <Button
                variant="outline"
                color="blue"
                leftSection={<IconDownload size={16} />}
                onClick={handleExportReport}
                style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              >
                Export Report
              </Button>
            </Tooltip>
            <Tooltip
              label={!ahpResult.isConsistent ? 'Warning: matrix CR ≥ 0.1. Adjust comparisons before saving.' : 'Save AHP decision log'}
              withArrow
            >
              <Button
                color="emerald"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleSaveDecision}
                disabled={rankedSuppliers.length === 0}
                style={{ backgroundColor: '#1e5b3a', fontFamily: 'var(--ds-font-sans, sans-serif)' }}
              >
                Save AHP Decision
              </Button>
            </Tooltip>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}

// (Box is now imported from @mantine/core — local shim removed)

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

  // 2. Qualitative Supplier Scores (Prices and Service) that users can adjust
  const [supplierQualitativeRatings, setSupplierQualitativeRatings] = useState<Record<string, { price: number; service: number }>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supData, rmData, offersData, psData] = await Promise.all([
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Offer>('offers'),
        daasAPI.getItems<ProductSupplier>('product_suppliers'),
      ]);

      const activeSuppliers = (Array.isArray(supData) ? supData : []).filter(s => s.status !== 'INACTIVE');
      setSuppliers(activeSuppliers);
      setRawMaterials(Array.isArray(rmData) ? rmData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProductSuppliers(Array.isArray(psData) ? psData : []);

      // Initialize qualitative sliders for each supplier
      const initRatings: Record<string, { price: number; service: number }> = {};
      activeSuppliers.forEach(sup => {
        initRatings[sup.id] = {
          price: 80,
          service: sup.favorite ? 90 : 75,
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

  // Handle Qualitative Slider Adjustments
  const handleRatingChange = (supId: string, key: 'price' | 'service', val: number) => {
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
        // Query cargo deliveries (scoped to selected material if filter active)
        const deliveries = rawMaterials.filter(item => {
          const belongsToSupplier =
            item.supplier_id === sup.id ||
            (item.offer_id && offerToSupplierMap.get(item.offer_id) === sup.id);
          if (!belongsToSupplier) return false;
          if (!selectedMaterialId) return true;
          // When a material filter is active, further restrict to that material's offers
          const offerForMaterial = offers.find(
            o => o.id === item.offer_id && o.product_supplier_id === selectedMaterialId
          );
          return !!offerForMaterial || item.offer_id === null; // include direct supplier_id records
        });

        const totalDeliveries = deliveries.length;
        const accepted = deliveries.filter(item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION').length;
        const rejected = deliveries.filter(item => item.status === 'QC_REJECTED').length;

        // C1: Product Quality — ratio of accepted / total QC-reviewed batches (live DB data)
        const qualityScore = totalDeliveries > 0 ? (accepted / totalDeliveries) * 100 : 100;

        // C2: Delivery Accuracy — penalise rejections (live DB data)
        const accuracyScore = totalDeliveries > 0
          ? Math.max(0, 100 - (rejected / totalDeliveries) * 50)
          : 100;

        // C3: Delivery Timeliness — derived from offers.lead_time (best available proxy)
        //     Shorter lead time → higher timeliness score; floor at 40
        const supOffers = offers.filter(o => {
          if (o.supplier_id !== sup.id) return false;
          if (selectedMaterialId) return o.product_supplier_id === selectedMaterialId;
          return true;
        });
        const avgLeadTime = supOffers.length > 0
          ? supOffers.reduce((sum, o) => sum + o.lead_time, 0) / supOffers.length
          : 5;
        const timelinessScore = Math.max(40, 100 - avgLeadTime * 5);

        // C4 & C5: Qualitative sliders (price & service responsiveness)
        const ratings = supplierQualitativeRatings[sup.id] || { price: 80, service: 75 };

        const scores: SupplierScoreInput = {
          productQuality: qualityScore,
          deliveryAccuracy: accuracyScore,
          deliveryTimeliness: timelinessScore,
          priceCompetitiveness: ratings.price,
          serviceResponsiveness: ratings.service,
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
  }, [suppliers, selectedMaterialId, offers, rawMaterials, offerToSupplierMap, supplierQualitativeRatings, ahpResult.weights]);

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

  // Save AHP Decision handler
  const handleSaveDecision = () => {
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
    console.log('[AHP Decision Saved]', JSON.stringify(payload, null, 2));
    notifications.show({
      title: 'AHP Decision Saved',
      message: `Ranked ${rankedSuppliers.length} supplier(s). Winner: ${rankedSuppliers[0]?.name ?? '—'}. Check console for full payload.`,
      color: 'teal',
      icon: <IconDeviceFloppy size={16} />,
    });
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

        <Grid gutter="lg" align="stretch">

          {/* Column Left: Comparison Matrix & Weights — 8/12 cols */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
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
          </Grid.Col>

          {/* Column Right: Supplier Sliders & Radar Chart — 4/12 cols */}
          <Grid.Col span={{ base: 12, lg: 4 }} style={{ display: 'flex', flexDirection: 'column' }}>
          <Stack gap="lg" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Qualitative Supplier Sliders Card */}
            <Paper p="xl" radius="md" withBorder>
              <Group gap="xs" mb="sm">
                <IconUsers size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-subheader)', color: '#1e5b3a' }}>
                  Qualitative Supplier Ratings
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mb="lg" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>
                Quality (C1) and timeliness (C2, C3) are automatically resolved from SCM records. Adjust Price (C4) and Service (C5) parameters:
              </Text>

              <Stack gap="xl">
                {suppliers.map(sup => {
                  const ratings = supplierQualitativeRatings[sup.id] || { price: 80, service: 75 };
                  return (
                    <Card key={sup.id} p="sm" withBorder radius="sm">
                      <Text size="sm" fw={700} c="var(--ds-primary)" mb="xs" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{sup.name}</Text>
                      
                      {/* Price Slider */}
                      <div style={{ marginBottom: 12 }}>
                        <Group justify="space-between" mb={2}>
                          <Text size="xxs" fw={700} c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>PRICE COMPETITIVENESS (C4)</Text>
                          <Text size="xxs" fw={700} c="blue" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{ratings.price}/100</Text>
                        </Group>
                        <Slider
                          size="sm"
                          color="blue"
                          value={ratings.price}
                          onChange={(val) => handleRatingChange(sup.id, 'price', val)}
                          styles={{ thumb: { borderWidth: 1 } }}
                        />
                      </div>

                      {/* Service Slider */}
                      <div>
                        <Group justify="space-between" mb={2}>
                          <Text size="xxs" fw={700} c="dimmed" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>SERVICE RESPONSIVENESS (C5)</Text>
                          <Text size="xxs" fw={700} c="teal" style={{ fontFamily: 'var(--ds-font-sans, sans-serif)' }}>{ratings.service}/100</Text>
                        </Group>
                        <Slider
                          size="sm"
                          color="teal"
                          value={ratings.service}
                          onChange={(val) => handleRatingChange(sup.id, 'service', val)}
                          styles={{ thumb: { borderWidth: 1 } }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </Stack>
            </Paper>

            {/* Zero-Dependency SVG Radar Chart Card */}
            <Paper p="xl" radius="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          </Stack>
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

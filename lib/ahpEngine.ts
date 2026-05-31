/**
 * ═══════════════════════════════════════════════════════════
 * Sima Arôme SCM — Analytic Hierarchy Process (AHP) Engine
 * ═══════════════════════════════════════════════════════════
 * Description: Mathematical calculations for matrix normalization, consistency 
 *              ratio checks, and supplier multi-criteria performance ranking.
 * Author: Antigravity AI
 * Date: 2026-05-31
 * ═══════════════════════════════════════════════════════════
 */

// Random Index (RI) reference table for consistency check (Saaty)
// For n = 5 criteria, RI is 1.12
const RANDOM_INDEX_TABLE: Record<number, number> = {
  1: 0.00,
  2: 0.00,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export interface AHPResult {
  weights: number[];              // Priority weights vector summing to 1.0
  consistencyIndex: number;       // CI = (lambdaMax - n) / (n - 1)
  consistencyRatio: number;       // CR = CI / RI
  isConsistent: boolean;          // TRUE if CR < 0.1
  lambdaMax: number;              // Maximum eigenvalue
}

/**
 * Calculates priority weights and consistency statistics from a square pairwise comparison matrix.
 * @param matrix Symmetric pairwise matrix n x n
 */
export function calculateAHPWeights(matrix: number[][]): AHPResult {
  const n = matrix.length;
  if (n === 0 || matrix.some(row => row.length !== n)) {
    throw new Error('Matriks harus berupa matriks persegi n x n');
  }

  // 1. Calculate column sums
  const columnSums = new Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) {
      columnSums[c] += matrix[r][c];
    }
  }

  // 2. Normalize columns and calculate row averages (priority weights vector)
  const normalizedMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const weights = new Array(n).fill(0);

  for (let r = 0; r < n; r++) {
    let rowSum = 0;
    for (let c = 0; c < n; c++) {
      normalizedMatrix[r][c] = matrix[r][c] / (columnSums[c] || 1);
      rowSum += normalizedMatrix[r][c];
    }
    weights[r] = rowSum / n;
  }

  // 3. Consistency Index (CI) & Consistency Ratio (CR) Check
  // 3a. Compute Weighted Sum Vector (WSV) = Matrix * Weights
  const wsv = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      wsv[r] += matrix[r][c] * weights[c];
    }
  }

  // 3b. Compute Consistency Vector (CV) = WSV / Weights
  const cv = new Array(n).fill(0);
  let cvSum = 0;
  for (let i = 0; i < n; i++) {
    cv[i] = wsv[i] / (weights[i] || 1);
    cvSum += cv[i];
  }

  // 3c. Lambda Max is the average of CV
  const lambdaMax = cvSum / n;

  // 3d. Compute Consistency Index (CI)
  const consistencyIndex = n > 1 ? (lambdaMax - n) / (n - 1) : 0;

  // 3e. Compute Consistency Ratio (CR) based on RI Table
  const ri = RANDOM_INDEX_TABLE[n] || 1.12;
  const consistencyRatio = ri > 0 ? consistencyIndex / ri : 0;
  const isConsistent = consistencyRatio < 0.1;

  return {
    weights,
    consistencyIndex,
    consistencyRatio,
    isConsistent,
    lambdaMax,
  };
}

export interface SupplierScoreInput {
  productQuality: number;        // C1: Kualitas Produk (0-100)
  deliveryAccuracy: number;      // C2: Akurasi Pengiriman (0-100)
  deliveryTimeliness: number;    // C3: Ketepatan Waktu Pengiriman (0-100)
  priceCompetitiveness: number;  // C4: Daya Saing Harga (0-100)
  serviceResponsiveness: number; // C5: Responsivitas Layanan (0-100)
}

export type SupplierRecommendation = 'Excellent Supplier' | 'Good Supplier' | 'Needs Improvement';

export interface RankedSupplier {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  scores: SupplierScoreInput;
  finalScore: number;            // Overall weighted performance (0 - 100)
  rank: number;
  recommendation: SupplierRecommendation;
}

/**
 * Calculates a single supplier's overall weighted score (0-100).
 * @param scores Criteria scores (0-100) for the supplier
 * @param weights Calculated priority weights vector of length 5
 */
export function calculateSupplierScore(scores: SupplierScoreInput, weights: number[]): number {
  if (weights.length !== 5) {
    throw new Error('Vektor bobot AHP harus berdurasi 5 kriteria');
  }

  return (
    scores.productQuality * weights[0] +
    scores.deliveryAccuracy * weights[1] +
    scores.deliveryTimeliness * weights[2] +
    scores.priceCompetitiveness * weights[3] +
    scores.serviceResponsiveness * weights[4]
  );
}

/**
 * Assigns performance recommendations based on weighted final score thresholds.
 * @param finalScore Final AHP performance score (0-100)
 */
export function getRecommendation(finalScore: number): SupplierRecommendation {
  if (finalScore >= 80) {
    return 'Excellent Supplier';
  } else if (finalScore >= 60) {
    return 'Good Supplier';
  }
  return 'Needs Improvement';
}

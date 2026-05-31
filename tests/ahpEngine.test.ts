import { describe, it, expect } from 'vitest';
import { calculateAHPWeights, calculateSupplierScore, getRecommendation } from '../lib/ahpEngine';

describe('AHP Engine Calculations Test Suite', () => {
  
  it('should accurately calculate equal-importance weights', () => {
    // 5x5 Matrix of equal importance (all 1s)
    const equalMatrix = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ];

    const result = calculateAHPWeights(equalMatrix);

    // With equal priority, weights must all be exactly 0.20 (20%)
    expect(result.weights).toHaveLength(5);
    result.weights.forEach(w => {
      expect(w).toBeCloseTo(0.20, 5);
    });

    // Consistency Ratio should be 0 (perfect consistency)
    expect(result.consistencyRatio).toBeCloseTo(0, 5);
    expect(result.isConsistent).toBe(true);
    expect(result.lambdaMax).toBeCloseTo(5.0, 5);
  });

  it('should compute weights and consistency ratio for a typical consistent matrix', () => {
    // A matrix with slightly different weights but consistent (CR < 0.1)
    const consistentMatrix = [
      [1,   3,   5,   3,   7],
      [1/3, 1,   3,   1,   5],
      [1/5, 1/3, 1,   1/3, 3],
      [1/3, 1,   3,   1,   5],
      [1/7, 1/5, 1/3, 1/5, 1],
    ];

    const result = calculateAHPWeights(consistentMatrix);

    // Priority Weights should sum to 1.0 (100%)
    const sumWeights = result.weights.reduce((sum, w) => sum + w, 0);
    expect(sumWeights).toBeCloseTo(1.0, 5);

    // First criteria (Quality) should have the highest priority weight
    expect(result.weights[0]).toBeGreaterThan(result.weights[1]);
    expect(result.weights[1]).toBeGreaterThan(result.weights[2]);

    // Check CR is valid and consistent
    expect(result.consistencyRatio).toBeLessThan(0.1);
    expect(result.isConsistent).toBe(true);
  });

  it('should accurately calculate a supplier\'s weighted performance score', () => {
    const scores = {
      productQuality: 90,        // C1
      deliveryAccuracy: 80,      // C2
      deliveryTimeliness: 70,    // C3
      priceCompetitiveness: 85,  // C4
      serviceResponsiveness: 95, // C5
    };

    // Equal weights of 20% each
    const equalWeights = [0.2, 0.2, 0.2, 0.2, 0.2];

    const finalScore = calculateSupplierScore(scores, equalWeights);
    
    // Average should be: (90 + 80 + 70 + 85 + 95) / 5 = 420 / 5 = 84
    expect(finalScore).toBe(84);
  });

  it('should correctly assign supplier recommendations based on threshold boundaries', () => {
    expect(getRecommendation(90)).toBe('Excellent Supplier');
    expect(getRecommendation(80)).toBe('Excellent Supplier');
    
    expect(getRecommendation(75)).toBe('Good Supplier');
    expect(getRecommendation(60)).toBe('Good Supplier');
    
    expect(getRecommendation(55)).toBe('Needs Improvement');
    expect(getRecommendation(40)).toBe('Needs Improvement');
  });

});

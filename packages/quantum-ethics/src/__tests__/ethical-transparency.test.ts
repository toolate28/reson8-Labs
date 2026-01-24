/**
 * Tests for Ethical Transparency Features
 * 
 * Validates that the infrastructure provides ethical choices transparently
 */

import { describe, test, expect } from 'bun:test';
import {
  allocateResources,
  createResourceQuota,
  explainEthicalPolicy,
  DEFAULT_POLICY,
  type EthicalDecisionExplanation
} from '../resource-allocation';

describe('Ethical Transparency', () => {
  describe('EthicalDecisionExplanation', () => {
    test('approved allocation includes full transparency', () => {
      const userId = 'test-user-1';
      const quota = createResourceQuota(userId, 'educational', DEFAULT_POLICY);
      const request = {
        qubits: 10,
        gateDepth: 50,
        estimatedTimeMs: 5000,
        purpose: 'Research quantum algorithms for drug discovery, focusing on molecular simulation with variational quantum eigensolver to predict protein binding affinity'
      };

      const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

      expect(result.allocation).toBeDefined();
      expect(result.ethicalExplanation).toBeDefined();
      expect(result.ethicalExplanation.decision).toBe('approved');
      expect(result.ethicalExplanation.reasoning).toContain('fairness score');
      expect(result.ethicalExplanation.reasoning).toContain('coherence');
      expect(result.ethicalExplanation.ethicalPrinciples.length).toBeGreaterThan(0);
      expect(result.ethicalExplanation.userRights.length).toBeGreaterThan(0);
      expect(result.ethicalExplanation.metrics.fairnessScore).toBeGreaterThan(0);
      expect(result.ethicalExplanation.metrics.coherenceScore).toBeGreaterThan(0);
      expect(result.ethicalExplanation.metrics.priorityWeight).toBeGreaterThan(0);
    });

    test('rejected allocation includes alternatives and user rights', () => {
      const userId = 'test-user-2';
      const quota = createResourceQuota(userId, 'commercial', DEFAULT_POLICY);
      
      // First, create heavy prior usage to trigger fairness rejection
      const heavyPriorAllocations = Array.from({ length: 10 }, (_, i) => ({
        allocationId: `prior-${i}`,
        userId,
        qubits: 90,
        gateDepth: 100,
        estimatedTimeMs: 3000000, // 50 minutes each
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 60000 * (i + 1)).toISOString(),
        fairnessScore: 0.5
      }));

      const request = {
        qubits: 5,
        gateDepth: 20,
        estimatedTimeMs: 2000,
        purpose: 'Additional quantum computation request'
      };

      const result = allocateResources(userId, request, quota, heavyPriorAllocations, DEFAULT_POLICY);

      // Should be deferred due to fairness, not coherence
      expect(result.allocation).toBeUndefined();
      expect(result.ethicalExplanation).toBeDefined();
      expect(result.ethicalExplanation.decision).toMatch(/rejected|deferred/);
      expect(result.ethicalExplanation.reasoning.length).toBeGreaterThan(20);
      expect(result.ethicalExplanation.alternativeOptions).toBeDefined();
      expect(result.ethicalExplanation.alternativeOptions!.length).toBeGreaterThan(0);
      expect(result.ethicalExplanation.userRights.length).toBeGreaterThan(0);
      expect(result.ethicalExplanation.ethicalPrinciples.length).toBeGreaterThan(0);
    });

    test('deferred allocation explains fairness calculation', () => {
      const userId = 'test-user-3';
      const quota = createResourceQuota(userId, 'research', DEFAULT_POLICY);
      
      // Create prior allocation to reduce fairness score
      const priorAllocation = {
        allocationId: 'prior-1',
        userId,
        qubits: 80,
        gateDepth: 100,
        estimatedTimeMs: 3000000, // 50 minutes
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        fairnessScore: 0.9
      };

      const request = {
        qubits: 50,
        gateDepth: 80,
        estimatedTimeMs: 10000,
        purpose: 'Advanced quantum simulation for molecular dynamics research with high-precision wavefunction optimization using quantum phase estimation algorithm'
      };

      const result = allocateResources(userId, request, quota, [priorAllocation], DEFAULT_POLICY);

      expect(result.allocation).toBeUndefined();
      expect(result.ethicalExplanation).toBeDefined();
      expect(result.ethicalExplanation.decision).toBe('deferred');
      expect(result.ethicalExplanation.reasoning).toContain('fairness score');
      expect(result.ethicalExplanation.reasoning).toContain('recent usage');
      expect(result.ethicalExplanation.alternativeOptions).toBeDefined();
      expect(result.ethicalExplanation.alternativeOptions!.length).toBeGreaterThan(0);
    });

    test('all decisions include ethical principles', () => {
      const testCases = [
        { role: 'educational' as const, purpose: 'Quantum computing education for undergrad students learning Bell states and entanglement' },
        { role: 'research' as const, purpose: 'test' }, // Will be rejected
        { role: 'commercial' as const, purpose: 'Industrial quantum optimization for supply chain logistics using quantum annealing' }
      ];

      for (const testCase of testCases) {
        const userId = `user-${testCase.role}`;
        const quota = createResourceQuota(userId, testCase.role, DEFAULT_POLICY);
        const request = {
          qubits: 10,
          gateDepth: 30,
          estimatedTimeMs: 5000,
          purpose: testCase.purpose
        };

        const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

        expect(result.ethicalExplanation).toBeDefined();
        expect(result.ethicalExplanation.ethicalPrinciples).toBeDefined();
        expect(result.ethicalExplanation.ethicalPrinciples.length).toBeGreaterThan(0);
        
        // Every decision should explain principles
        for (const principle of result.ethicalExplanation.ethicalPrinciples) {
          expect(principle.length).toBeGreaterThan(10);
          expect(principle).toMatch(/:/); // Format: "Principle: explanation"
        }
      }
    });

    test('trade-offs are explicitly documented', () => {
      const userId = 'user-tradeoff';
      const quota = createResourceQuota(userId, 'educational', DEFAULT_POLICY);
      const request = {
        qubits: 20,
        gateDepth: 60,
        estimatedTimeMs: 8000,
        purpose: 'Educational quantum computing workshop demonstrating quantum advantage with Shor\'s algorithm implementation for factoring large numbers'
      };

      const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

      expect(result.ethicalExplanation.tradeoffs).toBeDefined();
      expect(result.ethicalExplanation.tradeoffs!.length).toBeGreaterThan(0);
      
      const tradeoff = result.ethicalExplanation.tradeoffs![0];
      expect(tradeoff.principle).toBeDefined();
      expect(tradeoff.impact).toBeDefined();
      expect(tradeoff.justification).toBeDefined();
      expect(tradeoff.principle.length).toBeGreaterThan(5);
      expect(tradeoff.justification.length).toBeGreaterThan(10);
    });
  });

  describe('Policy Explanation', () => {
    test('explainEthicalPolicy returns comprehensive explanation', () => {
      const explanation = explainEthicalPolicy(DEFAULT_POLICY);

      expect(explanation.summary).toBeDefined();
      expect(explanation.summary).toContain(DEFAULT_POLICY.name);
      expect(explanation.summary.length).toBeGreaterThan(20);

      expect(explanation.principles).toBeDefined();
      expect(explanation.principles.length).toBeGreaterThan(3);

      expect(explanation.priorityJustification).toBeDefined();
      expect(explanation.priorityJustification.educational).toBeDefined();
      expect(explanation.priorityJustification.research).toBeDefined();
      expect(explanation.priorityJustification.commercial).toBeDefined();
      expect(explanation.priorityJustification.community).toBeDefined();

      expect(explanation.thresholdJustification).toBeDefined();
      expect(explanation.thresholdJustification).toContain('70');
      expect(explanation.thresholdJustification).toContain('0.7');

      expect(explanation.userChoices).toBeDefined();
      expect(explanation.userChoices.length).toBeGreaterThan(3);
    });

    test('priority justifications explain each role', () => {
      const explanation = explainEthicalPolicy(DEFAULT_POLICY);

      const roles = ['educational', 'research', 'commercial', 'community'] as const;
      
      for (const role of roles) {
        const justification = explanation.priorityJustification[role];
        expect(justification).toBeDefined();
        expect(justification).toContain('Weight');
        expect(justification.length).toBeGreaterThan(30);
        
        // Should mention the priority weight
        const weight = DEFAULT_POLICY.priorityWeights[role];
        expect(justification).toContain(weight.toString());
      }
    });

    test('user choices include actionable options', () => {
      const explanation = explainEthicalPolicy(DEFAULT_POLICY);

      expect(explanation.userChoices.length).toBeGreaterThanOrEqual(5);
      
      // Verify choices are actionable
      const keywords = ['choose', 'write', 'request', 'view', 'use'];
      let foundKeywords = 0;
      
      for (const choice of explanation.userChoices) {
        expect(choice.length).toBeGreaterThan(10);
        if (keywords.some(k => choice.toLowerCase().includes(k))) {
          foundKeywords++;
        }
      }
      
      expect(foundKeywords).toBeGreaterThan(3);
    });

    test('principles align with framework values', () => {
      const explanation = explainEthicalPolicy(DEFAULT_POLICY);

      const expectedThemes = [
        'equitable', 'access', 'educational', 'research',
        'quality', 'fairness', 'transparent'
      ];

      const principlesText = explanation.principles.join(' ').toLowerCase();
      
      let foundThemes = 0;
      for (const theme of expectedThemes) {
        if (principlesText.includes(theme)) {
          foundThemes++;
        }
      }

      // At least 5 of these themes should be present
      expect(foundThemes).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Metrics Transparency', () => {
    test('metrics are included in all decisions', () => {
      const userId = 'metrics-user';
      const quota = createResourceQuota(userId, 'research', DEFAULT_POLICY);
      const request = {
        qubits: 15,
        gateDepth: 40,
        estimatedTimeMs: 6000,
        purpose: 'Quantum chemistry simulation for drug discovery using variational quantum eigensolver with hamiltonian decomposition'
      };

      const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

      expect(result.ethicalExplanation.metrics).toBeDefined();
      expect(result.ethicalExplanation.metrics.fairnessScore).toBeGreaterThanOrEqual(0);
      expect(result.ethicalExplanation.metrics.fairnessScore).toBeLessThanOrEqual(1);
      expect(result.ethicalExplanation.metrics.coherenceScore).toBeGreaterThan(0);
      expect(result.ethicalExplanation.metrics.coherenceScore).toBeLessThanOrEqual(100);
      expect(result.ethicalExplanation.metrics.priorityWeight).toBeGreaterThan(0);
    });

    test('metrics match actual calculation', () => {
      const userId = 'verify-metrics';
      const quota = createResourceQuota(userId, 'commercial', DEFAULT_POLICY);
      const request = {
        qubits: 8,
        gateDepth: 25,
        estimatedTimeMs: 4000,
        purpose: 'Commercial quantum optimization for portfolio management using quantum approximate optimization algorithm with 10 layers'
      };

      const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

      // Verify priority weight matches policy
      const expectedWeight = DEFAULT_POLICY.priorityWeights.commercial;
      expect(result.ethicalExplanation.metrics.priorityWeight).toBe(expectedWeight);

      // Verify coherence matches wave analysis
      expect(result.ethicalExplanation.metrics.coherenceScore).toBe(result.waveAnalysis.coherence_score);

      // Verify fairness is within valid range
      expect(result.ethicalExplanation.metrics.fairnessScore).toBeGreaterThanOrEqual(0);
      expect(result.ethicalExplanation.metrics.fairnessScore).toBeLessThanOrEqual(1);
    });
  });

  describe('User Rights Transparency', () => {
    test('user rights are always provided', () => {
      const testScenarios = [
        { role: 'educational' as const, shouldSucceed: true },
        { role: 'commercial' as const, shouldSucceed: true },
      ];

      for (const scenario of testScenarios) {
        const userId = `rights-user-${scenario.role}`;
        const quota = createResourceQuota(userId, scenario.role, DEFAULT_POLICY);
        const request = {
          qubits: 10,
          gateDepth: 30,
          estimatedTimeMs: 5000,
          purpose: scenario.shouldSucceed 
            ? 'Quantum algorithm research for optimization problems using variational methods and parameterized circuits'
            : 'test'
        };

        const result = allocateResources(userId, request, quota, [], DEFAULT_POLICY);

        expect(result.ethicalExplanation.userRights).toBeDefined();
        expect(result.ethicalExplanation.userRights.length).toBeGreaterThan(0);
        
        // Rights should be meaningful
        for (const right of result.ethicalExplanation.userRights) {
          expect(right.length).toBeGreaterThan(15);
        }
      }
    });

    test('rejected requests provide appeal rights', () => {
      const userId = 'appeal-user';
      const quota = createResourceQuota(userId, 'community', DEFAULT_POLICY);
      
      // Create heavy prior usage to ensure rejection/deferral
      const heavyPriorAllocations = Array.from({ length: 5 }, (_, i) => ({
        allocationId: `appeal-prior-${i}`,
        userId,
        qubits: 95,
        gateDepth: 100,
        estimatedTimeMs: 3500000, // ~58 minutes
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 30000 * (i + 1)).toISOString(),
        fairnessScore: 0.4
      }));

      const request = {
        qubits: 5,
        gateDepth: 15,
        estimatedTimeMs: 2000,
        purpose: 'Quantum simulation request'
      };

      const result = allocateResources(userId, request, quota, heavyPriorAllocations, DEFAULT_POLICY);

      // Should be deferred/rejected due to low fairness
      expect(result.allocation).toBeUndefined();
      
      const rightsText = result.ethicalExplanation.userRights.join(' ').toLowerCase();
      
      // Should mention ability to resubmit, override, or review
      const appealKeywords = ['resubmit', 'override', 'review', 'request', 'wait', 'monitor', 'queue'];
      const hasAppealRight = appealKeywords.some(keyword => rightsText.includes(keyword));
      
      expect(hasAppealRight).toBe(true);
    });
  });

  describe('Max Allocations Limit', () => {
    test('quota includes maxAllocations of 350', () => {
      const userId = 'max-alloc-user';
      const quota = createResourceQuota(userId, 'research', DEFAULT_POLICY);
      
      expect(quota.maxAllocations).toBe(350);
    });

    test('throws error when max allocations (350) is reached', () => {
      const userId = 'limit-user';
      const quota = createResourceQuota(userId, 'educational', DEFAULT_POLICY);
      
      // Create 350 previous allocations to reach the limit
      const maxAllocations = Array.from({ length: 350 }, (_, i) => ({
        allocationId: `alloc-${i}`,
        userId,
        qubits: 5,
        gateDepth: 10,
        estimatedTimeMs: 1000,
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 1000 * (i + 1)).toISOString(),
        fairnessScore: 0.9
      }));

      const request = {
        qubits: 5,
        gateDepth: 10,
        estimatedTimeMs: 1000,
        purpose: 'Test request that should be rejected due to max allocations limit'
      };

      expect(() => {
        allocateResources(userId, request, quota, maxAllocations, DEFAULT_POLICY);
      }).toThrow(/Maximum allocations \(350\) reached/);
    });

    test('allows allocation when under 350 limit', () => {
      const userId = 'under-limit-user';
      const quota = createResourceQuota(userId, 'educational', DEFAULT_POLICY);
      
      // Create 349 previous allocations (one under the limit)
      const previousAllocations = Array.from({ length: 349 }, (_, i) => ({
        allocationId: `alloc-${i}`,
        userId,
        qubits: 5,
        gateDepth: 10,
        estimatedTimeMs: 1000,
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 86400000 - 1000 * (i + 1)).toISOString(), // More than 24h ago for fairness
        fairnessScore: 0.9
      }));

      const request = {
        qubits: 5,
        gateDepth: 10,
        estimatedTimeMs: 1000,
        purpose: 'Research quantum algorithms for molecular simulation with variational quantum eigensolver methods'
      };

      // Should not throw, allocation should proceed
      const result = allocateResources(userId, request, quota, previousAllocations, DEFAULT_POLICY);
      expect(result.allocation).toBeDefined();
      expect(result.ethicalExplanation.decision).toBe('approved');
    });
  });
});

/**
 * Resource Allocation Module
 *
 * Ensures equitable access to quantum computing resources through
 * priority scheduling, fair queuing, and resource quotas.
 */

import { analyzeWave, type WaveAnalysisResult } from '@spiralsafe/wave-toolkit';
import { createDecision, type AtomDecision } from '@spiralsafe/atom-trail';

/**
 * Detailed explanation for ethical decisions in resource allocation
 * Provides transparency into why choices were made
 */
export interface EthicalDecisionExplanation {
  decision: 'approved' | 'rejected' | 'deferred';
  reasoning: string;
  ethicalPrinciples: string[];
  tradeoffs?: {
    principle: string;
    impact: string;
    justification: string;
  }[];
  metrics: {
    fairnessScore: number;
    coherenceScore: number;
    priorityWeight: number;
  };
  alternativeOptions?: string[];
  userRights: string[];
}

export interface ResourceQuota {
  userId: string;
  role: 'educational' | 'research' | 'commercial' | 'community';
  maxQubits: number;
  maxGateDepth: number;
  maxExecutionTimeMs: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  allocatedAt: string;
  expiresAt?: string;
}

export interface ResourceAllocation {
  allocationId: string;
  userId: string;
  qubits: number;
  gateDepth: number;
  estimatedTimeMs: number;
  status: 'pending' | 'allocated' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  fairnessScore: number; // 0-1, higher is more fair
}

export interface EquitableAccessPolicy {
  name: string;
  description: string;
  minFairnessScore: number;
  priorityWeights: {
    educational: number;
    research: number;
    commercial: number;
    community: number;
  };
  coherenceThreshold: number; // Minimum coherence score (0-100)
}

/**
 * Default equitable access policy
 * Prioritizes educational and research use with 70% coherence baseline
 */
export const DEFAULT_POLICY: EquitableAccessPolicy = {
  name: 'Equitable Access v1.0',
  description: 'Prioritizes educational and research access with emergent ethics alignment',
  minFairnessScore: 0.7,
  priorityWeights: {
    educational: 1.5,
    research: 1.3,
    commercial: 0.8,
    community: 1.0
  },
  coherenceThreshold: 70 // 70% coherence baseline
};

/**
 * Calculate fairness score based on user history and current demand
 */
export function calculateFairnessScore(
  userId: string,
  previousAllocations: ResourceAllocation[],
  currentDemand: { qubits: number; timeMs: number }
): number {
  // Simple fairness: inversely proportional to recent usage
  const recentAllocations = previousAllocations.filter(
    a => a.userId === userId && 
    new Date(a.createdAt).getTime() > Date.now() - 86400000 // Last 24h
  );
  
  const totalRecentTime = recentAllocations.reduce(
    (sum, a) => sum + a.estimatedTimeMs, 0
  );
  
  const totalRecentQubits = recentAllocations.reduce(
    (sum, a) => sum + a.qubits, 0
  );
  
  // Normalize: less recent usage = higher score
  const timeScore = Math.max(0, 1 - (totalRecentTime / 3600000)); // 1 hour max
  const qubitScore = Math.max(0, 1 - (totalRecentQubits / 100)); // 100 qubits max
  
  return (timeScore + qubitScore) / 2;
}

/**
 * Allocate resources with equitable access controls
 * Returns detailed ethical explanation for transparency
 */
export function allocateResources(
  userId: string,
  request: { qubits: number; gateDepth: number; estimatedTimeMs: number; purpose: string },
  quota: ResourceQuota,
  previousAllocations: ResourceAllocation[],
  policy: EquitableAccessPolicy = DEFAULT_POLICY
): { 
  allocation?: ResourceAllocation; 
  decision: AtomDecision; 
  waveAnalysis: WaveAnalysisResult;
  ethicalExplanation: EthicalDecisionExplanation;
} {
  // Validate against quota
  if (request.qubits > quota.maxQubits) {
    throw new Error(`Requested qubits (${request.qubits}) exceeds quota (${quota.maxQubits})`);
  }
  
  if (request.gateDepth > quota.maxGateDepth) {
    throw new Error(`Requested gate depth (${request.gateDepth}) exceeds quota (${quota.maxGateDepth})`);
  }
  
  if (request.estimatedTimeMs > quota.maxExecutionTimeMs) {
    throw new Error(`Requested time (${request.estimatedTimeMs}ms) exceeds quota (${quota.maxExecutionTimeMs}ms)`);
  }
  
  // Analyze purpose for coherence
  const waveAnalysis = analyzeWave(request.purpose);
  
  if (waveAnalysis.coherence_score < policy.coherenceThreshold) {
    const decision = createDecision(
      'VERIFY',
      `Resource allocation rejected: purpose coherence ${waveAnalysis.coherence_score} below threshold ${policy.coherenceThreshold}`,
      [],
      ['resource-allocation', 'rejected', 'low-coherence']
    );
    
    const ethicalExplanation: EthicalDecisionExplanation = {
      decision: 'rejected',
      reasoning: `Your request purpose shows ${waveAnalysis.coherence_score.toFixed(1)}% coherence, which is below our ${policy.coherenceThreshold}% baseline. This baseline ensures that quantum resources are used for well-defined, structured purposes that benefit the community.`,
      ethicalPrinciples: [
        'Resource Stewardship: Quantum computing resources are limited and should serve clear, beneficial purposes',
        'Quality Assurance: High coherence prevents misuse and ensures meaningful applications',
        'Equitable Access: Clear purposes allow fair priority assessment across all users'
      ],
      tradeoffs: [{
        principle: 'Openness vs. Quality',
        impact: 'We prioritize quality to ensure quantum resources create maximum value',
        justification: 'Without quality standards, resources could be wasted on poorly-defined tasks, reducing availability for everyone'
      }],
      metrics: {
        fairnessScore: 0, // Not relevant for coherence-based rejection; fairness not yet evaluated
        coherenceScore: waveAnalysis.coherence_score,
        priorityWeight: policy.priorityWeights[quota.role] ?? 0
      },
      alternativeOptions: [
        'Revise your purpose statement to be more specific and structured',
        'Provide additional context explaining the scientific or educational value',
        'Break down your request into clearer, well-defined sub-tasks'
      ],
      userRights: [
        'You can resubmit with an improved purpose statement at any time',
        'You can view the coherence metrics (curl, divergence, potential, entropy) to understand the assessment',
        'You can contact support if you believe this is a critical use case requiring urgent review'
      ]
    };
    
    return { decision, waveAnalysis, ethicalExplanation };
  }
  
  // Calculate fairness
  const fairnessScore = calculateFairnessScore(userId, previousAllocations, {
    qubits: request.qubits,
    timeMs: request.estimatedTimeMs
  });
  
  if (fairnessScore < policy.minFairnessScore) {
    const decision = createDecision(
      'VERIFY',
      `Resource allocation deferred: fairness score ${fairnessScore.toFixed(2)} below minimum ${policy.minFairnessScore}`,
      [],
      ['resource-allocation', 'deferred', 'fairness']
    );
    
    const recentUsage = previousAllocations.filter(
      a => a.userId === userId && 
      new Date(a.createdAt).getTime() > Date.now() - 86400000
    );
    const totalRecentQubits = recentUsage.reduce((sum, a) => sum + a.qubits, 0);
    const totalRecentTimeMs = recentUsage.reduce((sum, a) => sum + a.estimatedTimeMs, 0);
    
    // Find the oldest usage to calculate accurate wait time
    const oldestUsageTime = recentUsage.length > 0
      ? Math.min(...recentUsage.map(a => new Date(a.createdAt).getTime()))
      : Date.now();
    const hoursUntilReset = Math.max(1, Math.ceil((86400000 - (Date.now() - oldestUsageTime)) / 3600000));
    
    const ethicalExplanation: EthicalDecisionExplanation = {
      decision: 'deferred',
      reasoning: `Your fairness score is ${(fairnessScore * 100).toFixed(1)}%, below our ${(policy.minFairnessScore * 100)}% minimum. This is based on your recent usage: ${totalRecentQubits} qubits over ${(totalRecentTimeMs / 60000).toFixed(1)} minutes in the last 24 hours. We defer to ensure equitable access for all users.`,
      ethicalPrinciples: [
        'Equitable Access: All users deserve fair opportunity to use quantum resources',
        'Anti-Monopolization: Heavy users must yield to ensure diverse access',
        'Temporal Fairness: Recent usage affects current priority to prevent hoarding'
      ],
      tradeoffs: [{
        principle: 'Individual Need vs. Collective Fairness',
        impact: 'Your immediate request is deferred to serve other users with less recent usage',
        justification: 'Fair distribution maximizes total community benefit and prevents resource monopolization'
      }],
      metrics: {
        fairnessScore: fairnessScore,
        coherenceScore: waveAnalysis.coherence_score,
        priorityWeight: policy.priorityWeights[quota.role] ?? 0
      },
      alternativeOptions: [
        `Wait approximately ${hoursUntilReset} hours for your usage window to reset`,
        'Request a smaller allocation that fits within fairness constraints',
        'Use the native TypeScript quantum simulator for prototyping instead'
      ],
      userRights: [
        'Your request is temporarily deferred based on fairness constraints and can be retried once your recent usage normalizes',
        'You can inspect your fairness-related status and recent-usage impact through the framework status API',
        'You retain all future access rights - this is temporary throttling only'
      ]
    };
    
    return { decision, waveAnalysis, ethicalExplanation };
  }
  
  // Create allocation
  const allocation: ResourceAllocation = {
    allocationId: crypto.randomUUID(),
    userId,
    qubits: request.qubits,
    gateDepth: request.gateDepth,
    estimatedTimeMs: request.estimatedTimeMs,
    status: 'allocated',
    createdAt: new Date().toISOString(),
    fairnessScore
  };
  
  const decision = createDecision(
    'COMPLETE',
    `Resources allocated: ${request.qubits} qubits, fairness score ${fairnessScore.toFixed(2)}`,
    [],
    ['resource-allocation', 'approved', `coherence-${waveAnalysis.coherence_score}`]
  );
  
  const priorityWeight = policy.priorityWeights[quota.role];
  
  const ethicalExplanation: EthicalDecisionExplanation = {
    decision: 'approved',
    reasoning: `Your request has been approved with ${(fairnessScore * 100).toFixed(1)}% fairness score and ${waveAnalysis.coherence_score.toFixed(1)}% coherence. You are allocated ${request.qubits} qubits for up to ${(request.estimatedTimeMs / 60000).toFixed(1)} minutes. Your '${quota.role}' role has a priority weighting of ${priorityWeight}x.`,
    ethicalPrinciples: [
      'Earned Access: Your fairness score reflects responsible prior usage',
      'Quality Standards: Your purpose meets our coherence baseline for beneficial use',
      'Role-Based Priority: Educational and research users receive higher weights to advance knowledge',
      'Transparent Allocation: All metrics and weightings are visible to you'
    ],
    tradeoffs: [{
      principle: 'Individual Grant vs. Community Reserve',
      impact: `These ${request.qubits} qubits are temporarily unavailable to others`,
      justification: 'Your allocation serves the collective good through knowledge advancement and meets all fairness criteria'
    }],
    metrics: {
      fairnessScore: fairnessScore,
      coherenceScore: waveAnalysis.coherence_score,
      priorityWeight: priorityWeight
    },
    alternativeOptions: [],
    userRights: [
      'You may use these resources for your stated purpose only',
      'You can view real-time execution progress through the provenance tracker',
      'Your measurement data is protected using strict access controls and privacy safeguards',
      'You can request a larger allocation once your fairness score improves'
    ]
  };
  
  return { allocation, decision, waveAnalysis, ethicalExplanation };
}

/**
 * Create resource quota for a user based on role
 */
export function createResourceQuota(
  userId: string,
  role: 'educational' | 'research' | 'commercial' | 'community',
  policy: EquitableAccessPolicy = DEFAULT_POLICY
): ResourceQuota {
  const weight = policy.priorityWeights[role];
  
  return {
    userId,
    role,
    maxQubits: Math.floor(50 * weight),
    maxGateDepth: Math.floor(100 * weight),
    maxExecutionTimeMs: Math.floor(3600000 * weight), // 1 hour base
    priority: weight > 1.2 ? 'high' : weight > 1.0 ? 'medium' : 'low',
    allocatedAt: new Date().toISOString()
  };
}

/**
 * Priority queue for resource scheduling
 */
export class ResourceScheduler {
  private queue: Array<{
    allocation: ResourceAllocation;
    priority: number;
    submittedAt: Date;
  }> = [];
  
  enqueue(allocation: ResourceAllocation, priorityWeight: number): void {
    const priority = allocation.fairnessScore * priorityWeight;
    this.queue.push({
      allocation,
      priority,
      submittedAt: new Date()
    });
    
    // Sort by priority (higher first), then by submission time (FIFO)
    this.queue.sort((a, b) => {
      if (Math.abs(a.priority - b.priority) > 0.01) {
        return b.priority - a.priority;
      }
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });
  }
  
  dequeue(): ResourceAllocation | undefined {
    const item = this.queue.shift();
    return item?.allocation;
  }
  
  peek(): ResourceAllocation | undefined {
    return this.queue[0]?.allocation;
  }
  
  size(): number {
    return this.queue.length;
  }
  
  getQueue(): ResourceAllocation[] {
    return this.queue.map(item => item.allocation);
  }
}

/**
 * Get a human-readable explanation of the ethical policy
 * Provides transparency into the choices made by the framework
 */
export function explainEthicalPolicy(
  policy: EquitableAccessPolicy = DEFAULT_POLICY
): {
  summary: string;
  principles: string[];
  priorityJustification: Record<string, string>;
  thresholdJustification: string;
  userChoices: string[];
} {
  return {
    summary: `${policy.name}: ${policy.description}. This policy embodies our commitment to equitable quantum computing access while maintaining quality standards.`,
    principles: [
      'Equitable Access: All users receive fair opportunity regardless of affiliation or resources',
      `Educational Priority: Learning and research advance collective knowledge and receive elevated weight (educational ${policy.priorityWeights.educational}x, research ${policy.priorityWeights.research}x)`,
      `Quality Baseline: ${policy.coherenceThreshold}% coherence threshold ensures resources serve clear, beneficial purposes`,
      'Fairness Scoring: Recent usage affects priority to prevent monopolization',
      'Transparent Metrics: All decisions show calculations and can be audited',
      'User Rights: Resubmissions and support escalations are always available'
    ],
    priorityJustification: {
      educational: `Weight ${policy.priorityWeights.educational}x - Education creates future quantum scientists and democratizes access to quantum knowledge. Higher priority serves long-term community growth.`,
      research: `Weight ${policy.priorityWeights.research}x - Research advances the field and benefits all users through discoveries. Higher priority accelerates collective progress.`,
      commercial: `Weight ${policy.priorityWeights.commercial}x - Commercial use is valuable but has access to private resources. Lower priority ensures public resources serve public good first.`,
      community: `Weight ${policy.priorityWeights.community}x - Community projects balance public benefit with resource constraints. Standard priority provides fair baseline access.`
    },
    thresholdJustification: `Coherence threshold of ${policy.coherenceThreshold}% and fairness minimum of ${policy.minFairnessScore} were chosen through analysis of beneficial quantum computing use cases. Lower thresholds risk resource waste; higher thresholds risk exclusion. These values maximize both access and utility.`,
    userChoices: [
      'Choose your role honestly - educational/research users get priority',
      'Write clear purpose statements - coherence is measurable and improves with structure',
      'Distribute usage over time - fairness scores reward sustainable access patterns',
      'Contact support for critical use cases requiring urgent review',
      'View all metrics - transparency enables informed resubmissions',
      'Use alternatives - native TypeScript simulator available for prototyping'
    ]
  };
}

// Project Lazarus - Source Validation and Confidence Scoring
// Evaluates source quality and calculates confidence scores

import type { Source, SourceTier, ConfidenceScore } from './types';

/**
 * Domain classifications for web sources
 */
const TIER_2_DOMAINS = [
  // Government
  '.gov', 'nih.gov', 'cdc.gov', 'fda.gov', 'who.int',
  // Education
  '.edu', 'harvard.edu', 'stanford.edu', 'mit.edu',
  // Peer-reviewed journals
  'pubmed.ncbi.nlm.nih.gov', 'nejm.org', 'thelancet.com', 'bmj.com',
  'jamanetwork.com', 'nature.com', 'science.org', 'cell.com',
];

const TIER_3_DOMAINS = [
  // Medical organizations
  'mayoclinic.org', 'clevelandclinic.org', 'hopkinsmedicine.org',
  'cancer.org', 'heart.org', 'diabetes.org', 'arthritis.org',
  // Professional associations
  'ama-assn.org', 'acponline.org', 'aafp.org', 'asco.org',
  // Established health institutions
  'webmd.com', 'healthline.com', 'medlineplus.gov',
];

const TIER_5_DOMAINS = [
  // Social media
  'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
  'reddit.com', 'quora.com', 'yahoo.com',
  // Forums and user-generated content
  'forum', 'blog', 'wordpress.com', 'medium.com',
];

/**
 * Classifies a web source into a tier based on domain
 */
export function classifyWebSource(url: string, domain: string): SourceTier {
  const lowerDomain = domain.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Check Tier 2 (authoritative)
  for (const tier2Domain of TIER_2_DOMAINS) {
    if (lowerDomain.includes(tier2Domain) || lowerUrl.includes(tier2Domain)) {
      return 2; // SourceTier.TIER_2_AUTHORITATIVE
    }
  }

  // Check Tier 5 (unverified)
  for (const tier5Domain of TIER_5_DOMAINS) {
    if (lowerDomain.includes(tier5Domain) || lowerUrl.includes(tier5Domain)) {
      return 5; // SourceTier.TIER_5_UNVERIFIED
    }
  }

  // Check Tier 3 (professional)
  for (const tier3Domain of TIER_3_DOMAINS) {
    if (lowerDomain.includes(tier3Domain) || lowerUrl.includes(tier3Domain)) {
      return 3; // SourceTier.TIER_3_PROFESSIONAL
    }
  }

  // Default to Tier 4 (general)
  return 4; // SourceTier.TIER_4_GENERAL
}

/**
 * Checks if a source is outdated and generates warnings
 */
export function checkSourceAge(
  publishDate: Date | undefined,
  contentType: 'medical' | 'technology' | 'general'
): string[] {
  const warnings: string[] = [];

  if (!publishDate) {
    warnings.push('Publication date unknown - cannot verify currency');
    return warnings;
  }

  const now = new Date();
  const ageInMonths = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  // Medical information
  if (contentType === 'medical') {
    if (ageInMonths > 24) {
      warnings.push(`Medical information is ${Math.floor(ageInMonths / 12)} years old - may be outdated`);
    } else if (ageInMonths > 12) {
      warnings.push('Medical information is over 1 year old - verify with recent sources');
    }
  }

  // Technology information
  if (contentType === 'technology') {
    if (ageInMonths > 6) {
      warnings.push(`Technology information is ${Math.floor(ageInMonths)} months old - may be outdated`);
    }
  }

  // General information
  if (contentType === 'general') {
    if (ageInMonths > 36) {
      warnings.push(`Information is ${Math.floor(ageInMonths / 12)} years old - consider newer sources`);
    }
  }

  return warnings;
}

/**
 * Detects conflicts between sources
 */
export function detectConflicts(sources: Source[]): { hasConflicts: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  // Group sources by tier
  const tier1Sources = sources.filter(s => s.tier === 1);
  const tier2Sources = sources.filter(s => s.tier === 2);
  const tier3Sources = sources.filter(s => s.tier === 3);
  const tier4PlusSources = sources.filter(s => s.tier >= 4);

  // Check for conflicts between high-tier and low-tier sources
  if (tier1Sources.length > 0 && tier4PlusSources.length > 0) {
    conflicts.push('Conflict detected: Medical records contradict general web sources');
  }

  if (tier2Sources.length > 0 && tier4PlusSources.length > 0) {
    conflicts.push('Conflict detected: Authoritative sources contradict general web sources');
  }

  // Check for date conflicts (old vs new information)
  const datedSources = sources.filter(s => s.publishDate);
  if (datedSources.length >= 2) {
    const dates = datedSources.map(s => s.publishDate!.getTime());
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    const ageGapYears = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (ageGapYears > 3) {
      conflicts.push(`Large time gap between sources (${Math.floor(ageGapYears)} years) - information may conflict`);
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

/**
 * Calculates overall confidence score based on sources
 */
export function calculateConfidence(sources: Source[]): ConfidenceScore {
  if (sources.length === 0) {
    return {
      overall: 0.3,
      reasoning: 'No sources available - relying on general knowledge only',
      sourceBreakdown: {
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        tier4PlusCount: 0
      },
      hasConflicts: false,
      warnings: ['No source verification possible']
    };
  }

  // Count sources by tier
  const tier1Count = sources.filter(s => s.tier === 1).length;
  const tier2Count = sources.filter(s => s.tier === 2).length;
  const tier3Count = sources.filter(s => s.tier === 3).length;
  const tier4PlusCount = sources.filter(s => s.tier >= 4).length;

  // Calculate base confidence from source quality
  let baseConfidence = 0;
  baseConfidence += tier1Count * 0.35; // Medical records are highest value
  baseConfidence += tier2Count * 0.25; // Authoritative sources
  baseConfidence += tier3Count * 0.15; // Professional sources
  baseConfidence += tier4PlusCount * 0.05; // General sources

  // Cap at 1.0
  baseConfidence = Math.min(1.0, baseConfidence);

  // Adjust for source diversity (multiple sources increase confidence)
  const diversityBonus = Math.min(0.1, sources.length * 0.02);
  baseConfidence += diversityBonus;

  // Check for conflicts
  const conflictAnalysis = detectConflicts(sources);
  if (conflictAnalysis.hasConflicts) {
    baseConfidence *= 0.7; // Reduce confidence by 30% if conflicts exist
  }

  // Check for age warnings
  const warnings: string[] = [];
  sources.forEach(source => {
    const ageWarnings = checkSourceAge(source.publishDate, 'medical');
    warnings.push(...ageWarnings);
    if (ageWarnings.length > 0) {
      baseConfidence *= 0.95; // Slight reduction for each age warning
    }
  });

  // Add source-specific warnings
  sources.forEach(source => {
    if (source.warnings) {
      warnings.push(...source.warnings);
    }
  });

  // Add conflict warnings
  warnings.push(...conflictAnalysis.conflicts);

  // Generate reasoning
  let reasoning = '';
  if (tier1Count > 0) {
    reasoning = `High confidence: Based on ${tier1Count} verified medical record(s)`;
  } else if (tier2Count > 0) {
    reasoning = `High confidence: Based on ${tier2Count} authoritative source(s)`;
  } else if (tier3Count > 0) {
    reasoning = `Moderate confidence: Based on ${tier3Count} professional source(s)`;
  } else {
    reasoning = `Low confidence: Based on ${tier4PlusCount} general web source(s)`;
  }

  if (sources.length > 5) {
    reasoning += ` with strong source diversity (${sources.length} total sources)`;
  }

  if (conflictAnalysis.hasConflicts) {
    reasoning += '. WARNING: Conflicts detected between sources';
  }

  return {
    overall: Math.max(0, Math.min(1.0, baseConfidence)),
    reasoning,
    sourceBreakdown: {
      tier1Count,
      tier2Count,
      tier3Count,
      tier4PlusCount
    },
    hasConflicts: conflictAnalysis.hasConflicts,
    warnings: [...new Set(warnings)] // Remove duplicates
  };
}

/**
 * Validates and enriches a source with metadata
 */
export function validateSource(source: Partial<Source>): Source {
  const warnings: string[] = [];

  // Determine tier
  let tier: SourceTier;
  if (source.documentId) {
    tier = 1; // Medical record
  } else if (source.url && source.domain) {
    tier = classifyWebSource(source.url, source.domain);
  } else {
    tier = 5; // Unknown source
    warnings.push('Source origin unknown');
  }

  // Check age
  if (source.publishDate) {
    const ageWarnings = checkSourceAge(source.publishDate, 'medical');
    warnings.push(...ageWarnings);
  }

  // Check for missing metadata
  if (!source.author && tier <= 3) {
    warnings.push('Author information not available');
  }

  // Calculate individual source confidence
  let confidence = 1.0;
  if (tier === 1) confidence = 0.95;
  else if (tier === 2) confidence = 0.85;
  else if (tier === 3) confidence = 0.75;
  else if (tier === 4) confidence = 0.60;
  else confidence = 0.40;

  // Reduce confidence for warnings
  confidence -= warnings.length * 0.05;
  confidence = Math.max(0.1, confidence);

  return {
    tier,
    content: source.content || '',
    url: source.url,
    domain: source.domain,
    documentId: source.documentId,
    publishDate: source.publishDate,
    author: source.author,
    confidence,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Formats confidence score for display
 */
export function formatConfidenceLevel(score: number): string {
  if (score >= 0.8) return 'High ✓';
  if (score >= 0.5) return 'Moderate ℹ️';
  return 'Low ⚠️';
}

/**
 * Formats source tier for display
 */
export function formatSourceTier(tier: SourceTier): string {
  switch (tier) {
    case 1: return 'Verified Medical Record ✓✓✓';
    case 2: return 'Authoritative Source ✓✓';
    case 3: return 'Professional Source ✓';
    case 4: return 'General Source ℹ️';
    case 5: return 'Unverified Source ⚠️';
    default: return 'Unknown Source';
  }
}

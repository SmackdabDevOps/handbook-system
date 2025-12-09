#!/usr/bin/env ts-node
/**
 * Check Phase Prerequisites - Chain of Trust Enforcement
 *
 * TEMPLATE: Copy to your project's scripts/validation/ directory
 *
 * Validates that prerequisite phases are complete before allowing work on later phases.
 * Can check by phase number or by file path (auto-detects phase from file location).
 *
 * Usage:
 *   npx ts-node scripts/validation/check-phase-prerequisites.ts --phase 2
 *   npx ts-node scripts/validation/check-phase-prerequisites.ts --file openapi/paths/auth.yaml
 *
 * CUSTOMIZATION REQUIRED:
 * 1. Update FILE_MAPPINGS to match your project structure
 * 2. Update REGISTRY_PATH if different
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types
// =============================================================================

interface PhaseGate {
  name?: string;
  requiredChecks?: string[];
  requiredValidators?: string[];
  requiredPassRate?: number;
  lastCheck?: string;
  passed?: boolean;
  lastDetails?: string;
  description?: string;
}

interface ValidationRegistry {
  phaseGates: {
    phase0?: PhaseGate;
    phase1?: PhaseGate;
    phase2?: PhaseGate;
    phase3?: PhaseGate;
    'phase4-coverage'?: PhaseGate;
    phase4?: PhaseGate;
    'phase5-coverage'?: PhaseGate;
    phase5?: PhaseGate;
    phase6?: PhaseGate;
  };
}

interface FileMapping {
  pattern: RegExp;
  phase: number;
  description: string;
}

// =============================================================================
// CUSTOMIZE: Registry path
// =============================================================================
const REGISTRY_PATH = path.join(__dirname, 'validation-registry.json');

// =============================================================================
// CUSTOMIZE: Phase dependencies
// =============================================================================
const PHASE_DEPENDENCIES: Record<number, number | null> = {
  0: null, // Phase 0 has no prerequisites
  1: 0, // Phase 1 requires Phase 0
  2: 1, // Phase 2 requires Phase 1
  3: 2, // Phase 3 requires Phase 2
  4: 3, // Phase 4 requires Phase 3
  5: 4, // Phase 5 requires Phase 4
  6: 5, // Phase 6 requires Phase 5
};

// =============================================================================
// CUSTOMIZE: File to phase mappings
// =============================================================================
const FILE_MAPPINGS: FileMapping[] = [
  {
    pattern: /^docs\/user-stories\/.*\.md$/,
    phase: 1,
    description: 'User story (Phase 1)',
  },
  {
    pattern: /^docs\/business-rules\/.*\.md$/,
    phase: 1,
    description: 'Business rule (Phase 1)',
  },
  {
    pattern: /^openapi\/paths\/.*\.yaml$/,
    phase: 2,
    description: 'OpenAPI path definition (Phase 2)',
  },
  {
    pattern: /^openapi\/schemas\/.*\.yaml$/,
    phase: 2,
    description: 'OpenAPI schema definition (Phase 2)',
  },
  {
    pattern: /^specs\/.*\.yaml$/,
    phase: 2,
    description: 'OpenAPI spec (Phase 2) - Single-Service stack',
  },
  {
    pattern: /^src\/modules\/.*\/services\/.*\.ts$/,
    phase: 3,
    description: 'Service implementation (Phase 3)',
  },
  {
    pattern: /^src\/modules\/.*\/controllers\/.*\.ts$/,
    phase: 3,
    description: 'Controller implementation (Phase 3)',
  },
  {
    pattern: /^src\/modules\/.*\/dto\/.*\.ts$/,
    phase: 3,
    description: 'DTO implementation (Phase 3)',
  },
  {
    pattern: /^docs\/test-plans\/validation-specs\/.*\.md$/,
    phase: 4,
    description: 'UX validation spec (Phase 4)',
  },
  {
    pattern: /^scripts\/validation\/validate-.*\.ts$/,
    phase: 5,
    description: 'Validation script (Phase 5)',
  },
  {
    pattern: /^docs\/frontend\/endpoint-maps\/.*\.md$/,
    phase: 6,
    description: 'Frontend endpoint map (Phase 6)',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function loadRegistry(): ValidationRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`ERROR: Validation registry not found at ${REGISTRY_PATH}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    console.error(`ERROR: Failed to parse validation registry: ${error.message}`);
    process.exit(1);
  }
}

function getPhaseStatus(registry: ValidationRegistry, phase: number): boolean | null {
  const phaseKey = `phase${phase}` as keyof ValidationRegistry['phaseGates'];
  const coverageKey = `phase${phase}-coverage` as keyof ValidationRegistry['phaseGates'];

  // Check coverage gate first (if it exists)
  const coverageGate = registry.phaseGates[coverageKey];
  if (coverageGate && coverageGate.passed === false) {
    return false;
  }

  // Check main phase gate
  const phaseGate = registry.phaseGates[phaseKey];
  if (!phaseGate) {
    return null; // Phase not defined
  }

  return phaseGate.passed ?? null;
}

function getPhaseDescription(registry: ValidationRegistry, phase: number): string {
  const phaseKey = `phase${phase}` as keyof ValidationRegistry['phaseGates'];
  const phaseGate = registry.phaseGates[phaseKey];

  if (phaseGate && phaseGate.name) {
    return phaseGate.name;
  }

  // CUSTOMIZE: Phase names
  const phaseNames: Record<number, string> = {
    0: 'Foundation',
    1: 'Stories & Business Rules',
    2: 'Contracts & Registry',
    3: 'Backend Implementation',
    4: 'UX Validation',
    5: 'Test Execution',
    6: 'Frontend Integration',
  };

  return phaseNames[phase] || `Phase ${phase}`;
}

function checkPhasePrerequisites(phase: number): { met: boolean; message: string } {
  const registry = loadRegistry();
  const prerequisitePhase = PHASE_DEPENDENCIES[phase];

  // Phase 0 has no prerequisites
  if (prerequisitePhase === null) {
    return { met: true, message: `Phase ${phase} has no prerequisites.` };
  }

  // Check if prerequisite phase exists
  if (prerequisitePhase === undefined) {
    return {
      met: false,
      message: `ERROR: Invalid phase number ${phase}. Valid phases are 0-6.`,
    };
  }

  // Check if prerequisite phase is validated
  const prerequisiteStatus = getPhaseStatus(registry, prerequisitePhase);
  const prerequisiteDesc = getPhaseDescription(registry, prerequisitePhase);
  const currentDesc = getPhaseDescription(registry, phase);

  if (prerequisiteStatus === null) {
    return {
      met: false,
      message: `ERROR: Prerequisite Phase ${prerequisitePhase} (${prerequisiteDesc}) has not been validated yet.\nYou must complete Phase ${prerequisitePhase} before working on Phase ${phase} (${currentDesc}).`,
    };
  }

  if (prerequisiteStatus === false) {
    return {
      met: false,
      message: `ERROR: Prerequisite Phase ${prerequisitePhase} (${prerequisiteDesc}) validation FAILED.\nYou must fix Phase ${prerequisitePhase} issues before working on Phase ${phase} (${currentDesc}).`,
    };
  }

  // Prerequisites met
  return {
    met: true,
    message: `✓ Prerequisites met for Phase ${phase} (${currentDesc}).\n  Phase ${prerequisitePhase} (${prerequisiteDesc}) is validated.`,
  };
}

function getFilePhase(filePath: string): { phase: number; description: string } | null {
  // Normalize path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, '');

  for (const mapping of FILE_MAPPINGS) {
    if (mapping.pattern.test(normalizedPath)) {
      return {
        phase: mapping.phase,
        description: mapping.description,
      };
    }
  }

  return null;
}

function checkFilePrerequisites(filePath: string): { met: boolean; message: string } {
  const fileInfo = getFilePhase(filePath);

  if (!fileInfo) {
    return {
      met: false,
      message: `ERROR: Could not determine phase for file: ${filePath}\nThis file does not match any known phase patterns.`,
    };
  }

  const { phase, description } = fileInfo;
  const result = checkPhasePrerequisites(phase);

  const prefix = `File: ${filePath}\nType: ${description}\n\n`;
  return {
    met: result.met,
    message: prefix + result.message,
  };
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('ERROR: Missing required arguments.\n');
    console.error('Usage:');
    console.error('  check-phase-prerequisites.ts --phase N');
    console.error('  check-phase-prerequisites.ts --file PATH');
    console.error('');
    console.error('Examples:');
    console.error('  check-phase-prerequisites.ts --phase 2');
    console.error('  check-phase-prerequisites.ts --file openapi/paths/auth.yaml');
    process.exit(1);
  }

  const command = args[0];
  const value = args[1];

  if (!value) {
    console.error(`ERROR: Missing value for ${command}\n`);
    process.exit(1);
  }

  let result: { met: boolean; message: string };

  if (command === '--phase') {
    const phase = parseInt(value, 10);
    if (isNaN(phase)) {
      console.error(`ERROR: Invalid phase number: ${value}`);
      process.exit(1);
    }
    result = checkPhasePrerequisites(phase);
  } else if (command === '--file') {
    result = checkFilePrerequisites(value);
  } else {
    console.error(`ERROR: Unknown command: ${command}`);
    console.error('Valid commands: --phase, --file');
    process.exit(1);
  }

  console.log(result.message);
  process.exit(result.met ? 0 : 1);
}

main();

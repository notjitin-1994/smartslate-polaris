// src/polaris/needs-analysis/experience.ts
import type { NAField } from './types';

export const EXPERIENCE_LEVELS: NAField[] = [
  {
    id: 'exp_level',
    label: 'Your experience with needs analysis',
    type: 'single_select' as const,
    required: true,
    options: [
      'Novice (new to LNA / first project)',
      'Intermediate (some projects, want structure)',
      'Expert (seasoned practitioner)'
    ],
    help: 'We\'ll tune the questions and report depth accordingly.'
  }
];

// src/polaris/needs-analysis/schema.ts
export const NA_DYNAMIC_QUESTIONS_SCHEMA = {
  type: 'object',
  required: ['title','questions'],
  properties: {
    title: { type: 'string' },
    questions: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      items: {
        type: 'object',
        required: ['id','type','label'],
        properties: {
          id: { type: 'string' },
          type: { enum: ['text','textarea','single_select','multi_select','calendar_date','calendar_range','slider','number'] },
          label: { type: 'string' },
          help: { type: 'string' },
          required: { type: 'boolean' },
          options: { type: 'array', items: { type: 'string' } },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' },
          unit: { type: 'string' },
          placeholder: { type: 'string' },
          default: {}
        }
      }
    }
  }
} as const;

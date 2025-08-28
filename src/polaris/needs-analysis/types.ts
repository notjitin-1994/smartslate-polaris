// src/polaris/needs-analysis/types.ts
export type NAQuestionType =
  | 'text'
  | 'textarea'
  | 'single_select'
  | 'multi_select'
  | 'calendar_date'
  | 'calendar_range'
  | 'slider'
  | 'number'
  | 'boolean';

export interface NAFieldBase {
  id: string;            // stable key
  label: string;         // plain-English, human readable
  help?: string;         // short sentence of guidance
  required?: boolean;    // default false
}

export interface NAOptionField extends NAFieldBase {
  type: 'single_select' | 'multi_select';
  options: string[];     // values == labels (keep simple for now)
  default?: string | string[];
}

export interface NATextField extends NAFieldBase {
  type: 'text' | 'textarea';
  placeholder?: string;
  maxLength?: number;
}

export interface NACalendarDateField extends NAFieldBase {
  type: 'calendar_date';
  minDate?: string;      // ISO yyyy-mm-dd
  maxDate?: string;
  default?: string;
}

export interface NACalendarRangeField extends NAFieldBase {
  type: 'calendar_range';
  minDate?: string; // ISO
  maxDate?: string;
  default?: { start?: string; end?: string };
}

export interface NASliderField extends NAFieldBase {
  type: 'slider';
  min: number;
  max: number;
  step?: number;         // default 1
  unit?: string;         // e.g., '%', 'hrs', '₹'
  default?: number;
}

export interface NANumberField extends NAFieldBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default?: number;
}

export interface NABooleanField extends NAFieldBase {
  type: 'boolean';
  default?: boolean;
}

export type NAField =
  | NATextField
  | NAOptionField
  | NACalendarDateField
  | NACalendarRangeField
  | NASliderField
  | NANumberField
  | NABooleanField;

export interface NAQuestionSet {
  stage: number;                 // 1..4 (stage 1 is static intake)
  title: string;                 // dynamic stage title
  questions: NAField[];          // ordered
}

export type NAResponseValue =
  | string
  | number
  | string[]
  | boolean
  | { start?: string; end?: string };

export type NAResponseMap = Record<string, NAResponseValue | null>;

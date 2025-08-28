// src/polaris/needs-analysis/RenderField.tsx
import type { NAField, NAResponseValue } from './types';
import { useState } from 'react';

interface RenderFieldProps {
  field: NAField;
  value: NAResponseValue | undefined | null;
  onChange: (id: string, value: NAResponseValue | null) => void;
}

export default function RenderField({ field, value, onChange }: RenderFieldProps) {
  const inputId = `${field.id}-input`
  const helpId = field.help ? `${field.id}-help` : undefined
  const common = (
    <label htmlFor={inputId} className="block mb-2 font-semibold">
      <span className="text-sm text-white/90">{field.label}</span>
      {field.required && <span className="text-red-500"> *</span>}
      {field.help && <div id={helpId} className="text-xs text-white/60 mt-1">{field.help}</div>}
    </label>
  );

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const textField = field as any;
      return (
        <div className="mb-4">
          {common}
          {field.type === 'text' ? (
            <input 
              id={inputId}
              aria-required={field.required}
              aria-describedby={helpId}
              className="input w-full" 
              placeholder={textField.placeholder} 
              value={(value as string) ?? ''} 
              onChange={(e) => onChange(field.id, e.target.value)} 
              maxLength={textField.maxLength}
            />
          ) : (
            <textarea 
              id={inputId}
              aria-required={field.required}
              aria-describedby={helpId}
              className="input w-full min-h-[100px] resize-y" 
              placeholder={textField.placeholder} 
              value={(value as string) ?? ''} 
              onChange={(e) => onChange(field.id, e.target.value)} 
              maxLength={textField.maxLength}
            />
          )}
        </div>
      );
    }

    case 'single_select': {
      const selectField = field as any;
      const opts = selectField.options || [];
      const current = (value as string) ?? '';
      const isPreExistingCustom = !!current && !opts.includes(current);
      const [customMode, setCustomMode] = useState<boolean>(isPreExistingCustom);

      const SELECT_CUSTOM_VALUE = '__CUSTOM__';

      const selectValue = customMode || isPreExistingCustom
        ? SELECT_CUSTOM_VALUE
        : (opts.includes(current) ? current : '');

      return (
        <div className="mb-4">
          {common}
          <select
            id={inputId}
            aria-required={field.required}
            aria-describedby={helpId}
            className="input w-full"
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === SELECT_CUSTOM_VALUE) {
                setCustomMode(true);
                // If switching to custom and there isn't an existing custom value, clear to prompt input
                if (!isPreExistingCustom) onChange(field.id, '');
              } else {
                setCustomMode(false);
                onChange(field.id, v);
              }
            }}
          >
            <option value="" disabled>{current ? 'Select' : 'Select an option'}</option>
            {opts.map((o: string) => (
              <option key={o} value={o}>{o}</option>
            ))}
            <option value={SELECT_CUSTOM_VALUE}>Custom…</option>
          </select>
          { (customMode || isPreExistingCustom) && (
            <div className="mt-2">
              <input
                id={inputId}
                aria-required={field.required}
                aria-describedby={helpId}
                className="input w-full"
                placeholder="Type custom value…"
                value={current}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            </div>
          )}
          <div className="mt-1 text-xs text-white/50">Choose from the list or enter a custom value.</div>
        </div>
      );
    }

    case 'multi_select': {
      const multiField = field as any;
      const opts = multiField.options || [];
      const sel: string[] = Array.isArray(value) ? value : [];
      const selectedSet = new Set(sel);
      return (
        <div className="mb-4">
          {common}
          {/* Selected chips (includes custom values) */}
          {sel.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {sel.map((v) => (
                <span
                  key={`sel-${v}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-400 bg-primary-400/20 text-primary-200"
                >
                  {v}
                  <button
                    type="button"
                    aria-label={`Remove ${v}`}
                    className="text-primary-200/80 hover:text-primary-100"
                    onClick={() => onChange(field.id, sel.filter(s => s !== v))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Available options (hide already selected) */}
          <div className="flex flex-wrap gap-2">
            {opts.filter((o: string) => !selectedSet.has(o)).map((o: string) => (
              <button
                type="button"
                key={o}
                className="px-3 py-1.5 rounded-full border border-white/15 text-white/85 hover:bg-white/10 transition-all duration-200"
                onClick={() => onChange(field.id, [...sel, o])}
              >
                {o}
              </button>
            ))}
          </div>

          {/* Custom add input */}
          <div className="mt-2 flex items-center gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20"
              placeholder="Add a custom option"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = (e.target as HTMLInputElement);
                  const val = input.value.trim();
                  if (val && !sel.includes(val)) {
                    onChange(field.id, [...sel, val]);
                  }
                  input.value = '';
                }
              }}
            />
            <span className="text-xs text-white/50">press Enter</span>
          </div>
        </div>
      );
    }

    case 'calendar_date': {
      const dateField = field as any;
      return (
        <div className="mb-4">
          {common}
          <input 
            id={inputId}
            aria-required={field.required}
            aria-describedby={helpId}
            type="date" 
            className="input w-full" 
            value={(value as string) ?? ''} 
            onChange={(e) => onChange(field.id, e.target.value || null)} 
            min={dateField.minDate}
            max={dateField.maxDate}
          />
        </div>
      );
    }

    case 'calendar_range': {
      const rangeField = field as any;
      const v = (value || {}) as { start?: string; end?: string };
      return (
        <div className="mb-4">
          {common}
          <div className="flex gap-2 items-center">
            <input 
              id={`${inputId}-start`}
              aria-required={field.required}
              aria-describedby={helpId}
              type="date" 
              className="input flex-1" 
              value={v.start ?? ''} 
              onChange={(e) => onChange(field.id, { ...v, start: e.target.value })} 
              min={rangeField.minDate}
              max={rangeField.maxDate}
            />
            <span className="text-white/60">to</span>
            <input 
              id={`${inputId}-end`}
              aria-required={field.required}
              aria-describedby={helpId}
              type="date" 
              className="input flex-1" 
              value={v.end ?? ''} 
              onChange={(e) => onChange(field.id, { ...v, end: e.target.value })} 
              min={rangeField.minDate}
              max={rangeField.maxDate}
            />
          </div>
        </div>
      );
    }

    case 'slider': {
      const sliderField = field as any;
      const { min = 0, max = 10, step = 1, unit } = sliderField;
      const num = typeof value === 'number' ? value : sliderField.default ?? min;
      return (
        <div className="mb-6">
          {common}
          <div className="space-y-2">
            <input 
              id={inputId}
              aria-required={field.required}
              aria-describedby={helpId}
              type="range" 
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-400"
              min={min} 
              max={max} 
              step={step} 
              value={num} 
              onChange={(e) => onChange(field.id, Number(e.target.value))} 
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50">{min}{unit ? ` ${unit}` : ''}</span>
              <span className="text-sm font-medium text-primary-300">{num}{unit ? ` ${unit}` : ''}</span>
              <span className="text-xs text-white/50">{max}{unit ? ` ${unit}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={`${inputId}-custom`}
                aria-describedby={helpId}
                type="number"
                className="input w-28"
                placeholder="Custom"
                value={typeof value === 'number' && (value < min || value > max) ? value : ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  onChange(field.id, v);
                }}
              />
              <span className="text-xs text-white/50">custom value</span>
            </div>
          </div>
        </div>
      );
    }

    case 'number': {
      const numberField = field as any;
      const { min, max, step, unit } = numberField;
      return (
        <div className="mb-4">
          {common}
          <div className="flex items-center gap-2">
            <input 
              id={inputId}
              aria-required={field.required}
              aria-describedby={helpId}
              type="number" 
              className="input flex-1" 
              min={min} 
              max={max} 
              step={step} 
              value={(value as number) ?? ''} 
              onChange={(e) => onChange(field.id, e.target.value === '' ? null : Number(e.target.value))} 
            />
            {unit && <span className="text-sm text-white/60">{unit}</span>}
          </div>
        </div>
      );
    }

    case 'boolean': {
      const boolVal = typeof value === 'boolean' ? value : false
      return (
        <div className="mb-4">
          {common}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full border transition ${boolVal ? 'bg-primary-500/20 border-primary-400 text-primary-200' : 'bg-white/5 border-white/10 text-white/80'}`}
              onClick={() => onChange((field as any).id, true)}
            >Yes</button>
            <button
              type="button"
              className={`${!boolVal ? 'bg-primary-500/20 border-primary-400 text-primary-200' : 'bg-white/5 border-white/10 text-white/80'} px-3 py-1.5 rounded-full border transition`}
              onClick={() => onChange((field as any).id, false)}
            >No</button>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

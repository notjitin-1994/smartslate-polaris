// src/polaris/needs-analysis/RenderField.tsx
import type { NAField, NAResponseValue } from './types';

interface RenderFieldProps {
  field: NAField;
  value: NAResponseValue | undefined | null;
  onChange: (id: string, value: NAResponseValue | null) => void;
}

export default function RenderField({ field, value, onChange }: RenderFieldProps) {
  const common = (
    <label className="block mb-2 font-semibold">
      <span className="text-sm text-white/90">{field.label}</span>
      {field.required && <span className="text-red-500"> *</span>}
      {field.help && <div className="text-xs text-white/60 mt-1">{field.help}</div>}
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
              className="input w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
              placeholder={textField.placeholder} 
              value={(value as string) ?? ''} 
              onChange={(e) => onChange(field.id, e.target.value)} 
              maxLength={textField.maxLength}
            />
          ) : (
            <textarea 
              className="input w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20 min-h-[100px] resize-y" 
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
      return (
        <div className="mb-4">
          {common}
          <select 
            className="input w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
            value={(value as string) ?? ''} 
            onChange={(e) => onChange(field.id, e.target.value || null)}
          >
            <option value="" className="bg-slate-900">Select…</option>
            {opts.map((o: string) => (
              <option key={o} value={o} className="bg-slate-900">{o}</option>
            ))}
          </select>
        </div>
      );
    }

    case 'multi_select': {
      const multiField = field as any;
      const opts = multiField.options || [];
      const sel: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="mb-4">
          {common}
          <div className="flex flex-wrap gap-2">
            {opts.map((o: string) => (
              <button
                type="button"
                key={o}
                className={`px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  sel.includes(o) 
                    ? 'border-primary-400 bg-primary-400/20 text-primary-200' 
                    : 'border-white/15 text-white/85 hover:bg-white/10'
                }`}
                onClick={() => {
                  onChange(field.id, sel.includes(o) 
                    ? sel.filter(v => v !== o) 
                    : [...sel, o]
                  );
                }}
              >
                {o}
              </button>
            ))}
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
            type="date" 
            className="input w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
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
              type="date" 
              className="input flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
              value={v.start ?? ''} 
              onChange={(e) => onChange(field.id, { ...v, start: e.target.value })} 
              min={rangeField.minDate}
              max={rangeField.maxDate}
            />
            <span className="text-white/60">to</span>
            <input 
              type="date" 
              className="input flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
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
              type="number" 
              className="input flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20" 
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

    default:
      return null;
  }
}

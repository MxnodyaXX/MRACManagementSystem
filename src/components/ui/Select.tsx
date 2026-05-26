import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  sub?: string; // optional secondary line (e.g. "Rs 5,500 / day")
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'input w-full flex items-center justify-between gap-2 text-left',
          open && 'border-navy-400 ring-2 ring-navy-100',
          error && 'border-red-400',
          !selected && 'text-navy-300',
        )}
      >
        <span className="truncate flex-1">
          {selected ? (
            <span className="text-navy-800">{selected.label}</span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          size={15}
          className={clsx(
            'flex-shrink-0 text-navy-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white rounded-xl border border-navy-100 shadow-[0_8px_32px_rgba(27,43,107,0.12),0_2px_8px_rgba(27,43,107,0.06)] overflow-hidden">
          {/* Placeholder row */}
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            className={clsx(
              'px-3.5 py-2.5 text-sm cursor-pointer transition-colors',
              !value
                ? 'bg-navy-700 text-white'
                : 'text-navy-400 hover:bg-navy-50',
            )}
          >
            {placeholder}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={clsx(
                    'px-3.5 py-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors border-t border-navy-50',
                    active ? 'bg-navy-700' : 'hover:bg-navy-50',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', active ? 'text-white' : 'text-navy-800')}>
                      {opt.label}
                    </p>
                    {opt.sub && (
                      <p className={clsx('text-xs truncate mt-0.5', active ? 'text-white/70' : 'text-navy-400')}>
                        {opt.sub}
                      </p>
                    )}
                  </div>
                  {active && <Check size={13} className="text-white flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

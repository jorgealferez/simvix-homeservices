import { forwardRef } from 'react';
import { cn } from './cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-9 w-full rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:border-slate-700 border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400',
          error && 'border-red-500 focus:ring-red-400 focus:border-red-400',
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});

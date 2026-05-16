import { forwardRef } from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  full?: boolean;
}

const BASE =
  'h-9 w-full rounded-md border bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, full, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className={cn('flex flex-col gap-1', full && 'sm:col-span-2 lg:col-span-3')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className={cn(BASE, error && 'border-red-500 focus:ring-red-400 focus:border-red-400', className)}
        {...rest}
      />
      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  full?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, full, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className={cn('flex flex-col gap-1', full && 'sm:col-span-2 lg:col-span-3')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={3}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-[5rem] w-full rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:border-slate-700 border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400',
          error && 'border-red-500 focus:ring-red-400 focus:border-red-400',
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});

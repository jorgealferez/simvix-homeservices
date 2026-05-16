import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'block bg-slate-200 dark:bg-slate-800 rounded animate-pulse',
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

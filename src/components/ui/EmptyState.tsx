export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 text-center">
      <p className="text-slate-700 dark:text-slate-200 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

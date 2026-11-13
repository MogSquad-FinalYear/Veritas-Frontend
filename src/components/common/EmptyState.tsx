import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-14 dark:border-neutral-800 dark:bg-neutral-900 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

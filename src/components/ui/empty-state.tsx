import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-10"}`}>
      <div className={`rounded-xl bg-muted/50 flex items-center justify-center mb-3 ${compact ? "p-2.5" : "p-3.5"}`}>
        <Icon className={`text-muted-foreground/40 ${compact ? "h-5 w-5" : "h-7 w-7"}`} />
      </div>
      <p className={`font-medium text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>{title}</p>
      {description && (
        <p className={`text-muted-foreground/60 mt-1 max-w-[260px] ${compact ? "text-[10px]" : "text-xs"}`}>{description}</p>
      )}
      {action && (
        <Link href={action.href} className={`mt-3 font-medium text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline ${compact ? "text-[10px]" : "text-xs"}`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

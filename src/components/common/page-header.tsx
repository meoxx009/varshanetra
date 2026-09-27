import React from "react";
import { DataSourceMeta } from "@/types";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  sourceMeta?: DataSourceMeta;
  actions?: React.ReactNode;
  className?: string;
  compactSource?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  sourceMeta,
  actions,
  className,
  compactSource = true,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {item.href ? (
                <a href={item.href} className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {sourceMeta && (
              <DataSourceBadge metadata={sourceMeta} compact={compactSource} />
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3",
        className
      )}
      aria-label="Loading content..."
      role="status"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function TableSkeleton({
  rows = 4,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full space-y-2.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900", className)}
      aria-label="Loading table data..."
      role="status"
    >
      {/* Table header skeleton */}
      <div className="flex gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 py-2 border-b border-slate-50 dark:border-slate-800/40">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`c-${r}-${c}`} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-label="Loading list items..."
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full max-w-md" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

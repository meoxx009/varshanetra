import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-xs transition-all [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800",
        info:
          "border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        warning:
          "border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        destructive:
          "border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-950 dark:text-red-200 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
        subtle:
          "border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 [&>svg]:text-slate-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="region"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-bold leading-none tracking-tight text-xs sm:text-sm", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

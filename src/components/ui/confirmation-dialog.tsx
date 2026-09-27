"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  isLoading = false,
  icon: CustomIcon,
}: ConfirmationDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus Cancel button on open to prevent accidental Enter confirmation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          iconBg: "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400",
          icon: CustomIcon || Trash2,
          confirmClass: "bg-[#DC2626] hover:bg-red-700 text-white font-bold shadow-xs",
        };
      case "warning":
        return {
          iconBg: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
          icon: CustomIcon || AlertTriangle,
          confirmClass: "bg-[#D97706] hover:bg-amber-700 text-white font-bold shadow-xs",
        };
      default:
        return {
          iconBg: "bg-blue-100 dark:bg-blue-950/60 text-[#0F3D66] dark:text-blue-300",
          icon: CustomIcon || Info,
          confirmClass: "bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-bold shadow-xs",
        };
    }
  };

  const { iconBg, icon: IconComponent, confirmClass } = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-desc"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
            <IconComponent className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirmation-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-white leading-snug"
            >
              {title}
            </h3>
            <div
              id="confirmation-dialog-desc"
              className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed"
            >
              {description}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
            aria-label="Close dialog without confirming"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            ref={cancelBtnRef}
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold"
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn("text-xs gap-1.5", confirmClass)}
          >
            {isLoading && (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  confidence?: number;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, confidence, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="text-sm font-medium text-text-muted flex items-center"
            >
              {label}
            </label>
            {confidence !== undefined && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  confidence >= 0.8
                    ? "bg-success/10 text-success"
                    : confidence >= 0.5
                    ? "bg-warning/10 text-warning"
                    : "bg-danger/10 text-danger"
                )}
              >
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "flex h-[42px] w-full rounded-lg border bg-panel px-3 text-sm text-text",
            "placeholder:text-text-muted/50",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-danger/50 focus-visible:ring-danger/30"
              : "border-border hover:border-text-muted/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

"use client";

import React, { type ButtonHTMLAttributes, type ReactNode } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  spinnerColor?: string;
  children: ReactNode;
};

const LoadingButton = (
  {
  loading = false,
  disabled,
  className,
  children,
  spinnerColor,
  style,
  ...props
}: LoadingButtonProps,
  ref: React.Ref<HTMLButtonElement>
) => {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      {...props}
      disabled={isDisabled}
      className={`${className ? className + " " : ""}ld-btn`}
      style={{ position: "relative", ...style, ...(isDisabled ? { cursor: "not-allowed" } : {}) }}
    >
      <span style={{ opacity: loading ? 0.85 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
        {children}
        {loading && (
          <span
            className="ld-spinner-inline"
            style={{ borderTopColor: spinnerColor || "var(--accent)" }}
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
};

export default React.forwardRef<HTMLButtonElement, LoadingButtonProps>(LoadingButton);

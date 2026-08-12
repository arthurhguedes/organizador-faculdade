import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  variant = "secondary",
  icon: Icon,
  loading,
  loadingText,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={`btn btn--${variant} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} strokeWidth={2} className="spin" /> : Icon && <Icon size={16} strokeWidth={2} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

import { AlertTriangle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner">
      <AlertTriangle size={16} strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}

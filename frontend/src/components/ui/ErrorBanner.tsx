import { AlertTriangle, Info } from "lucide-react";

export function ErrorBanner({ message, tone = "error" }: { message: string; tone?: "error" | "info" }) {
  return (
    <div className={`error-banner${tone === "info" ? " error-banner--info" : ""}`}>
      {tone === "info" ? <Info size={16} strokeWidth={2} /> : <AlertTriangle size={16} strokeWidth={2} />}
      <span>{message}</span>
    </div>
  );
}

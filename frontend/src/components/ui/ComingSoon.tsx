import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__icon">
        <Construction size={22} strokeWidth={1.75} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {items && items.length > 0 && (
        <ul className="coming-soon__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <span className="badge badge--muted">Em breve</span>
    </div>
  );
}

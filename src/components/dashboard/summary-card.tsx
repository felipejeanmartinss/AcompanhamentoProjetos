export function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <article className="card"><p className="muted">{label}</p><strong style={{ fontSize: "1.5rem" }}>{value}</strong></article>;
}

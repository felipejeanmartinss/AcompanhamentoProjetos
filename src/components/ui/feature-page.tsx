export function FeaturePage({ title, description }: Readonly<{ title: string; description: string }>) {
  return <main className="page"><h1>{title}</h1><p className="muted">{description}</p><div className="card">Módulo preparado para o próximo incremento.</div></main>;
}

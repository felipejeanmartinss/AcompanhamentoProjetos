import Link from "next/link";

const navigation = [
  ["/dashboard", "Visão geral"], ["/transactions", "Lançamentos"],
  ["/accounts", "Contas"], ["/credit-cards", "Cartões"],
  ["/budgets", "Orçamentos"], ["/settings", "Configurações"],
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><header className="card" style={{ borderRadius: 0, display: "flex", gap: "1rem", alignItems: "center" }}>
    <strong>MeuMoney</strong><nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {navigation.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
    </nav></header>{children}</>;
}

"use client";

export function LoginForm() {
  return <form className="card" style={{ maxWidth: "24rem" }}><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required style={{ width: "100%", padding: ".75rem", margin: ".5rem 0 1rem" }}/><button type="submit">Continuar</button></form>;
}

export default function VerifyMfaPage() {
  return (
    <main className="shell">
      <section className="card stack">
        <p className="brand">Tre60 Grader</p>
        <h1 className="title">Verifiera MFA</h1>
        <p className="subtitle">
          Ditt interna konto kräver multifaktorautentisering innan du kan fortsätta.
        </p>
        <p className="note">
          Nästa steg är att koppla den här sidan till ert faktiska MFA-flöde i Supabase Auth.
        </p>
        <a href="/logout">Logga ut</a>
      </section>
    </main>
  );
}

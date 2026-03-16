import Link from "next/link";

export default function LogoutPage() {
  return (
    <main>
      <h1>Logga ut</h1>
      <p>Avsluta din aktuella session.</p>
      <p>
        <Link href="/logout">Logga ut nu</Link>
      </p>
    </main>
  );
}

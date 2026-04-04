const messages: Record<string, string> = {
  missing_profile: "Det finns ingen app-profil kopplad till kontot.",
  wrong_role: "Kontot saknar behörighet för den här destinationen.",
  unknown_role: "Kontot kunde inte matchas mot en giltig roll.",
  missing_code: "Inloggningslänken saknar giltig kod.",
  callback_exchange_failed: "Det gick inte att slutföra inloggningen från länken.",
  otp_verification_failed: "Länken kunde inte verifieras. Be om en ny magic link och öppna den direkt.",
  missing_reset_session: "Lösenordsåterställningen saknar giltig session."
};

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const message = messages[code ?? ""] ?? "Ett okänt autentiseringsfel inträffade.";

  return (
    <main>
      <h1>Auth-fel</h1>
      <p>{message}</p>
      <p>Kod: {code ?? "unknown"}</p>
    </main>
  );
}

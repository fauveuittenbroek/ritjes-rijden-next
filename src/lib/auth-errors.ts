type AuthErrorLike = { status?: number; code?: string; message?: string };

const rateLimitMessage =
  "Te veel pogingen in korte tijd. Wacht ongeveer een uur en probeer het opnieuw.";

export function authErrorMessage(error: AuthErrorLike, context: "login" | "signup"): string {
  const code = error.code ?? "";

  if (error.status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return rateLimitMessage;
  }

  switch (code) {
    case "invalid_credentials":
      return "E-mailadres of wachtwoord is onjuist. Controleer je gegevens, of kies 'Nieuwe gebruiker' als je nog geen account hebt.";
    case "email_not_confirmed":
      return "Je e-mailadres is nog niet bevestigd. Open de bevestigingsmail (ook in spam) of stuur hieronder een nieuwe bevestigingsmail.";
    case "user_already_exists":
    case "email_exists":
      return "Er bestaat al een account met dit e-mailadres. Kies 'Bestaande gebruiker' en log daar in.";
    case "weak_password":
      return "Dit wachtwoord is te zwak of komt voor in datalekken. Kies een langer wachtwoord met hoofdletters, cijfers en een symbool.";
    case "email_address_invalid":
    case "validation_failed":
      return "Vul een geldig e-mailadres en wachtwoord in en probeer het opnieuw.";
    case "signup_disabled":
      return "Nieuwe accounts zijn op dit moment uitgeschakeld. Neem contact op met de beheerder.";
    case "email_provider_disabled":
    case "provider_disabled":
      return "Inloggen met e-mail is uitgeschakeld in dit project. Neem contact op met de beheerder.";
    case "email_address_not_authorized":
      return "De mailserver mag nog niet naar dit e-mailadres sturen. Neem contact op met de beheerder.";
    case "email_send_failed":
      return "De bevestigingsmail kon niet worden verstuurd (fout bij de mailserver). Probeer het later opnieuw of neem contact op met de beheerder.";
    case "request_timeout":
      return "De inlogservice reageerde niet op tijd. Probeer het opnieuw.";
    default:
      break;
  }

  if (error.status === 500) {
    return "De inlogservice gaf een serverfout, vaak door een probleem met het versturen van e-mail. Probeer het later opnieuw of neem contact op met de beheerder.";
  }
  if (error.status === 400 || error.status === 422) {
    return `Controleer je gegevens en probeer het opnieuw${error.message ? ` (${error.message})` : ""}.`;
  }
  if (error.message) {
    return `${context === "signup" ? "Account aanmaken" : "Inloggen"} is niet gelukt: ${error.message}`;
  }
  return context === "signup"
    ? "Account aanmaken is niet gelukt. Probeer het opnieuw."
    : "Inloggen is niet gelukt. Probeer het opnieuw.";
}

export const networkErrorMessage =
  "Geen verbinding met de inlogservice. Controleer je internetverbinding en probeer het opnieuw.";

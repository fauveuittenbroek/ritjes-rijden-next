export const PASSWORD_REQUIREMENT_TEXT = "Minimaal 8 tekens en ten minste één cijfer of speciaal teken.";

export function isPasswordValid(password: string): boolean {
  return password.length >= 8 && (/\d/.test(password) || /[^A-Za-z0-9\s]/.test(password));
}

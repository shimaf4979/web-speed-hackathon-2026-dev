export const AUTH_ERROR_CODES = {
  invalidUsername: "INVALID_USERNAME",
  nameRequired: "NAME_REQUIRED",
  passwordNeedsSymbol: "PASSWORD_NEEDS_SYMBOL",
  passwordRequired: "PASSWORD_REQUIRED",
  usernameRequired: "USERNAME_REQUIRED",
  usernameTaken: "USERNAME_TAKEN",
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

interface SignupPayload {
  username?: string;
  name?: string;
  password?: string;
}

export function validateSignupPayload(values: SignupPayload): AuthErrorCode | null {
  const normalizedUsername = values.username?.trim() || "";
  const normalizedName = values.name?.trim() || "";
  const normalizedPassword = values.password?.trim() || "";

  if (normalizedUsername.length === 0) {
    return AUTH_ERROR_CODES.usernameRequired;
  }
  if (!/^[a-zA-Z0-9_]*$/.test(normalizedUsername)) {
    return AUTH_ERROR_CODES.invalidUsername;
  }
  if (normalizedName.length === 0) {
    return AUTH_ERROR_CODES.nameRequired;
  }
  if (normalizedPassword.length === 0) {
    return AUTH_ERROR_CODES.passwordRequired;
  }
  if (/^[\p{Letter}\p{Number}]+$/v.test(normalizedPassword) && normalizedPassword.length >= 16) {
    return AUTH_ERROR_CODES.passwordNeedsSymbol;
  }

  return null;
}

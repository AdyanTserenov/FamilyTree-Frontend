/**
 * Decodes a JWT and checks whether its `exp` claim is in the past.
 * Returns true if the token is expired OR malformed.
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const payload = JSON.parse(atob(payloadBase64));
    if (typeof payload.exp !== 'number') return true;
    // exp is in seconds; Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token → treat as expired
  }
};

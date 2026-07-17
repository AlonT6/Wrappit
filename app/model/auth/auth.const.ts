/** Cookie name holding the current Wix refresh token (visitor or member).
 *  Readable by the browser client (js-cookie), so it is intentionally not httpOnly —
 *  this matches Wix's official headless starter, where the refresh token drives
 *  OAuth/PKCE token renewal on both server and browser. */
export const WIX_REFRESH_TOKEN = 'wix_refreshToken';

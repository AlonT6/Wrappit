import Cookies from 'js-cookie';
import { getWixClient } from '@/app/model/auth/wix-client.base';

/** Build a Wix OAuth client for client components, reading the session from js-cookie. */
export function getBrowserWixClient() {
  return getWixClient({ cookieStore: { get: (name) => Cookies.get(name) } });
}

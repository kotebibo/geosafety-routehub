// Route Handler files (route.ts) may only export HTTP-method handlers and a
// small set of reserved config names — shared constants live here instead so
// login/verify/resend routes and the /auth/2fa page can all import them.
export const PENDING_2FA_COOKIE = 'pending_2fa'

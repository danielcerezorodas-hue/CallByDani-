// Apertura oficial de CallByDani. Antes de esta fecha, la landing y /pricing muestran
// la pantalla "Coming soon" con la cuenta regresiva, y no se puede pagar.
// A la hora exacta se abre sola. Para cambiar la fecha, cambia LAUNCH_AT.
// En desarrollo (npm run dev) no se bloquea nada, para poder seguir probando.
export const LAUNCH_AT = "2026-10-24T00:00:00-04:00"; // 24 de octubre de 2026, 12:00 AM Eastern

export function isLaunched(now = Date.now()) {
  if (process.env.NODE_ENV === "development") return true;
  return now >= new Date(LAUNCH_AT).getTime();
}

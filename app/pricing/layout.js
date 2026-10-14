import { connection } from "next/server";
import ComingSoon from "../components/ComingSoon";
import { isLaunched } from "../launch";

// Antes de la apertura, /pricing también muestra la cuenta regresiva (no se puede pagar).
export default async function PricingLayout({ children }) {
  await connection();
  return isLaunched() ? children : <ComingSoon />;
}

// Empresas a las que puede pertenecer un prospecto (para los agentes): CallByDani (ventas internas)
// y cada cliente que pagó. Solo nombres y números: nada privado del cliente.
// GET → { companies: [{ id, name, lines: ["+1..."] }] }
import { requireAgent, db, fail } from "../helpers";

export async function GET(req) {
  const { error } = await requireAgent(req);
  if (error) return error;
  const supa = db();

  const [clients, onboarding, lines] = await Promise.all([
    supa.from("clients").select("id, email").not("plan", "is", null),
    supa.from("client_onboarding").select("email, data"),
    supa.from("phone_lines").select("phone_number, business_name, client_email"),
  ]);
  const failed = [clients, onboarding, lines].find(r => r.error);
  if (failed) return fail(failed.error.message, 500);

  const companies = clients.data.map(c => {
    const email = c.email.toLowerCase();
    const own = lines.data.filter(l => (l.client_email || "").toLowerCase() === email);
    const legal = onboarding.data.find(o => o.email.toLowerCase() === email)?.data?.legal_name;
    return { id: c.id, name: legal || own[0]?.business_name || email, lines: own.map(l => l.phone_number) };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ companies });
}

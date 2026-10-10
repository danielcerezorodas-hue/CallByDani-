// Da al panel del agente un permiso temporal para recibir llamadas en el navegador.
import twilio from "twilio";
import { authAgent, toIdentity } from "../helpers";

// Quita espacios y comillas que se cuelan al pegar valores en Vercel
function clean(name) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "").trim();
}

// Comprueba una vez (por instancia del servidor) que la API key funciona con esta cuenta.
// Si no, el token saldría inválido (error 20101) sin decir por qué.
let keyChecked = false;
async function checkKey(accountSid, keySid, secret) {
  if (keyChecked) return null;
  try {
    await twilio(keySid, secret, { accountSid }).api.v2010.accounts(accountSid).fetch();
    keyChecked = true;
    return null;
  } catch (e) {
    console.error("Twilio API key check:", e.status, e.code, e.message);
    if (e.status === 401 || e.status === 403 || e.status === 404) {
      return "Twilio rechazó la API key: TWILIO_API_KEY_SID y TWILIO_API_KEY_SECRET no coinciden entre sí, " +
        "o la key es de otra cuenta/subcuenta que TWILIO_ACCOUNT_SID, o se creó en una región distinta de US1.";
    }
    return null; // Error de red u otro: no bloqueamos al agente
  }
}

export async function POST(req) {
  const { user: agent, error } = await authAgent(req);
  if (error) return error;

  const accountSid = clean("TWILIO_ACCOUNT_SID");
  const keySid = clean("TWILIO_API_KEY_SID");
  const secret = clean("TWILIO_API_KEY_SECRET");

  const missing = [["TWILIO_ACCOUNT_SID", accountSid], ["TWILIO_API_KEY_SID", keySid], ["TWILIO_API_KEY_SECRET", secret]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return Response.json({ error: `Falta en el servidor: ${missing.join(", ")}` }, { status: 500 });

  const problems = [];
  if (!/^AC[0-9a-f]{32}$/i.test(accountSid)) problems.push("TWILIO_ACCOUNT_SID debe empezar con AC (34 caracteres)");
  if (!/^SK[0-9a-f]{32}$/i.test(keySid)) problems.push("TWILIO_API_KEY_SID debe empezar con SK (34 caracteres)");
  if (secret === clean("TWILIO_AUTH_TOKEN")) problems.push("TWILIO_API_KEY_SECRET es el Auth Token; debe ser el secret de la API key");
  if (problems.length) return Response.json({ error: problems.join(". ") }, { status: 500 });

  const keyProblem = await checkKey(accountSid, keySid, secret);
  if (keyProblem) return Response.json({ error: keyProblem }, { status: 500 });

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const identity = toIdentity(agent.id);
  const token = new AccessToken(accountSid, keySid, secret, { identity, ttl: 3600 });
  token.addGrant(new VoiceGrant({ incomingAllow: true }));
  return Response.json({ token: token.toJwt(), identity });
}

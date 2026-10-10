// Da al panel del agente un permiso temporal para recibir llamadas en el navegador.
import twilio from "twilio";
import { authAgent, toIdentity } from "../helpers";

export async function POST(req) {
  const { user: agent, error } = await authAgent(req);
  if (error) return error;

  const missing = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET"].filter(k => !process.env[k]);
  if (missing.length) return Response.json({ error: `Falta en el servidor: ${missing.join(", ")}` }, { status: 500 });

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const identity = toIdentity(agent.id);
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity, ttl: 3600 }
  );
  token.addGrant(new VoiceGrant({ incomingAllow: true }));
  return Response.json({ token: token.toJwt(), identity });
}

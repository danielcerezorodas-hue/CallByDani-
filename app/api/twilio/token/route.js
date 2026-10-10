// Da al panel del agente un permiso temporal para recibir llamadas en el navegador.
import twilio from "twilio";
import { getAgent, toIdentity } from "../helpers";

export async function POST(req) {
  const agent = await getAgent(req);
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });

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

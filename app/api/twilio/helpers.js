// Funciones compartidas por las rutas de Twilio (solo se usan en el servidor).
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

// Lee una variable de entorno; si falta, el error dice cuál es
function env(name) {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name} en el servidor`);
  return value;
}

// Cliente de Supabase con permisos de servidor (nunca usar en el navegador)
export function db() {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

// La identidad del agente en Twilio solo admite letras, números y "_"
export function toIdentity(agentId) {
  return "agent_" + agentId.replace(/-/g, "_");
}
export function fromIdentity(identity) {
  return identity.replace(/^agent_/, "").replace(/_/g, "-");
}

// URL pública con la que Twilio llamó (para validar la firma y armar callbacks)
function publicUrl(req) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export function origin(req) {
  return new URL(publicUrl(req)).origin;
}

// Lee los datos que manda Twilio y confirma que de verdad vienen de Twilio.
// Devuelve los parámetros, o null si la firma no es válida.
// Con GET los datos vienen en la URL y la firma se calcula solo con la URL.
export async function readTwilioRequest(req) {
  const isGet = req.method === "GET";
  const params = isGet
    ? Object.fromEntries(new URL(req.url).searchParams)
    : Object.fromEntries(await req.formData());
  if (process.env.TWILIO_SKIP_SIGNATURE === "true") return params;
  const signature = req.headers.get("x-twilio-signature") || "";
  const ok = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, publicUrl(req), isGet ? {} : params);
  return ok ? params : null;
}

export function twiml(response) {
  return new Response(response.toString(), { headers: { "Content-Type": "text/xml" } });
}

export function forbidden() {
  return new Response("Invalid Twilio signature", { status: 403 });
}

export function isAdmin(user) {
  const admin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return !!admin && user?.email?.toLowerCase() === admin;
}

// Verifica al agente con el token de sesión de Supabase que manda el navegador.
// Solo deja pasar al admin y a los correos que estén en la tabla "agents".
export async function getAgent(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supa = db();
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  const user = data.user;
  if (isAdmin(user)) return user;
  const { data: allowed } = await supa
    .from("agents")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  return allowed ? user : null;
}

// Como getAgent, pero devuelve { user } o { error: Response } con el motivo,
// en vez de un 500 vacío si algo falla en el servidor.
export async function authAgent(req) {
  try {
    const user = await getAgent(req);
    return user ? { user } : { error: Response.json({ error: "No autorizado" }, { status: 401 }) };
  } catch (e) {
    console.error("authAgent:", e);
    return { error: Response.json({ error: e.message }, { status: 500 }) };
  }
}

// Convierte "(910) 555-1234" o "9105551234" en "+19105551234"
export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (String(raw).trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  return "+" + digits;
}

// Manda un WhatsApp con Twilio.
// Si hay TWILIO_WHATSAPP_CONTENT_SID usa esa plantilla aprobada (necesaria para
// escribirle a alguien que no te ha escrito en las últimas 24 horas);
// si no, manda texto libre (sirve en el sandbox de Twilio).
export async function sendWhatsapp(to, { body, variables }) {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("Falta TWILIO_WHATSAPP_FROM");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const msg = { from: `whatsapp:${normalizePhone(from)}`, to: `whatsapp:${normalizePhone(to)}` };
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (contentSid) {
    // WhatsApp no acepta saltos de línea dentro de las variables de una plantilla
    const clean = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, String(v || "-").replace(/\s*\n+\s*/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 900)])
    );
    msg.contentSid = contentSid;
    msg.contentVariables = JSON.stringify(clean);
  } else {
    msg.body = body;
  }
  return client.messages.create(msg);
}

// Voces y textos en cada idioma
export const VOICE = {
  en: { voice: "Polly.Joanna", language: "en-US" },
  es: { voice: "Polly.Lupe", language: "es-US" },
};

export const TEXT = {
  en: {
    voicemail: "All of our agents are busy right now. Please leave your name, number and a short message after the tone, and we will call you back shortly.",
    thanks: "Thank you. Goodbye.",
  },
  es: {
    voicemail: "En este momento todos nuestros agentes están ocupados. Por favor deje su nombre, número y un breve mensaje después del tono, y le llamaremos pronto.",
    thanks: "Gracias. Hasta luego.",
  },
};

// Un agente cuenta como "conectado" si su panel avisó en los últimos 2 minutos
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

// Busca a qué agentes hay que sonar.
// stage 1 = agentes asignados a esta línea · stage 2 = agentes que atienden varias líneas
export async function findAgents(phoneNumber, stage) {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const supa = db();
  const { data: online } = await supa
    .from("agent_status")
    .select("agent_id, is_pool")
    .eq("online", true)
    .eq("in_call", false)
    .gte("last_seen", since);
  if (!online?.length) return [];

  if (stage === 1) {
    const { data: assigned } = await supa
      .from("agent_assignments")
      .select("agent_id")
      .eq("phone_number", phoneNumber);
    const ids = new Set((assigned || []).map(a => a.agent_id));
    return online.filter(a => ids.has(a.agent_id)).map(a => a.agent_id).slice(0, 10);
  }
  return online.filter(a => a.is_pool).map(a => a.agent_id).slice(0, 10);
}

// Arma la respuesta para sonar a los agentes (o mandar a buzón si no hay nadie).
export async function ringAgents(req, response, { to, from, lang, business, callSid, stage }) {
  const base = origin(req);
  let agents = await findAgents(to, stage);
  // Si no hay asignados conectados, pasamos directo a los de varias líneas
  if (stage === 1 && agents.length === 0) {
    stage = 2;
    agents = await findAgents(to, 2);
  }
  if (agents.length === 0) {
    leaveVoicemail(req, response, lang);
    return response;
  }
  const qs = new URLSearchParams({ lang, stage: String(stage) });
  const dial = response.dial({
    timeout: 20,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    recordingStatusCallback: `${base}/api/twilio/recording?type=call`,
    recordingStatusCallbackEvent: "completed",
    action: `${base}/api/twilio/dial-done?${qs}`,
  });
  for (const agentId of agents) {
    const client = dial.client();
    client.identity(toIdentity(agentId));
    client.parameter({ name: "parentCallSid", value: callSid });
    client.parameter({ name: "from", value: from || "" });
    client.parameter({ name: "to", value: to || "" });
    client.parameter({ name: "business", value: business || "" });
    client.parameter({ name: "lang", value: lang });
  }
  return response;
}

export function leaveVoicemail(req, response, lang) {
  const base = origin(req);
  response.say(VOICE[lang], TEXT[lang].voicemail);
  response.record({
    maxLength: 120,
    playBeep: true,
    timeout: 5,
    recordingStatusCallback: `${base}/api/twilio/recording?type=voicemail`,
    recordingStatusCallbackEvent: "completed",
    action: `${base}/api/twilio/end?lang=${lang}`,
  });
  return response;
}

// Política de privacidad. Si se agrega un proveedor nuevo que reciba datos (ej. otro servicio de correo),
// hay que agregarlo en "Service providers".
import LegalPage, { CONTACT_EMAIL } from "../components/LegalPage";

export const metadata = {
  title: "Privacy Policy · CallByDani",
  description: "How CallByDani collects, uses and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2, 2026">
      <p>
        This policy explains how CBD Business Solutions LLC, doing business as CallByDani (&quot;CallByDani,&quot; &quot;we&quot;), collects,
        uses and protects personal information when you visit callbydani.com, become a client, or call a business that uses our
        services.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><b>Contact details you give us:</b> name, email, phone number and company when you contact us, join our list or sign up.</li>
        <li>
          <b>Client account and setup information:</b> business details, billing contacts, phone numbers to forward, call handling
          instructions, the documents you upload (such as FAQs, price lists and scripts) and your signed agreement, including the date,
          IP address and browser used to accept it.
        </li>
        <li>
          <b>Call information:</b> when we answer calls for a client, we process the caller&apos;s phone number, the date and length of the
          call, call recordings, voicemails, AI conversation transcripts, and notes or summaries written by our agents.
        </li>
        <li>
          <b>Payment information:</b> payments are processed by Stripe. We receive limited details such as your billing email and
          subscription status, but we never see or store full card numbers.
        </li>
        <li><b>Technical information:</b> basic logs such as IP address and browser type, used to keep the service secure and working.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To answer, route, record and summarize calls for our clients, as instructed by them.</li>
        <li>To set up and operate client accounts, provide support and send service messages (such as call summaries).</li>
        <li>To bill for our services and prevent fraud.</li>
        <li>To train our agents on each client&apos;s business and to improve quality.</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <p>We do not sell personal information, and we do not use callers&apos; information for our own marketing.</p>

      <h2>Callers to our clients</h2>
      <p>
        When you call a business that uses CallByDani, we act on that business&apos;s behalf, and its own privacy practices also apply.
        Calls may be recorded for quality and training, and callers hear a notice at the start of the call. To ask about a call, you can
        contact the business you called or reach us at the email below.
      </p>

      <h2>Service providers</h2>
      <p>We share information only with providers that help us run the service, under their own security and privacy commitments:</p>
      <ul>
        <li><b>Twilio</b>: phone calls, call recordings and voicemail.</li>
        <li><b>Stripe</b>: payments and subscriptions.</li>
        <li><b>Supabase</b>: database, sign-in and document storage.</li>
        <li><b>Vercel</b>: website and application hosting.</li>
        <li><b>Anthropic</b>: AI used by our AI receptionist and by the assistant that helps our agents during calls.</li>
        <li><b>Our email delivery provider</b>: account and call summary emails.</li>
      </ul>
      <p>We may also disclose information if required by law or to protect the rights and safety of our clients, callers or CallByDani.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep client and call information for as long as the client&apos;s account is active and as needed to provide the service,
        resolve disputes and meet legal, tax and accounting obligations. Clients can ask us to delete their data when they leave.
      </p>

      <h2>Security</h2>
      <p>
        Client data is kept private per client, access is limited to authorized staff, documents are stored in private storage, and data
        is transmitted over encrypted connections. No system is perfectly secure, but we work to protect your information.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to access, correct or delete your personal information, or to stop receiving non-essential emails, by writing to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you may have additional rights under local law.
      </p>

      <h2>Children</h2>
      <p>Our services are meant for businesses and are not directed to children under 13.</p>

      <h2>Changes</h2>
      <p>We may update this policy. When we do, we will change the date at the top of this page.</p>
    </LegalPage>
  );
}

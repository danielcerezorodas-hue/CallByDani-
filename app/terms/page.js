// Términos de servicio: resumen de cobros/cancelación + el Platform Services Agreement vigente
// (se lee del mismo archivo que firman los clientes: content/platform-services-agreement.md).
import LegalPage, { CONTACT_EMAIL } from "../components/LegalPage";
import { currentAgreement } from "../api/client/agreement-file";

export const metadata = {
  title: "Terms of Service · CallByDani",
  description: "CallByDani terms of service, billing, cancellation and refund policy.",
};

export default async function TermsPage() {
  const agreement = await currentAgreement();
  return (
    <LegalPage title="Terms of Service" updated="November 2, 2026">
      <p>
        CallByDani is operated by CBD Business Solutions LLC, a North Carolina limited liability company. By using our website or
        subscribing to our services, you agree to these terms. Business clients also accept the Platform Services Agreement below
        when they set up their account.
      </p>

      <h2>Billing, free first week and refunds</h2>
      <ul>
        <li>Plans are billed monthly in advance through Stripe. We never see or store your full card number.</li>
        <li>
          Plans with dedicated agents include a free first week, training included. You add a card when you sign up, but nothing is
          charged during that week. If you stay, your first month and a one-time setup fee are charged on day 8. You can cancel at any
          time before day 8 without charge.
        </li>
        <li>Fees already paid are non-refundable and are not prorated, except where the law requires otherwise.</li>
      </ul>

      <h2>Cancellation</h2>
      <p>
        To cancel, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Notice periods and when a cancellation takes effect
        are described in section 9 of the Platform Services Agreement below.
      </p>

      <h2>Website use</h2>
      <p>
        You may use this website to learn about and purchase our services. Please don't misuse it, attempt to access accounts or data
        that aren't yours, or interfere with its operation. Our handling of personal information is described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Platform Services Agreement (version {agreement.version})</h2>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 20px", fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
        {agreement.text}
      </div>
    </LegalPage>
  );
}

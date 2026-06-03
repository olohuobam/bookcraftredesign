'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

interface Section {
  title: string
  content: React.ReactNode
}

const ContactBlock = ({ lang }: { lang: string }) => (
  <div className="bg-muted/40 rounded-xl p-4 space-y-1">
    <p className="font-semibold">Jakob Kasimir Altenburg</p>
    <p>{lang === 'de' ? 'Betreiber von Bookcraft' : lang === 'es' ? 'Operador de Bookcraft' : 'Operator of Bookcraft'}</p>
    <p>
      {lang === 'de' ? 'E-Mail:' : lang === 'es' ? 'Correo electrónico:' : 'E-mail:'}{' '}
      <a href="mailto:info@bookcraft.dev" className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline">info@bookcraft.dev</a>
    </p>
    <p>Website: bookcraft.dev</p>
  </div>
)

const ProviderList = ({ lang }: { lang: string }) => {
  const providers = {
    de: [
      { name: 'OpenAI', description: 'Für die KI-gestützte Bucherstellung verwenden wir die OpenAI API (GPT-4o). Ihre Eingaben (Texte, Prompts) werden zur Verarbeitung an OpenAI übermittelt. OpenAI verarbeitet Daten in den USA; die Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).', link: 'https://openai.com/privacy' },
      { name: 'Supabase', description: 'Unsere Datenbank und Authentifizierung laufen auf Supabase (PostgreSQL). Ihre Daten werden auf Servern innerhalb der EU gespeichert.', link: 'https://supabase.com/privacy' },
      { name: 'Stripe', description: 'Zahlungen auf der Web-Plattform und Android werden über Stripe abgewickelt. Stripe ist PCI-DSS-zertifiziert. Für US-basierte Verarbeitung gelten EU-Standardvertragsklauseln.', link: 'https://stripe.com/privacy' },
      { name: 'Apple (iOS)', description: 'In-App-Käufe und Abonnements in der iOS-App werden über Apple In-App Purchase verarbeitet.', link: 'https://www.apple.com/legal/privacy/' },
      { name: 'Google (Android)', description: 'In-App-Käufe und Abonnements in der Android-App werden über Google Play In-App Billing verarbeitet.', link: 'https://policies.google.com/privacy' },
      { name: 'Lulu Direct', description: 'Für den physischen Buchdruck und -versand nutzen wir Lulu Direct. Name und Lieferadresse werden zu diesem Zweck übermittelt.', link: 'https://www.lulu.com/about/privacy-policy' },
    ],
    en: [
      { name: 'OpenAI', description: 'For AI-powered book creation we use the OpenAI API (GPT-4o). Your inputs (texts, prompts) are transmitted to OpenAI for processing. OpenAI processes data in the USA; the transfer is based on EU Standard Contractual Clauses (Art. 46(2)(c) GDPR).', link: 'https://openai.com/privacy' },
      { name: 'Supabase', description: 'Our database and authentication run on Supabase (PostgreSQL). Your data is stored on servers within the EU.', link: 'https://supabase.com/privacy' },
      { name: 'Stripe', description: 'Payments on the web platform and Android are processed via Stripe. Stripe is PCI-DSS certified. EU Standard Contractual Clauses apply for US-based processing.', link: 'https://stripe.com/privacy' },
      { name: 'Apple (iOS)', description: 'In-app purchases and subscriptions in the iOS app are processed via Apple In-App Purchase.', link: 'https://www.apple.com/legal/privacy/' },
      { name: 'Google (Android)', description: 'In-app purchases and subscriptions in the Android app are processed via Google Play In-App Billing.', link: 'https://policies.google.com/privacy' },
      { name: 'Lulu Direct', description: 'For physical book printing and shipping we use Lulu Direct. Name and delivery address are transmitted for this purpose.', link: 'https://www.lulu.com/about/privacy-policy' },
    ],
    es: [
      { name: 'OpenAI', description: 'Para la creación de libros con IA utilizamos la API de OpenAI (GPT-4o). Sus entradas (textos, indicaciones) se transmiten a OpenAI para su procesamiento. OpenAI procesa datos en los EE. UU.; la transferencia se basa en las Cláusulas Contractuales Estándar de la UE (Art. 46(2)(c) RGPD).', link: 'https://openai.com/privacy' },
      { name: 'Supabase', description: 'Nuestra base de datos y autenticación se ejecutan en Supabase (PostgreSQL). Sus datos se almacenan en servidores dentro de la UE.', link: 'https://supabase.com/privacy' },
      { name: 'Stripe', description: 'Los pagos en la plataforma web y Android se procesan a través de Stripe. Stripe está certificado por PCI-DSS. Se aplican las Cláusulas Contractuales Estándar de la UE para el procesamiento en EE. UU.', link: 'https://stripe.com/privacy' },
      { name: 'Apple (iOS)', description: 'Las compras dentro de la aplicación y las suscripciones en la aplicación de iOS se procesan a través de Apple In-App Purchase.', link: 'https://www.apple.com/legal/privacy/' },
      { name: 'Google (Android)', description: 'Las compras dentro de la aplicación y las suscripciones en la aplicación de Android se procesan a través de Google Play In-App Billing.', link: 'https://policies.google.com/privacy' },
      { name: 'Lulu Direct', description: 'Para la impresión y envío de libros físicos utilizamos Lulu Direct. El nombre y la dirección de entrega se transmiten para este fin.', link: 'https://www.lulu.com/about/privacy-policy' },
    ],
  }

  const list = providers[lang as keyof typeof providers] ?? providers.en
  const policyLabel = lang === 'de' ? 'Datenschutzrichtlinie →' : lang === 'es' ? 'Política de privacidad →' : 'Privacy Policy →'

  return (
    <div className="space-y-4">
      {list.map((provider) => (
        <div key={provider.name} className="bg-muted/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-xs text-bookcraft-blue hover:underline">{policyLabel}</a>
          </div>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
      ))}
    </div>
  )
}

export default function DatenschutzPage() {
  const { language } = useLanguage()

  const sectionsDE: Section[] = [
    {
      title: '1. Verantwortlicher',
      content: (
        <div className="space-y-2">
          <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:</p>
          <ContactBlock lang="de" />
        </div>
      ),
    },
    {
      title: '2. Erhobene Daten und Verarbeitungszwecke',
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.1 Kontodaten</h3>
            <p>Bei der Registrierung erheben wir Ihre <strong>E-Mail-Adresse</strong>. Sofern Sie sich über einen OAuth-Anbieter (Google, Apple) anmelden, übermitteln diese zusätzlich Ihren <strong>Namen</strong> und — soweit vorhanden — Ihr <strong>Profilbild</strong>.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren Nutzerauthentifizierung).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.2 Buchinhalte und Fotos</h3>
            <p>Wir speichern alle <strong>Bücher und deren Inhalte</strong>, die Sie erstellen — einschließlich Texte, Titel, Konfigurationen und hochgeladener <strong>Fotos</strong>. Diese Daten sind für die Erbringung des Kerndienstes erforderlich.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.3 Zahlungsdaten</h3>
            <p>Zahlungsdaten werden <strong>ausschließlich</strong> von unserem Zahlungsdienstleister Stripe verarbeitet. Käufe innerhalb der iOS-App werden über <strong>Apple In-App Purchase</strong> abgewickelt; Käufe innerhalb der Android-App über <strong>Google Play In-App Billing</strong>. Wir speichern keine vollständigen Zahlungsdaten auf unseren Servern.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtung).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.4 Nutzungsstatistiken</h3>
            <p>Wir erheben <strong>anonymisierte Nutzungsstatistiken</strong> (z. B. aufgerufene Seiten, genutzte Funktionen, Fehlermeldungen), um die App zu verbessern.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Verbesserung des Dienstes).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.5 Druckaufträge</h3>
            <p>Bei der Bestellung eines physischen Buches übermitteln wir Ihren <strong>Namen und Ihre Lieferadresse</strong> an unseren Druckdienstleister Lulu Direct.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
          </div>
        </div>
      ),
    },
    {
      title: '3. Drittanbieter und Datenübermittlung',
      content: <ProviderList lang="de" />,
    },
    {
      title: '4. Übermittlung in Drittländer',
      content: (
        <p>Daten können in Länder außerhalb des Europäischen Wirtschaftsraums (EWR) übermittelt werden, insbesondere an OpenAI (USA) und Lulu Direct (USA). Die Übermittlung erfolgt jeweils auf Grundlage der EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO oder einem anderen geeigneten Garantiemechanismus.</p>
      ),
    },
    {
      title: '5. Datenspeicherung und Sicherheit',
      content: (
        <p>Ihre Daten werden auf sicheren Servern innerhalb der EU gespeichert. Alle Übertragungen sind durch HTTPS verschlüsselt. Der Zugriff auf personenbezogene Daten ist auf autorisiertes Personal beschränkt. Passwörter werden ausschließlich in gehashter Form (Argon2 / bcrypt) gespeichert.</p>
      ),
    },
    {
      title: '6. Speicherdauer',
      content: (
        <div className="space-y-3">
          <p>Personenbezogene Daten werden nur so lange gespeichert, wie es für die jeweiligen Verarbeitungszwecke erforderlich ist:</p>
          <ul className="space-y-2 list-none">
            {['Kontodaten: bis zur Löschung des Kontos', 'Buchinhalte und Fotos: bis zur Löschung durch Sie oder bis zur Kontolöschung', 'Rechnungen und steuerrelevante Unterlagen: 10 Jahre gemäß gesetzlicher Aufbewahrungspflicht', 'Anonymisierte Nutzungsstatistiken: unbegrenzt (kein Personenbezug)'].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full shrink-0 mt-1.5" />{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: '7. Cookies',
      content: (
        <p>Wir setzen ausschließlich technisch notwendige Cookies für die Authentifizierung (Session-Token) ein. Tracking-Cookies oder Werbe-Cookies werden nicht verwendet. Einer Einwilligung bedarf es daher nicht (§ 25 Abs. 2 Nr. 2 TTDSG).</p>
      ),
    },
    {
      title: '8. Ihre Rechte als betroffene Person',
      content: (
        <div className="space-y-3">
          <p>Ihnen stehen gegenüber uns folgende Rechte bezüglich Ihrer personenbezogenen Daten zu:</p>
          <ul className="space-y-3 list-none">
            {[
              { right: 'Auskunft (Art. 15)', desc: 'Sie können jederzeit Auskunft über die bei uns gespeicherten Daten verlangen.' },
              { right: 'Berichtigung (Art. 16)', desc: 'Unrichtige Daten können Sie jederzeit berichtigen lassen.' },
              { right: 'Löschung (Art. 17)', desc: 'Sie können die Löschung Ihres Kontos und aller zugehörigen Daten verlangen.' },
              { right: 'Einschränkung (Art. 18)', desc: 'Sie können unter bestimmten Voraussetzungen die Einschränkung der Verarbeitung verlangen.' },
              { right: 'Datenübertragbarkeit (Art. 20)', desc: 'Sie können Ihre Daten in einem maschinenlesbaren Format exportieren.' },
              { right: 'Widerspruch (Art. 21)', desc: 'Sie können der Verarbeitung auf Grundlage unserer berechtigten Interessen widersprechen.' },
              { right: 'Widerruf (Art. 7 Abs. 3)', desc: 'Erteilte Einwilligungen können Sie jederzeit ohne Angabe von Gründen widerrufen.' },
            ].map(({ right, desc }) => (
              <li key={right} className="flex items-start gap-3">
                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0">{right}</span>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Zur Ausübung Ihrer Rechte wenden Sie sich bitte an <a href="mailto:info@bookcraft.dev" className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline">info@bookcraft.dev</a>. Wir werden Ihre Anfrage innerhalb eines Monats bearbeiten (Art. 12 Abs. 3 DSGVO).</p>
        </div>
      ),
    },
    {
      title: '9. Beschwerderecht bei der Aufsichtsbehörde',
      content: (
        <p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren (Art. 77 DSGVO). Eine Liste der deutschen Aufsichtsbehörden finden Sie auf der Website des Bundesbeauftragten für den Datenschutz und die Informationsfreiheit (BfDI) unter <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline">www.bfdi.bund.de</a>.</p>
      ),
    },
    {
      title: '10. Kontolöschung',
      content: (
        <div className="space-y-3">
          <p>Sie können Ihr Konto jederzeit dauerhaft über <strong>Einstellungen → &bdquo;Konto löschen&ldquo;</strong> löschen. Dabei werden gelöscht:</p>
          <ul className="space-y-1 ml-4">
            {['Alle von Ihnen erstellten Bücher und Inhalte', 'Ihre Kontodaten (E-Mail, Name)', 'Alle hochgeladenen Fotos und Medien', 'Ihre Nutzungshistorie'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm"><span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />{item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Gesetzliche Aufbewahrungspflichten (z. B. für Rechnungen: 10 Jahre) bleiben unberührt.</p>
        </div>
      ),
    },
    {
      title: '11. Automatisierte Entscheidungsfindung',
      content: (
        <p>Wir verwenden keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlicher Weise erheblich beeinträchtigt.</p>
      ),
    },
    {
      title: '12. Änderungen dieser Datenschutzerklärung',
      content: (
        <p>Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an geänderte Rechtslagen oder Änderungen unseres Dienstes anzupassen. Bei wesentlichen Änderungen werden wir Sie per E-Mail oder durch einen In-App-Hinweis informieren.</p>
      ),
    },
    {
      title: '13. Kontakt',
      content: (
        <div className="space-y-2">
          <p>Für datenschutzrechtliche Anfragen und zur Ausübung Ihrer Rechte wenden Sie sich bitte an:</p>
          <ContactBlock lang="de" />
        </div>
      ),
    },
  ]

  const sectionsEN: Section[] = [
    {
      title: '1. Data Controller',
      content: (
        <div className="space-y-2">
          <p>The controller responsible for processing your personal data within the meaning of the General Data Protection Regulation (GDPR) is:</p>
          <ContactBlock lang="en" />
        </div>
      ),
    },
    {
      title: '2. Data We Collect and Why',
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.1 Account Data</h3>
            <p>When you register, we collect your <strong>email address</strong>. If you sign in via a third-party provider (Google or Apple OAuth), we also receive your <strong>name</strong> and, where available, your <strong>profile picture</strong>.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (performance of a contract); Art. 6(1)(f) GDPR (legitimate interest in secure authentication).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.2 Book Content and Photos</h3>
            <p>We store all <strong>books and their content</strong> that you create — including text, titles, configurations, and uploaded <strong>photos</strong>. This data is required to provide the core service.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (performance of a contract).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.3 Payment Data</h3>
            <p>Payment data is processed <strong>exclusively</strong> by our payment provider Stripe. iOS in-app purchases are handled via <strong>Apple In-App Purchase</strong>; Android in-app purchases via <strong>Google Play In-App Billing</strong>. We do not store full payment data on our servers.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (contract performance); Art. 6(1)(c) GDPR (legal obligation).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.4 Usage Statistics</h3>
            <p>We collect <strong>anonymised usage statistics</strong> (e.g. pages visited, features used, error messages) to improve the app. These data cannot be traced back to you individually and are not shared with ad networks.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Legal basis:</span> Art. 6(1)(f) GDPR (legitimate interest in improving the service).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.5 Print Orders</h3>
            <p>When you order a physical book, we transmit your <strong>name and delivery address</strong> to our print service provider Lulu Direct to enable production and shipping.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (contract performance).</p>
          </div>
        </div>
      ),
    },
    {
      title: '3. Third-Party Providers and Data Transfers',
      content: <ProviderList lang="en" />,
    },
    {
      title: '4. International Data Transfers',
      content: (
        <p>Data may be transferred to countries outside the European Economic Area (EEA), in particular to OpenAI (USA) and Lulu Direct (USA). Each transfer is based on the EU Standard Contractual Clauses pursuant to Art. 46(2)(c) GDPR or another appropriate safeguard mechanism. We will provide the relevant documents upon request.</p>
      ),
    },
    {
      title: '5. Data Storage and Security',
      content: (
        <p>Your data is stored on secure servers within the EU. All transmissions are encrypted via HTTPS. Access to personal data is restricted to authorised personnel. Passwords are stored exclusively in hashed form (Argon2 / bcrypt).</p>
      ),
    },
    {
      title: '6. Retention Periods',
      content: (
        <div className="space-y-3">
          <p>Personal data is stored only as long as necessary for the respective processing purposes or as required by statutory retention obligations:</p>
          <ul className="space-y-2 list-none">
            {['Account data: until account deletion', 'Book content and photos: until deleted by you or upon account deletion', 'Invoices and tax-relevant documents: 10 years pursuant to statutory retention obligation', 'Anonymised usage statistics: indefinitely (no personal reference)'].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full shrink-0 mt-1.5" />{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: '7. Cookies',
      content: (
        <p>We use only technically necessary cookies for authentication (session tokens). No tracking or advertising cookies are used. No consent is therefore required (§ 25(2)(2) TTDSG).</p>
      ),
    },
    {
      title: '8. Your Rights as a Data Subject',
      content: (
        <div className="space-y-3">
          <p>You have the following rights with regard to your personal data:</p>
          <ul className="space-y-3 list-none">
            {[
              { right: 'Access (Art. 15)', desc: 'You may request information about the data we hold about you at any time.' },
              { right: 'Rectification (Art. 16)', desc: 'You may have inaccurate data corrected at any time.' },
              { right: 'Erasure (Art. 17)', desc: 'You may request the deletion of your account and all associated data.' },
              { right: 'Restriction (Art. 18)', desc: 'Under certain conditions, you may request restriction of processing.' },
              { right: 'Portability (Art. 20)', desc: 'You may export your data in a machine-readable format.' },
              { right: 'Objection (Art. 21)', desc: 'You may object to processing based on our legitimate interests.' },
              { right: 'Withdrawal (Art. 7(3))', desc: 'You may withdraw any consent given at any time without giving reasons.' },
            ].map(({ right, desc }) => (
              <li key={right} className="flex items-start gap-3">
                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0">{right}</span>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">To exercise your rights, please contact <a href="mailto:info@bookcraft.dev" className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline">info@bookcraft.dev</a>. We will process your request within one month (Art. 12(3) GDPR).</p>
        </div>
      ),
    },
    {
      title: '9. Right to Lodge a Complaint with a Supervisory Authority',
      content: (
        <p>You have the right to lodge a complaint with a data protection supervisory authority about our processing of your personal data (Art. 77 GDPR). The responsible authority depends on your habitual residence, place of work, or the place of the alleged infringement.</p>
      ),
    },
    {
      title: '10. Account Deletion',
      content: (
        <div className="space-y-3">
          <p>You may permanently delete your account at any time via <strong>Settings → &ldquo;Delete account&rdquo;</strong>. The following will be deleted:</p>
          <ul className="space-y-1 ml-4">
            {['All books and content you have created', 'Your account data (email, name)', 'All uploaded photos and media', 'Your usage history'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm"><span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />{item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Statutory retention obligations (e.g. 10 years for invoices) remain unaffected.</p>
        </div>
      ),
    },
    {
      title: '11. Automated Decision-Making',
      content: (
        <p>We do not use automated decision-making within the meaning of Art. 22 GDPR that would have a legal or similarly significant effect on you.</p>
      ),
    },
    {
      title: '12. Changes to this Privacy Policy',
      content: (
        <p>We reserve the right to update this Privacy Policy as needed to reflect changes in legal requirements or our services. For material changes, we will notify you by email or via an in-app notice.</p>
      ),
    },
    {
      title: '13. Contact',
      content: (
        <div className="space-y-2">
          <p>For data protection enquiries and to exercise your rights, please contact:</p>
          <ContactBlock lang="en" />
        </div>
      ),
    },
  ]

  const sectionsES: Section[] = [
    {
      title: '1. Responsable del tratamiento',
      content: (
        <div className="space-y-2">
          <p>El responsable del tratamiento de sus datos personales en el sentido del Reglamento General de Protección de Datos (RGPD) es:</p>
          <ContactBlock lang="es" />
        </div>
      ),
    },
    {
      title: '2. Datos que recopilamos y por qué',
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.1 Datos de cuenta</h3>
            <p>Al registrarse, recopilamos su <strong>dirección de correo electrónico</strong>. Si inicia sesión a través de un proveedor externo (Google o Apple OAuth), también recibimos su <strong>nombre</strong> y, cuando esté disponible, su <strong>foto de perfil</strong>.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Base legal:</span> Art. 6(1)(b) RGPD (ejecución del contrato); Art. 6(1)(f) RGPD (interés legítimo en la autenticación segura).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.2 Contenido de libros y fotos</h3>
            <p>Almacenamos todos los <strong>libros y su contenido</strong> que usted crea, incluidos textos, títulos, configuraciones y <strong>fotos</strong> cargadas. Estos datos son necesarios para prestar el servicio principal.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Base legal:</span> Art. 6(1)(b) RGPD (ejecución del contrato).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.3 Datos de pago</h3>
            <p>Los datos de pago son procesados <strong>exclusivamente</strong> por nuestro proveedor de pagos Stripe. Las compras dentro de la aplicación de iOS se gestionan a través de <strong>Apple In-App Purchase</strong>; las de Android a través de <strong>Google Play In-App Billing</strong>. No almacenamos datos de pago completos en nuestros servidores.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Base legal:</span> Art. 6(1)(b) RGPD (ejecución del contrato); Art. 6(1)(c) RGPD (obligación legal).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.4 Estadísticas de uso</h3>
            <p>Recopilamos <strong>estadísticas de uso anonimizadas</strong> (p. ej. páginas visitadas, funciones utilizadas, mensajes de error) para mejorar la aplicación.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Base legal:</span> Art. 6(1)(f) RGPD (interés legítimo en la mejora del servicio).</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.5 Pedidos de impresión</h3>
            <p>Al pedir un libro físico, transmitimos su <strong>nombre y dirección de entrega</strong> a nuestro proveedor de servicios de impresión Lulu Direct.</p>
            <p className="mt-2 text-sm"><span className="font-medium">Base legal:</span> Art. 6(1)(b) RGPD (ejecución del contrato).</p>
          </div>
        </div>
      ),
    },
    {
      title: '3. Proveedores externos y transferencias de datos',
      content: <ProviderList lang="es" />,
    },
    {
      title: '4. Transferencias internacionales de datos',
      content: (
        <p>Los datos pueden transferirse a países fuera del Espacio Económico Europeo (EEE), en particular a OpenAI (EE. UU.) y Lulu Direct (EE. UU.). Cada transferencia se basa en las Cláusulas Contractuales Estándar de la UE conforme al Art. 46(2)(c) RGPD u otro mecanismo de garantía adecuado.</p>
      ),
    },
    {
      title: '5. Almacenamiento y seguridad de datos',
      content: (
        <p>Sus datos se almacenan en servidores seguros dentro de la UE. Todas las transmisiones están cifradas mediante HTTPS. El acceso a los datos personales está restringido al personal autorizado. Las contraseñas se almacenan exclusivamente en forma hash (Argon2 / bcrypt).</p>
      ),
    },
    {
      title: '6. Períodos de retención',
      content: (
        <div className="space-y-3">
          <p>Los datos personales se almacenan solo durante el tiempo necesario para los respectivos fines de tratamiento:</p>
          <ul className="space-y-2 list-none">
            {['Datos de cuenta: hasta la eliminación de la cuenta', 'Contenido de libros y fotos: hasta que usted los elimine o hasta la eliminación de la cuenta', 'Facturas y documentos fiscales: 10 años según obligación legal de retención', 'Estadísticas de uso anonimizadas: indefinidamente (sin referencia personal)'].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full shrink-0 mt-1.5" />{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: '7. Cookies',
      content: (
        <p>Utilizamos únicamente cookies técnicamente necesarias para la autenticación (token de sesión). No se utilizan cookies de seguimiento ni de publicidad. Por lo tanto, no se requiere consentimiento (§ 25(2)(2) TTDSG).</p>
      ),
    },
    {
      title: '8. Sus derechos como interesado',
      content: (
        <div className="space-y-3">
          <p>Usted tiene los siguientes derechos con respecto a sus datos personales:</p>
          <ul className="space-y-3 list-none">
            {[
              { right: 'Acceso (Art. 15)', desc: 'Puede solicitar información sobre los datos que tenemos sobre usted en cualquier momento.' },
              { right: 'Rectificación (Art. 16)', desc: 'Puede hacer corregir datos inexactos en cualquier momento.' },
              { right: 'Supresión (Art. 17)', desc: 'Puede solicitar la eliminación de su cuenta y todos los datos asociados.' },
              { right: 'Limitación (Art. 18)', desc: 'Bajo ciertas condiciones, puede solicitar la limitación del tratamiento.' },
              { right: 'Portabilidad (Art. 20)', desc: 'Puede exportar sus datos en un formato legible por máquina.' },
              { right: 'Oposición (Art. 21)', desc: 'Puede oponerse al tratamiento basado en nuestros intereses legítimos.' },
              { right: 'Revocación (Art. 7(3))', desc: 'Puede revocar cualquier consentimiento dado en cualquier momento sin necesidad de justificación.' },
            ].map(({ right, desc }) => (
              <li key={right} className="flex items-start gap-3">
                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0">{right}</span>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Para ejercer sus derechos, póngase en contacto con <a href="mailto:info@bookcraft.dev" className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline">info@bookcraft.dev</a>. Procesaremos su solicitud en el plazo de un mes (Art. 12(3) RGPD).</p>
        </div>
      ),
    },
    {
      title: '9. Derecho a presentar una reclamación ante una autoridad supervisora',
      content: (
        <p>Tiene derecho a presentar una reclamación ante una autoridad de control de protección de datos sobre nuestro tratamiento de sus datos personales (Art. 77 RGPD). La autoridad competente depende de su residencia habitual, lugar de trabajo o del lugar de la supuesta infracción.</p>
      ),
    },
    {
      title: '10. Eliminación de cuenta',
      content: (
        <div className="space-y-3">
          <p>Puede eliminar permanentemente su cuenta en cualquier momento a través de <strong>Configuración → &ldquo;Eliminar cuenta&rdquo;</strong>. Se eliminarán:</p>
          <ul className="space-y-1 ml-4">
            {['Todos los libros y contenido que haya creado', 'Sus datos de cuenta (correo electrónico, nombre)', 'Todas las fotos y medios cargados', 'Su historial de uso'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm"><span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />{item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Las obligaciones legales de retención (p. ej., 10 años para facturas) permanecen sin cambios.</p>
        </div>
      ),
    },
    {
      title: '11. Toma de decisiones automatizada',
      content: (
        <p>No utilizamos la toma de decisiones automatizada en el sentido del Art. 22 RGPD que tenga efecto legal o efecto similarmente significativo sobre usted.</p>
      ),
    },
    {
      title: '12. Cambios en esta política de privacidad',
      content: (
        <p>Nos reservamos el derecho de actualizar esta Política de privacidad según sea necesario para reflejar cambios en los requisitos legales o en nuestros servicios. Para cambios materiales, le notificaremos por correo electrónico o mediante un aviso en la aplicación.</p>
      ),
    },
    {
      title: '13. Contacto',
      content: (
        <div className="space-y-2">
          <p>Para consultas de protección de datos y para ejercer sus derechos, póngase en contacto con:</p>
          <ContactBlock lang="es" />
        </div>
      ),
    },
  ]

  const content: Record<string, { heading: string; subtitle: string; backLabel: string; sections: Section[]; lastUpdated: string; copyright: string; backToApp: string }> = {
    de: {
      heading: 'Datenschutzerklärung',
      subtitle: 'Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen.',
      backLabel: '← Zurück',
      sections: sectionsDE,
      lastUpdated: 'Stand: März 2026',
      copyright: `© ${new Date().getFullYear()} Bookcraft. Alle Rechte vorbehalten.`,
      backToApp: 'Zurück zur App',
    },
    en: {
      heading: 'Privacy Policy',
      subtitle: 'Protecting your personal data is important to us.',
      backLabel: '← Back',
      sections: sectionsEN,
      lastUpdated: 'Last updated: March 2026',
      copyright: `© ${new Date().getFullYear()} Bookcraft. All rights reserved.`,
      backToApp: 'Back to App',
    },
    es: {
      heading: 'Política de privacidad',
      subtitle: 'Proteger sus datos personales es importante para nosotros.',
      backLabel: '← Volver',
      sections: sectionsES,
      lastUpdated: 'Última actualización: marzo de 2026',
      copyright: `© ${new Date().getFullYear()} Bookcraft. Todos los derechos reservados.`,
      backToApp: 'Volver a la aplicación',
    },
  }

  const c = content[language] ?? content.de

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-bookcraft-blue to-bookcraft-blue text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-blue-200 hover:text-white transition-colors text-sm">{c.backLabel}</Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{c.heading}</h1>
          <p className="text-blue-100 text-lg">{c.subtitle}</p>
          <p className="text-blue-200 text-sm mt-4">{c.lastUpdated}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="space-y-10">
          {c.sections.map((section) => (
            <section key={section.title} className="scroll-mt-8">
              <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border">{section.title}</h2>
              <div className="text-muted-foreground leading-relaxed">{section.content}</div>
            </section>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>{c.copyright}{' '}<Link href="/" className="text-bookcraft-blue hover:underline">{c.backToApp}</Link></p>
        </div>
      </div>
    </div>
  )
}

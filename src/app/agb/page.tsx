'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

interface Section {
  title: string
  body: React.ReactNode
}

const ProviderBlock = () => (
  <div className="bg-muted p-4 rounded-lg my-3">
    <p className="text-sm text-muted-foreground">
      Jakob Kasimir Altenburg<br />
      Burgseestraße 1<br />
      19053 Schwerin<br />
      E-mail: info@bookcraft.dev
    </p>
  </div>
)

export default function AGBPage() {
  const { language } = useLanguage()

  const sectionsEN: Section[] = [
    {
      title: '§ 1 Scope of Application and Provider',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) These Terms and Conditions (hereinafter &ldquo;T&amp;C&rdquo;) apply to all contracts concluded between</p>
          <ProviderBlock />
          <p>(hereinafter &ldquo;Provider&rdquo;) and the user (hereinafter &ldquo;Customer&rdquo;) via the AI-powered book generation platform Bookcraft (hereinafter &ldquo;Platform&rdquo;).</p>
          <p>(2) The business relationship between the Provider and the Customer is governed exclusively by these T&amp;C in the version valid at the time of the order. Deviating conditions of the Customer will not be recognized unless the Provider expressly agrees to their validity in writing.</p>
          <p>(3) The contract language is English.</p>
        </div>
      ),
    },
    {
      title: '§ 2 Service Description',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Provider operates a web-based platform for automated creation of books using Artificial Intelligence (AI). The service includes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generation of text content based on user input</li>
            <li>Creation of book covers and illustrations using AI image generation</li>
            <li>Formatting and layout options</li>
            <li>Export functions for various file formats (PDF, EPUB)</li>
            <li>Optional: Printing and shipping through partner companies</li>
          </ul>
          <p>(2) The generated content is based on AI technology (OpenAI GPT and DALL-E). The Provider cannot guarantee that generated content is error-free, factually correct, or suitable for every intended use.</p>
          <p>(3) The Provider reserves the right to expand, restrict, or modify the functional scope of the Platform at any time, insofar as this is reasonable for the Customer.</p>
        </div>
      ),
    },
    {
      title: '§ 3 Contract Formation and Registration',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The presentation of services on the website does not constitute a legally binding offer, but rather a non-binding invitation to the Customer to order services.</p>
          <p>(2) Registration is required to use the Platform. The Customer is obliged to provide truthful information and to keep their access credentials confidential.</p>
          <p>(3) The contract for the use of paid services is concluded when the Customer places an order and the Provider accepts it by activating the service or by sending a confirmation email.</p>
          <p>(4) The Customer must have reached the age of 18 or, if a minor, must provide proof of consent from a legal guardian.</p>
        </div>
      ),
    },
    {
      title: '§ 4 Prices and Payment Terms',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The prices shown on the website at the time of ordering apply. All prices include applicable statutory value-added tax.</p>
          <p>(2) Payment is made through the payment service provider Stripe. Accepted payment methods are displayed in the ordering process. Payment is due immediately upon ordering.</p>
          <p>(3) For paid subscriptions, charges are automatically debited at the beginning of each billing period. The Customer may cancel their subscription at any time at the end of the current billing period.</p>
          <p>(4) The Provider reserves the right to change prices. For subscriptions, the Customer will be informed of price changes at least 30 days before they take effect.</p>
        </div>
      ),
    },
    {
      title: '§ 5 Usage Rights and Intellectual Property',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Customer receives a simple, non-transferable, geographically unlimited right to use the content they have generated for private and commercial purposes.</p>
          <p>(2) The usage rights to the Platform itself remain with the Provider. The Customer is only granted a non-exclusive right to use the Platform for its intended purpose.</p>
          <p>(3) The Provider does not guarantee that the generated content is free from copyright infringement. The Customer is solely responsible for examining the legal situation before publication or commercial use.</p>
          <p>(4) The Customer grants the Provider the right to process submitted content for contract fulfillment and to transmit it to third-party providers necessary for service delivery (e.g., OpenAI).</p>
        </div>
      ),
    },
    {
      title: '§ 6 Customer Obligations',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Customer warrants that their inputs and the intended use of the generated content:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>do not infringe third-party rights (especially copyrights, trademark rights, personality rights)</li>
            <li>do not contain illegal, offensive, discriminatory, or pornographic content</li>
            <li>do not violate applicable law</li>
            <li>do not contain malware or other harmful elements</li>
          </ul>
          <p>(2) The Customer indemnifies the Provider against all third-party claims resulting from a breach of these obligations, including costs of legal defense.</p>
          <p>(3) The Provider is entitled to delete content or block access if there are concrete indications of a violation of these provisions.</p>
        </div>
      ),
    },
    {
      title: '§ 7 Right of Withdrawal for Consumers',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-foreground mb-2">Right of Withdrawal Notice</h4>
            <p className="text-sm mb-2"><strong>Right of Withdrawal</strong><br />You have the right to withdraw from this contract within fourteen days without giving any reason.</p>
            <p className="text-sm mb-2">To exercise your right of withdrawal, you must inform us (Jakob Kasimir Altenburg, Burgseestraße 1, 19053 Schwerin, E-mail: info@bookcraft.dev) by means of a clear statement of your decision to withdraw from this contract.</p>
            <p className="text-sm mb-2"><strong>Consequences of Withdrawal</strong><br />If you withdraw from this contract, we shall reimburse to you all payments received from you immediately and at the latest within fourteen days.</p>
            <p className="text-sm mt-3"><strong>Sample Withdrawal Form:</strong>{' '}<Link href="/widerruf" className="text-bookcraft-blue hover:underline">You can download the withdrawal form here</Link></p>
          </div>
          <p>(2) The right of withdrawal expires for a contract for digital content if the Provider has begun performance after the Customer has expressly consented and confirmed their knowledge that they thereby lose their right of withdrawal.</p>
        </div>
      ),
    },
    {
      title: '§ 8 Availability and Warranty',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Provider strives for high availability of the Platform but does not guarantee uninterrupted use. Maintenance work and technical disruptions may lead to temporary restrictions.</p>
          <p>(2) Statutory warranty rights apply to digital products. The Provider warrants that the Platform meets contractual requirements at the time of provision.</p>
          <p>(3) Defects in the Platform will be remedied within a reasonable period after the Customer reports them.</p>
        </div>
      ),
    },
    {
      title: '§ 9 Liability',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Provider has unlimited liability for damages arising from injury to life, body, or health, as well as for damages based on intent or gross negligence.</p>
          <p>(2) In cases of slight negligence, the Provider is only liable for breach of essential contractual obligations. In this case, liability is limited to the contract-typical, foreseeable damage.</p>
          <p>(3) The Provider is not liable for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accuracy, completeness, or quality of AI-generated content</li>
            <li>Damages arising from the Customer&apos;s use of the generated content</li>
            <li>Legal violations through the use of the generated content</li>
            <li>Failures or disruptions of third-party services (OpenAI, Stripe, Lulu)</li>
          </ul>
        </div>
      ),
    },
    {
      title: '§ 10 Data Protection',
      body: (
        <p className="text-muted-foreground">
          The protection of your personal data is important to us. Information on the collection, processing, and use of your data can be found in our{' '}
          <Link href="/datenschutz" className="text-bookcraft-blue hover:underline">Privacy Policy</Link>.
        </p>
      ),
    },
    {
      title: '§ 11 Contract Term and Termination',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Contracts for individual services end automatically upon complete provision of the service.</p>
          <p>(2) Subscriptions may be terminated by either party at any time at the end of the respective billing period. Termination can be made via the user account or by email.</p>
          <p>(3) The Customer may delete their user account at any time. Already generated content will be deleted after a reasonable period, unless statutory retention obligations exist.</p>
        </div>
      ),
    },
    {
      title: '§ 12 Amendments to the T&C',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The Provider reserves the right to amend these T&amp;C with effect for the future, insofar as this is necessary for objectively justified reasons.</p>
          <p>(2) The Customer will be informed of changes by email or via their user account. If the Customer does not object within 30 days, the amended T&amp;C shall be deemed accepted.</p>
        </div>
      ),
    },
    {
      title: '§ 13 Final Provisions',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) The law of the Federal Republic of Germany applies, excluding the UN CISG. For consumers, this choice of law only applies insofar as the protection granted by mandatory provisions of the law of the state of habitual residence is not withdrawn.</p>
          <p>(2) If the Customer is a merchant, legal entity under public law, or special fund under public law, the exclusive place of jurisdiction is Schwerin.</p>
          <p>(3) We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>
          <p>(4) Should individual provisions of these T&amp;C be or become invalid or unenforceable, this shall not affect the validity of the remaining provisions.</p>
        </div>
      ),
    },
  ]

  const sectionsDE: Section[] = [
    {
      title: '§ 1 Geltungsbereich und Anbieter',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend &bdquo;AGB&ldquo;) gelten für alle Verträge, die zwischen</p>
          <ProviderBlock />
          <p>(nachfolgend &bdquo;Anbieter&ldquo;) und dem Nutzer (nachfolgend &bdquo;Kunde&ldquo;) über die KI-gestützte Buchgenerierungsplattform Bookcraft (nachfolgend &bdquo;Plattform&ldquo;) abgeschlossen werden.</p>
          <p>(2) Die Geschäftsbeziehung zwischen dem Anbieter und dem Kunden unterliegt ausschließlich diesen AGB in der zum Zeitpunkt der Bestellung gültigen Fassung. Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.</p>
          <p>(3) Die Vertragssprache ist Deutsch.</p>
        </div>
      ),
    },
    {
      title: '§ 2 Leistungsbeschreibung',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Anbieter betreibt eine webbasierte Plattform zur automatisierten Erstellung von Büchern mithilfe von Künstlicher Intelligenz (KI). Die Leistung umfasst:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generierung von Textinhalten auf Basis von Nutzereingaben</li>
            <li>Erstellung von Buchcovern und Illustrationen mittels KI-Bildgenerierung</li>
            <li>Formatierungs- und Layoutoptionen</li>
            <li>Exportfunktionen für verschiedene Dateiformate (PDF, EPUB)</li>
            <li>Optional: Druck und Versand über Partnerunternehmen</li>
          </ul>
          <p>(2) Die generierten Inhalte basieren auf KI-Technologie (OpenAI GPT und DALL-E). Der Anbieter kann nicht garantieren, dass generierte Inhalte fehlerfrei, sachlich korrekt oder für jeden Verwendungszweck geeignet sind.</p>
          <p>(3) Der Anbieter behält sich vor, den Funktionsumfang der Plattform jederzeit zu erweitern, einzuschränken oder zu ändern, soweit dies für den Kunden zumutbar ist.</p>
        </div>
      ),
    },
    {
      title: '§ 3 Vertragsschluss und Registrierung',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Die Darstellung der Leistungen auf der Website stellt kein rechtlich bindendes Angebot dar, sondern eine unverbindliche Aufforderung an den Kunden, Leistungen zu bestellen.</p>
          <p>(2) Zur Nutzung der Plattform ist eine Registrierung erforderlich. Der Kunde ist verpflichtet, wahrheitsgemäße Angaben zu machen und seine Zugangsdaten vertraulich zu behandeln.</p>
          <p>(3) Der Vertrag über die Nutzung kostenpflichtiger Leistungen kommt zustande, wenn der Kunde eine Bestellung aufgibt und der Anbieter diese durch Freischaltung der Leistung oder durch Übersendung einer Bestätigungs-E-Mail annimmt.</p>
          <p>(4) Der Kunde muss das 18. Lebensjahr vollendet haben oder bei Minderjährigkeit die Einwilligung eines Erziehungsberechtigten nachweisen.</p>
        </div>
      ),
    },
    {
      title: '§ 4 Preise und Zahlungsbedingungen',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Es gelten die zum Zeitpunkt der Bestellung auf der Website ausgewiesenen Preise. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.</p>
          <p>(2) Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Die akzeptierten Zahlungsmethoden werden im Bestellprozess angezeigt. Die Zahlung ist sofort fällig.</p>
          <p>(3) Bei kostenpflichtigen Abonnements werden die Gebühren automatisch zu Beginn jeder Abrechnungsperiode abgebucht. Der Kunde kann sein Abonnement jederzeit zum Ende der aktuellen Abrechnungsperiode kündigen.</p>
          <p>(4) Der Anbieter behält sich vor, Preise zu ändern. Bei Abonnements wird der Kunde über Preisänderungen mindestens 30 Tage vor ihrem Inkrafttreten informiert.</p>
        </div>
      ),
    },
    {
      title: '§ 5 Nutzungsrechte und geistiges Eigentum',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Kunde erhält ein einfaches, nicht übertragbares, räumlich unbeschränktes Nutzungsrecht an den von ihm generierten Inhalten für private und gewerbliche Zwecke.</p>
          <p>(2) Die Nutzungsrechte an der Plattform selbst verbleiben beim Anbieter. Dem Kunden wird lediglich ein nicht-exklusives Recht zur Nutzung der Plattform für den bestimmungsgemäßen Zweck eingeräumt.</p>
          <p>(3) Der Anbieter übernimmt keine Gewähr dafür, dass die generierten Inhalte frei von Urheberrechtsverletzungen sind. Der Kunde ist allein verantwortlich für die rechtliche Prüfung vor Veröffentlichung oder gewerblicher Nutzung.</p>
          <p>(4) Der Kunde räumt dem Anbieter das Recht ein, eingereichte Inhalte zur Vertragserfüllung zu verarbeiten und an für die Leistungserbringung notwendige Drittanbieter zu übermitteln (z. B. OpenAI).</p>
        </div>
      ),
    },
    {
      title: '§ 6 Pflichten des Kunden',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Kunde versichert, dass seine Eingaben und die beabsichtigte Nutzung der generierten Inhalte:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>keine Rechte Dritter (insbesondere Urheber-, Marken-, Persönlichkeitsrechte) verletzen</li>
            <li>keine illegalen, beleidigenden, diskriminierenden oder pornografischen Inhalte enthalten</li>
            <li>nicht gegen geltendes Recht verstoßen</li>
            <li>keine Schadsoftware oder andere schädliche Elemente enthalten</li>
          </ul>
          <p>(2) Der Kunde stellt den Anbieter von allen Ansprüchen Dritter frei, die aus einer Verletzung dieser Pflichten entstehen, einschließlich der Kosten der Rechtsverteidigung.</p>
          <p>(3) Der Anbieter ist berechtigt, Inhalte zu löschen oder den Zugang zu sperren, wenn konkrete Anhaltspunkte für einen Verstoß gegen diese Bestimmungen vorliegen.</p>
        </div>
      ),
    },
    {
      title: '§ 7 Widerrufsrecht für Verbraucher',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-foreground mb-2">Widerrufsbelehrung</h4>
            <p className="text-sm mb-2"><strong>Widerrufsrecht</strong><br />Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
            <p className="text-sm mb-2">Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Jakob Kasimir Altenburg, Burgseestraße 1, 19053 Schwerin, E-Mail: info@bookcraft.dev) mittels einer eindeutigen Erklärung über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.</p>
            <p className="text-sm mb-2"><strong>Folgen des Widerrufs</strong><br />Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen.</p>
            <p className="text-sm mt-3"><strong>Muster-Widerrufsformular:</strong>{' '}<Link href="/widerruf" className="text-bookcraft-blue hover:underline">Widerrufsformular hier herunterladen</Link></p>
          </div>
          <p>(2) Das Widerrufsrecht erlischt bei einem Vertrag zur Lieferung digitaler Inhalte, wenn der Anbieter mit der Ausführung des Vertrags begonnen hat, nachdem der Kunde ausdrücklich zugestimmt hat und zur Kenntnis genommen hat, dass er dadurch sein Widerrufsrecht verliert.</p>
        </div>
      ),
    },
    {
      title: '§ 8 Verfügbarkeit und Gewährleistung',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Anbieter ist um eine hohe Verfügbarkeit der Plattform bemüht, gewährleistet jedoch keine ununterbrochene Nutzbarkeit. Wartungsarbeiten und technische Störungen können zu vorübergehenden Einschränkungen führen.</p>
          <p>(2) Für digitale Produkte gelten die gesetzlichen Gewährleistungsrechte. Der Anbieter gewährleistet, dass die Plattform zum Zeitpunkt der Bereitstellung die vertraglichen Anforderungen erfüllt.</p>
          <p>(3) Mängel der Plattform werden innerhalb einer angemessenen Frist nach Meldung durch den Kunden behoben.</p>
        </div>
      ),
    },
    {
      title: '§ 9 Haftung',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.</p>
          <p>(2) Bei einfacher Fahrlässigkeit haftet der Anbieter nur für die Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), beschränkt auf den vertragstypischen, vorhersehbaren Schaden.</p>
          <p>(3) Der Anbieter haftet nicht für:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Richtigkeit, Vollständigkeit oder Qualität der KI-generierten Inhalte</li>
            <li>Schäden, die aus der Nutzung der generierten Inhalte durch den Kunden entstehen</li>
            <li>Rechtsverletzungen durch die Nutzung der generierten Inhalte</li>
            <li>Ausfälle oder Störungen von Drittanbieterdiensten (OpenAI, Stripe, Lulu)</li>
          </ul>
        </div>
      ),
    },
    {
      title: '§ 10 Datenschutz',
      body: (
        <p className="text-muted-foreground">
          Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer Daten finden Sie in unserer{' '}
          <Link href="/datenschutz" className="text-bookcraft-blue hover:underline">Datenschutzerklärung</Link>.
        </p>
      ),
    },
    {
      title: '§ 11 Vertragslaufzeit und Kündigung',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Verträge über Einzelleistungen (z. B. einmalige Buchgenerierung) enden automatisch mit vollständiger Erbringung der Leistung.</p>
          <p>(2) Abonnements können von beiden Seiten jederzeit zum Ende der jeweiligen Abrechnungsperiode gekündigt werden. Die Kündigung kann über das Nutzerkonto oder per E-Mail erfolgen.</p>
          <p>(3) Der Kunde kann sein Nutzerkonto jederzeit löschen. Bereits generierte Inhalte werden nach einer angemessenen Frist gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
        </div>
      ),
    },
    {
      title: '§ 12 Änderungen der AGB',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern, soweit hierfür sachlich gerechtfertigte Gründe vorliegen und der Kunde dadurch nicht unangemessen benachteiligt wird.</p>
          <p>(2) Der Kunde wird über Änderungen per E-Mail oder über sein Nutzerkonto informiert. Widerspricht der Kunde den geänderten AGB nicht innerhalb von 30 Tagen, gelten die geänderten AGB als akzeptiert.</p>
        </div>
      ),
    },
    {
      title: '§ 13 Schlussbestimmungen',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Für Verbraucher gilt dies nur, soweit der durch zwingende Vorschriften des Rechts des Staates des gewöhnlichen Aufenthalts gewährte Schutz nicht entzogen wird.</p>
          <p>(2) Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag Schwerin.</p>
          <p>(3) Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
          <p>(4) Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, berührt dies die Wirksamkeit der übrigen Bestimmungen nicht.</p>
        </div>
      ),
    },
  ]

  const sectionsES: Section[] = [
    {
      title: '§ 1 Ámbito de aplicación y proveedor',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Estas Condiciones Generales de Contratación (en adelante &ldquo;CGC&rdquo;) se aplican a todos los contratos celebrados entre</p>
          <ProviderBlock />
          <p>(en adelante &ldquo;Proveedor&rdquo;) y el usuario (en adelante &ldquo;Cliente&rdquo;) a través de la plataforma de generación de libros con IA Bookcraft (en adelante &ldquo;Plataforma&rdquo;).</p>
          <p>(2) La relación comercial entre el Proveedor y el Cliente se rige exclusivamente por estas CGC en la versión vigente en el momento del pedido.</p>
          <p>(3) El idioma del contrato es el español.</p>
        </div>
      ),
    },
    {
      title: '§ 2 Descripción del servicio',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Proveedor opera una plataforma basada en web para la creación automatizada de libros utilizando Inteligencia Artificial (IA). El servicio incluye:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generación de contenido de texto basado en la entrada del usuario</li>
            <li>Creación de portadas e ilustraciones usando generación de imágenes con IA</li>
            <li>Opciones de formato y diseño</li>
            <li>Funciones de exportación para varios formatos de archivo (PDF, EPUB)</li>
            <li>Opcional: Impresión y envío a través de empresas asociadas</li>
          </ul>
          <p>(2) El contenido generado se basa en tecnología de IA (OpenAI GPT y DALL-E). El Proveedor no puede garantizar que el contenido generado esté libre de errores, sea factualmente correcto o sea adecuado para cada uso previsto.</p>
          <p>(3) El Proveedor se reserva el derecho de ampliar, restringir o modificar el alcance funcional de la Plataforma en cualquier momento, en la medida en que esto sea razonable para el Cliente.</p>
        </div>
      ),
    },
    {
      title: '§ 3 Formación del contrato y registro',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) La presentación de los servicios en el sitio web no constituye una oferta legalmente vinculante, sino una invitación no vinculante al Cliente para solicitar servicios.</p>
          <p>(2) Es necesario el registro para usar la Plataforma. El Cliente está obligado a proporcionar información veraz y mantener sus credenciales de acceso en confidencialidad.</p>
          <p>(3) El contrato para el uso de servicios de pago se celebra cuando el Cliente realiza un pedido y el Proveedor lo acepta activando el servicio o enviando un correo electrónico de confirmación.</p>
          <p>(4) El Cliente debe tener 18 años o, si es menor de edad, debe aportar prueba del consentimiento de un tutor legal.</p>
        </div>
      ),
    },
    {
      title: '§ 4 Precios y condiciones de pago',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Se aplican los precios mostrados en el sitio web en el momento del pedido. Todos los precios incluyen el IVA legal aplicable.</p>
          <p>(2) El pago se realiza a través del proveedor de servicios de pago Stripe. Los métodos de pago aceptados se muestran en el proceso de pedido.</p>
          <p>(3) Para las suscripciones de pago, los cargos se debitan automáticamente al comienzo de cada período de facturación. El Cliente puede cancelar su suscripción en cualquier momento al final del período de facturación actual.</p>
          <p>(4) El Proveedor se reserva el derecho a cambiar los precios. Para las suscripciones, el Cliente será informado de los cambios de precios con al menos 30 días de antelación.</p>
        </div>
      ),
    },
    {
      title: '§ 5 Derechos de uso y propiedad intelectual',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Cliente recibe un derecho de uso simple, no transferible y geográficamente ilimitado sobre el contenido que ha generado para fines privados y comerciales.</p>
          <p>(2) Los derechos de uso de la propia Plataforma permanecen con el Proveedor.</p>
          <p>(3) El Proveedor no garantiza que el contenido generado esté libre de infracciones de derechos de autor. El Cliente es el único responsable de examinar la situación legal antes de la publicación o el uso comercial.</p>
          <p>(4) El Cliente otorga al Proveedor el derecho de procesar el contenido enviado para el cumplimiento del contrato y transmitirlo a los proveedores externos necesarios para la prestación del servicio (p. ej., OpenAI).</p>
        </div>
      ),
    },
    {
      title: '§ 6 Obligaciones del cliente',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Cliente garantiza que sus entradas y el uso previsto del contenido generado:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>no infringen los derechos de terceros (especialmente derechos de autor, marcas comerciales, derechos de personalidad)</li>
            <li>no contienen contenido ilegal, ofensivo, discriminatorio o pornográfico</li>
            <li>no violan la ley aplicable</li>
            <li>no contienen malware u otros elementos dañinos</li>
          </ul>
          <p>(2) El Cliente indemnizará al Proveedor de todas las reclamaciones de terceros resultantes de un incumplimiento de estas obligaciones, incluidos los costos de defensa legal.</p>
          <p>(3) El Proveedor tiene derecho a eliminar contenido o bloquear el acceso si hay indicios concretos de una violación de estas disposiciones.</p>
        </div>
      ),
    },
    {
      title: '§ 7 Derecho de desistimiento para consumidores',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-foreground mb-2">Aviso de derecho de desistimiento</h4>
            <p className="text-sm mb-2"><strong>Derecho de desistimiento</strong><br />Tiene derecho a desistir del presente contrato en un plazo de catorce días sin necesidad de justificación.</p>
            <p className="text-sm mb-2">Para ejercer el derecho de desistimiento, debe notificarnos (Jakob Kasimir Altenburg, Burgseestraße 1, 19053 Schwerin, Correo electrónico: info@bookcraft.dev) mediante una declaración clara de su decisión de desistir del contrato.</p>
            <p className="text-sm mb-2"><strong>Consecuencias del desistimiento</strong><br />Si desiste del presente contrato, le reembolsaremos todos los pagos recibidos de usted sin demora y, a más tardar, en el plazo de catorce días.</p>
            <p className="text-sm mt-3"><strong>Formulario de desistimiento:</strong>{' '}<Link href="/widerruf" className="text-bookcraft-blue hover:underline">Puede descargar el formulario aquí</Link></p>
          </div>
          <p>(2) El derecho de desistimiento expirará en el caso de un contrato para el suministro de contenido digital si el Proveedor ha comenzado la ejecución del contrato después de que el Cliente haya dado su consentimiento expreso y haya confirmado su conocimiento de que pierde su derecho de desistimiento.</p>
        </div>
      ),
    },
    {
      title: '§ 8 Disponibilidad y garantía',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Proveedor se esfuerza por lograr una alta disponibilidad de la Plataforma, pero no garantiza un uso ininterrumpido. El mantenimiento y las interrupciones técnicas pueden provocar restricciones temporales.</p>
          <p>(2) Se aplican los derechos de garantía legales para los productos digitales.</p>
          <p>(3) Los defectos de la Plataforma se subsanarán en un plazo razonable después de que el Cliente los notifique.</p>
        </div>
      ),
    },
    {
      title: '§ 9 Responsabilidad',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Proveedor tiene responsabilidad ilimitada por daños derivados de lesiones a la vida, al cuerpo o a la salud, así como por daños basados en dolo o negligencia grave.</p>
          <p>(2) En casos de negligencia leve, el Proveedor solo es responsable por incumplimiento de obligaciones contractuales esenciales, limitado al daño previsible típico del contrato.</p>
          <p>(3) El Proveedor no es responsable de:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>La precisión, integridad o calidad del contenido generado por IA</li>
            <li>Los daños derivados del uso del contenido generado por parte del Cliente</li>
            <li>Las infracciones legales mediante el uso del contenido generado</li>
            <li>Fallos o interrupciones de servicios de terceros (OpenAI, Stripe, Lulu)</li>
          </ul>
        </div>
      ),
    },
    {
      title: '§ 10 Protección de datos',
      body: (
        <p className="text-muted-foreground">
          La protección de sus datos personales es importante para nosotros. La información sobre la recopilación, el procesamiento y el uso de sus datos se puede encontrar en nuestra{' '}
          <Link href="/datenschutz" className="text-bookcraft-blue hover:underline">Política de privacidad</Link>.
        </p>
      ),
    },
    {
      title: '§ 11 Duración del contrato y rescisión',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Los contratos de servicios individuales (p. ej., generación de libros por única vez) terminan automáticamente tras la prestación completa del servicio.</p>
          <p>(2) Las suscripciones pueden ser rescindidas por cualquiera de las partes en cualquier momento al final del período de facturación respectivo. La rescisión puede realizarse a través de la cuenta de usuario o por correo electrónico.</p>
          <p>(3) El Cliente puede eliminar su cuenta de usuario en cualquier momento. El contenido ya generado se eliminará después de un período razonable, a menos que existan obligaciones legales de retención.</p>
        </div>
      ),
    },
    {
      title: '§ 12 Modificaciones de las CGC',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) El Proveedor se reserva el derecho de modificar estas CGC con efecto para el futuro, en la medida en que esto sea necesario por razones objetivamente justificadas y el Cliente no sea perjudicado de manera irrazonable.</p>
          <p>(2) El Cliente será informado de los cambios por correo electrónico o a través de su cuenta de usuario. Si el Cliente no se opone a las CGC modificadas en un plazo de 30 días, las CGC modificadas se considerarán aceptadas.</p>
        </div>
      ),
    },
    {
      title: '§ 13 Disposiciones finales',
      body: (
        <div className="space-y-3 text-muted-foreground">
          <p>(1) Se aplica el derecho de la República Federal de Alemania, excluyendo la Convención de la ONU sobre Contratos de Compraventa Internacional de Mercaderías (CISG). Para los consumidores, esta elección de ley solo se aplica en la medida en que no se retire la protección otorgada por las disposiciones obligatorias de la ley del estado de residencia habitual.</p>
          <p>(2) Si el Cliente es un comerciante, persona jurídica de derecho público o fondo especial de derecho público, el lugar de jurisdicción exclusivo para todas las disputas derivadas de este contrato es Schwerin.</p>
          <p>(3) No estamos dispuestos ni obligados a participar en procedimientos de resolución de disputas ante una junta de arbitraje de consumidores.</p>
          <p>(4) Si alguna disposición de estas CGC es o se vuelve inválida o inaplicable, esto no afectará la validez de las disposiciones restantes.</p>
        </div>
      ),
    },
  ]

  const content: Record<string, { title: string; sections: Section[]; lastUpdated: string }> = {
    en: {
      title: 'Terms and Conditions (T&C)',
      sections: sectionsEN,
      lastUpdated: 'Last updated: December 2025',
    },
    de: {
      title: 'Allgemeine Geschäftsbedingungen (AGB)',
      sections: sectionsDE,
      lastUpdated: 'Stand: Dezember 2025',
    },
    es: {
      title: 'Condiciones Generales de Contratación (CGC)',
      sections: sectionsES,
      lastUpdated: 'Última actualización: diciembre de 2025',
    },
  }

  const c = content[language] ?? content.en

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">{c.title}</h1>

          <div className="bg-card rounded-lg shadow-lg p-8 space-y-8 border border-border">
            {c.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-semibold text-foreground mb-4">{section.title}</h2>
                {section.body}
              </section>
            ))}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{c.lastUpdated}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

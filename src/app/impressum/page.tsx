'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function ImpressumPage() {
  const { language } = useLanguage()

  const content = {
    en: {
      pageTitle: 'Legal Notice',
      sections: [
        {
          title: 'Information According to § 5 DDG',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Bookcraft</strong></p>
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
              <p>Germany</p>
            </div>
          ),
        },
        {
          title: 'Contact',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>E-mail:</strong> info@bookcraft.dev</p>
            </div>
          ),
        },
        {
          title: 'Responsible for Content According to § 18 Para. 2 MStV',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
            </div>
          ),
        },
        {
          title: 'EU Dispute Resolution',
          body: (
            <div className="text-muted-foreground space-y-2">
              <p>
                The European Commission provides a platform for online dispute resolution (ODR):{' '}
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-bookcraft-blue hover:underline dark:text-bookcraft-blue/80">
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>Our email address can be found above in the legal notice.</p>
            </div>
          ),
        },
        {
          title: 'Consumer Dispute Resolution / Universal Arbitration Board',
          body: (
            <p className="text-muted-foreground">
              We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          ),
        },
        {
          title: 'Liability for Content',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                As a service provider, we are responsible for our own content on these pages in accordance with § 7 para. 1 DDG under general laws. According to §§ 8 to 10 DDG, however, we as a service provider are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
              </p>
              <p>
                Obligations to remove or block the use of information under general laws remain unaffected. However, liability in this regard is only possible from the time of knowledge of a specific legal violation. Upon becoming aware of such legal violations, we will remove this content immediately.
              </p>
            </div>
          ),
        },
        {
          title: 'Liability for Links',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Our offer contains links to external third-party websites over whose content we have no influence. Therefore, we cannot accept any liability for this external content. The respective provider or operator of the pages is always responsible for the content of the linked pages.
              </p>
              <p>
                However, permanent monitoring of the content of linked pages is not reasonable without concrete evidence of a legal violation. Upon becoming aware of legal violations, we will remove such links immediately.
              </p>
            </div>
          ),
        },
        {
          title: 'Copyright',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, and any kind of exploitation outside the limits of copyright law require the written consent of the respective author or creator.
              </p>
              <p>
                Should you become aware of a copyright infringement, please inform us accordingly. Upon becoming aware of legal violations, we will remove such content immediately.
              </p>
            </div>
          ),
        },
      ],
      lastUpdated: 'Last updated: December 2025',
    },
    de: {
      pageTitle: 'Impressum',
      sections: [
        {
          title: 'Angaben gemäß § 5 DDG',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Bookcraft</strong></p>
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
              <p>Deutschland</p>
            </div>
          ),
        },
        {
          title: 'Kontakt',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>E-Mail:</strong> info@bookcraft.dev</p>
            </div>
          ),
        },
        {
          title: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
            </div>
          ),
        },
        {
          title: 'EU-Streitschlichtung',
          body: (
            <div className="text-muted-foreground space-y-2">
              <p>
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-bookcraft-blue hover:underline dark:text-bookcraft-blue/80">
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
            </div>
          ),
        },
        {
          title: 'Verbraucherstreitbeilegung / Universalschlichtungsstelle',
          body: (
            <p className="text-muted-foreground">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          ),
        },
        {
          title: 'Haftung für Inhalte',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p>
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </div>
          ),
        },
        {
          title: 'Haftung für Links',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              </p>
              <p>
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>
            </div>
          ),
        },
        {
          title: 'Urheberrecht',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
              <p>
                Sollten Sie auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
            </div>
          ),
        },
      ],
      lastUpdated: 'Stand: Dezember 2025',
    },
    es: {
      pageTitle: 'Aviso Legal',
      sections: [
        {
          title: 'Información según § 5 DDG',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Bookcraft</strong></p>
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
              <p>Alemania</p>
            </div>
          ),
        },
        {
          title: 'Contacto',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Correo electrónico:</strong> info@bookcraft.dev</p>
            </div>
          ),
        },
        {
          title: 'Responsable del contenido según § 18 párr. 2 MStV',
          body: (
            <div className="space-y-2 text-muted-foreground">
              <p>Jakob Kasimir Altenburg</p>
              <p>Burgseestraße 1</p>
              <p>19053 Schwerin</p>
            </div>
          ),
        },
        {
          title: 'Resolución de disputas en la UE',
          body: (
            <div className="text-muted-foreground space-y-2">
              <p>
                La Comisión Europea ofrece una plataforma de resolución de litigios en línea (ODR):{' '}
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-bookcraft-blue hover:underline dark:text-bookcraft-blue/80">
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>Nuestra dirección de correo electrónico se encuentra en el aviso legal anterior.</p>
            </div>
          ),
        },
        {
          title: 'Resolución de disputas con consumidores',
          body: (
            <p className="text-muted-foreground">
              No estamos dispuestos ni obligados a participar en procedimientos de resolución de disputas ante una junta de arbitraje de consumidores.
            </p>
          ),
        },
        {
          title: 'Responsabilidad por el contenido',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Como proveedor de servicios, somos responsables de nuestro propio contenido en estas páginas de acuerdo con el § 7 párr. 1 DDG según las leyes generales. Sin embargo, según los §§ 8 a 10 DDG, como proveedor de servicios no estamos obligados a supervisar información transmitida o almacenada de terceros ni a investigar circunstancias que indiquen actividad ilegal.
              </p>
              <p>
                Las obligaciones de eliminar o bloquear el uso de información según las leyes generales permanecen sin cambios. Sin embargo, la responsabilidad al respecto solo es posible a partir del momento en que se tenga conocimiento de una infracción legal específica.
              </p>
            </div>
          ),
        },
        {
          title: 'Responsabilidad por enlaces',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                Nuestra oferta contiene enlaces a sitios web de terceros externos sobre cuyo contenido no tenemos influencia. Por lo tanto, no podemos asumir responsabilidad alguna por este contenido externo. El proveedor u operador respectivo de las páginas siempre es responsable del contenido de las páginas enlazadas.
              </p>
              <p>
                Sin embargo, la supervisión permanente del contenido de las páginas enlazadas no es razonable sin evidencia concreta de una infracción legal. Al tener conocimiento de infracciones legales, eliminaremos dichos enlaces de inmediato.
              </p>
            </div>
          ),
        },
        {
          title: 'Derechos de autor',
          body: (
            <div className="text-muted-foreground space-y-3">
              <p>
                El contenido y las obras creadas por los operadores del sitio en estas páginas están sujetos a la ley alemana de derechos de autor. La duplicación, procesamiento, distribución y cualquier tipo de explotación fuera de los límites de la ley de derechos de autor requieren el consentimiento escrito del autor o creador respectivo.
              </p>
              <p>
                Si toma conocimiento de una infracción de derechos de autor, le rogamos que nos lo comunique. Al tener conocimiento de infracciones legales, eliminaremos dicho contenido de inmediato.
              </p>
            </div>
          ),
        },
      ],
      lastUpdated: 'Última actualización: diciembre de 2025',
    },
  }

  const c = content[language] ?? content.en

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">{c.pageTitle}</h1>

          <div className="bg-card rounded-lg shadow-lg p-8 space-y-8">
            {c.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-semibold text-foreground mb-4">{section.title}</h2>
                {section.body}
              </section>
            ))}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{c.lastUpdated}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

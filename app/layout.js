import "./globals.css";
import Link from "next/link";
import { JsonLd, buildWebSiteSchema } from "../lib/seoSchema.js";
import BibleGamesLink from "../components/BibleGamesLink.js";

const SITE_URL = 'https://bibleverseinsights.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bible Verse Insight",
  description:
    "Explore Bible verses with deep insights, meanings, explanations, and study guides to understand scripture better.",
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Bible Verse Insight",
    description: "Explore Bible verses with deep insights, meanings, explanations, and study guides to understand scripture better.",
    url: SITE_URL + '/',
    siteName: "Bible Verse Insights",
    type: 'website',
  },
};

const NAV_LINKS = [
  { href: "/topics/",          label: "Topics" },
  { href: "/questions/",       label: "Questions" },
  { href: "/guides/",          label: "Guides" },
  { href: "/bible-verses/",    label: "Bible Verses" },
  { href: "/bible-characters/",label: "Bible Characters" },
  { href: "/bible/john/1/",    label: "Read Bible" },
  { href: "/tools/",           label: "Tools" },
];

// External link rendered separately so it can use the responsive open behavior.
const NAV_LINK_STYLE = { color: "#c8b99a", padding: "0.3rem 0.7rem", borderRadius: "0.375rem", fontSize: "0.82rem", fontWeight: "500", textDecoration: "none" };
const FOOTER_LINK_STYLE = { color: "#a0b0c8", padding: "0.3rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.85rem", textDecoration: "none" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="FkihMIPDnTJBL07TMuuTZ42BNGkPjlePyLe8nGVWWqU" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1364556784080701"
          crossOrigin="anonymous"
        />
        {/* Site-wide WebSite structured data — emitted on every page. */}
        <JsonLd data={buildWebSiteSchema()} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NKWTM2RV');`,
          }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "#faf7f2", color: "#1a1208" }}
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NKWTM2RV"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <header style={{ backgroundColor: "#1e2d4a" }} className="shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "1.4rem" }}>✝</span>
              <span style={{ color: "#d4a017", fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "0.02em" }}>
                Bible Verse Insights
              </span>
            </Link>
            <nav style={{ display: "flex", gap: "0.15rem", flexWrap: "wrap", justifyContent: "center" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} style={NAV_LINK_STYLE}>{label}</Link>
              ))}
              <BibleGamesLink style={NAV_LINK_STYLE}>Bible Games</BibleGamesLink>
            </nav>
          </div>
        </header>

        <main style={{ flex: 1 }}>{children}</main>

        <footer style={{ backgroundColor: "#1e2d4a", color: "#8b9bb4", padding: "2.5rem 0", marginTop: "4rem" }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1rem", textAlign: "center" }}>
            <p style={{ color: "#d4a017", marginBottom: "1rem", fontFamily: "Georgia, serif", fontSize: "1.1rem" }}>
              ✝ Bible Verse Insights
            </p>
            <nav style={{ display: "flex", gap: "0.15rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} style={FOOTER_LINK_STYLE}>{label}</Link>
              ))}
              <BibleGamesLink style={FOOTER_LINK_STYLE}>Bible Games</BibleGamesLink>
            </nav>
            <nav style={{ display: "flex", gap: "0.15rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "0.85rem" }}>
              <Link href="/privacy-policy/" style={{ ...FOOTER_LINK_STYLE, fontSize: "0.78rem", color: "#7d8ca4" }}>Privacy Policy</Link>
              <Link href="/terms-of-service/" style={{ ...FOOTER_LINK_STYLE, fontSize: "0.78rem", color: "#7d8ca4" }}>Terms of Service</Link>
            </nav>
            <p style={{ fontSize: "0.8rem", color: "#6b7a90" }}>
              KJV Scripture text via{" "}
              <a href="https://bible-api.com" target="_blank" rel="noopener noreferrer" style={{ color: "#a0b0c8" }}>
                bible-api.com
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
// step0-rebuild-marker

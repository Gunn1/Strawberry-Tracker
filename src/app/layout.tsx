import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Red Wagon Farm display / body / data typefaces.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Set NEXT_PUBLIC_SITE_URL to your real domain in Vercel so share links and
// structured data use absolute URLs.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://carters-red-wagon-farm.vercel.app";

const TITLE = "Carter's Red Wagon Farm — U-Pick Strawberries, Park Rapids, MN";
const DESCRIPTION =
  "Locally grown asparagus, rhubarb, and u-pick & ready-picked strawberries from the Carter family in Park Rapids, Minnesota. Call (218) 732-4979 or follow us on Facebook.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: { icon: "/Logo.webp", apple: "/Logo.webp" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Carter's Red Wagon Farm",
    images: [{ url: "/hero.jpg", width: 2048, height: 1536, alt: "Fresh-picked strawberries at Carter's Red Wagon Farm" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero.jpg"],
  },
};

// LocalBusiness structured data so the farm shows up in local search / maps.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Carter's Red Wagon Farm",
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/hero.jpg`,
  telephone: "+1-218-732-4979",
  address: {
    "@type": "PostalAddress",
    streetAddress: "14766 119th Ave",
    addressLocality: "Park Rapids",
    addressRegion: "MN",
    postalCode: "56470",
    addressCountry: "US",
  },
  sameAs: ["https://www.facebook.com/CartersRedWagonFarm"],
  paymentAccepted: "Cash, Discover, MasterCard, Visa",
  // U-pick season hours; we're closed Sundays.
  openingHours: "Mo-Sa 07:00-12:00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}

import Stripe from "stripe";

// Lazy getter for Stripe instance
const getStripe = (): Stripe => {
 if (!process.env.STRIPE_SECRET_KEY) {
 throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
 }
 return new Stripe(process.env.STRIPE_SECRET_KEY, {
 apiVersion: "2025-08-27.basil",
 typescript: true,
 });
};

// Create a Proxy to lazy-load Stripe instance
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
 get: (target, prop) => {
 if (!stripeInstance) {
 stripeInstance = getStripe();
 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
 return (stripeInstance as any)[prop];
 }
});

export const getStripePublishableKey = () => {
 if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
 throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined");
 }
 return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
};

// URL für Stripe Checkout (pay.bookcraft.dev)
export const getPaymentUrl = () => {
 if (process.env.VERCEL_ENV === "production") {
 return "https://pay.bookcraft.dev";
 }
 if (process.env.VERCEL_URL) {
 return `https://${process.env.VERCEL_URL}`;
 }
 return process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4000";
};

// URL für die Haupt-App (bookcraft.dev)
export const getMainAppUrl = () => {
 if (process.env.VERCEL_ENV === "production") {
 return "https://bookcraft.dev";
 }
 // Preview: use VERCEL_BRANCH_URL (stable per branch) or VERCEL_URL
 if (process.env.VERCEL_BRANCH_URL) {
 return `https://${process.env.VERCEL_BRANCH_URL}`;
 }
 if (process.env.VERCEL_URL) {
 return `https://${process.env.VERCEL_URL}`;
 }
 return process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
};

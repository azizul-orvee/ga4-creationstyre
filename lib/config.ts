// Settings the dashboard reads straight from the environment. Kept in one place
// so the page and the GA4 client can't drift apart on defaults.

/** Heading shown to the client at the top of the dashboard. */
export const PROPERTY_LABEL = process.env.GA4_PROPERTY_LABEL ?? "Enquiries & ad spend";

/** The two GA4 key events that count as an enquiry. */
export const CALL_EVENT = process.env.GA4_CALL_EVENT ?? "call_click";
export const FORM_EVENT = process.env.GA4_FORM_EVENT ?? "form_click";

/** Invented numbers are only ever shown when this is explicitly switched on. */
export const SAMPLE_FALLBACK_ENABLED = process.env.GA4_SAMPLE_FALLBACK === "1";

// UTF-8 JSON budgets cover every field allowed by the document validators,
// including all six price categories and thirty portfolio photos + three covers.
// Uploads and small login/contact requests keep their existing separate limits.
export const publicationLimits = {
  prices: 768 * 1024,
  gallery: 128 * 1024,
  contacts: 32 * 1024,
} as const;

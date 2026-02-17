export type ContactInfo = {
  type: string;
  value: string;
};

export const CONTACT_TYPES = [
  "LinkedIn",
  "Email",
  "Mobile",
  "Website",
  "Twitter",
  "Whatsapp",
  "Facebook",
  "Instagram",
  "Address",
] as const;

function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function getContactLink(type: string, value: string): string | null {
  let url: string;
  switch (type) {
    case "LinkedIn":
      url = value.startsWith("http") ? value : `https://linkedin.com/in/${value}`;
      break;
    case "Email":
      url = `mailto:${value}`;
      break;
    case "Facebook":
      url = value.startsWith("http") ? value : `https://facebook.com/${value}`;
      break;
    case "Instagram":
      url = value.startsWith("http") ? value : `https://instagram.com/${value}`;
      break;
    case "Whatsapp":
      url = `https://wa.me/${value.replace(/\D/g, "")}`;
      break;
    case "Mobile":
      url = `tel:${value}`;
      break;
    case "Website":
      url = value.startsWith("http") ? value : `https://${value}`;
      break;
    case "Twitter":
      url = value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`;
      break;
    default:
      return null;
  }
  return sanitizeUrl(url);
}

export function getContactPlaceholderKey(type: string) {
  const keyMap = {
    LinkedIn: "contactPlaceholders.linkedin",
    Email: "contactPlaceholders.email",
    Mobile: "contactPlaceholders.mobile",
    Website: "contactPlaceholders.website",
    Twitter: "contactPlaceholders.twitter",
    Whatsapp: "contactPlaceholders.whatsapp",
    Facebook: "contactPlaceholders.facebook",
    Instagram: "contactPlaceholders.instagram",
    Address: "contactPlaceholders.address",
  } as const;
  return (keyMap[type as keyof typeof keyMap] ?? "contactPlaceholders.default") as any;
}

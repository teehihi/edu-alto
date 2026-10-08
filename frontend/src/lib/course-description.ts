import sanitizeHtml from "sanitize-html";

const richTextTagPattern =
  /<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|br|blockquote|pre|code|hr|span|img)\b[^>]*>/i;

const courseDescriptionSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "br",
    "blockquote",
    "pre",
    "code",
    "hr",
    "span",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    h1: ["style"],
    h2: ["style"],
    h3: ["style"],
    img: ["src", "alt", "title", "width", "height"],
    p: ["style"],
    span: ["style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    h1: { "text-align": [/^(left|right|center|justify)$/] },
    h2: { "text-align": [/^(left|right|center|justify)$/] },
    h3: { "text-align": [/^(left|right|center|justify)$/] },
    p: { "text-align": [/^(left|right|center|justify)$/] },
    span: {
      color: [/^#[\da-f]{3,8}$/i],
      "font-size": [/^\d{1,2}(px|pt|em|rem)$/],
    },
  },
  transformTags: {
    a: (_tagName, attributes) => ({
      tagName: "a",
      attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toEditorHtml(value: string): string {
  if (richTextTagPattern.test(value)) return value;

  return value
    .split(/\r?\n/)
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}

export function sanitizeCourseDescription(value: string): string {
  if (!value.trim()) return "";
  return sanitizeHtml(toEditorHtml(value), courseDescriptionSanitizeOptions);
}

export function courseDescriptionToText(value: string): string {
  const source = richTextTagPattern.test(value)
    ? value.replace(/<\/?(?:p|h[1-6]|ul|ol|li|br|blockquote|pre|hr)\b[^>]*>/gi, " ")
    : value.split(/\r?\n/).map(escapeHtml).join(" ");
  const text = sanitizeHtml(source, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_match, decimal: string) => decodeCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_match, hex: string) => decodeCodePoint(Number.parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeCodePoint(value: number): string {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : "\ufffd";
}

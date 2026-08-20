import React from "react";

function sanitizeHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export default function RichTextDisplay({ content, className = "", style = {} }) {
  if (!content) return null;

  // Check if content string has any HTML tags like <p>, <br>, <strong>, etc.
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtmlTags) {
    const cleanContent = sanitizeHtml(content);
    return (
      <div
        className={`rich-text-rendered ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />
    );
  }

  return (
    <div className={`rich-text-rendered ${className}`} style={{ whiteSpace: "pre-line", ...style }}>
      {content}
    </div>
  );
}

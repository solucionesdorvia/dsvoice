// Renderiza una fórmula química reemplazando los dígitos por <sub>.
// Acepta también guiones bajos (H_2O → H₂O) y paréntesis normales.

import { Fragment } from "react";

export function Formula({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;

  const parts: React.ReactNode[] = [];
  let buffer = "";
  let digitBuffer = "";

  const flushText = () => {
    if (buffer) {
      parts.push(buffer);
      buffer = "";
    }
  };
  const flushDigits = () => {
    if (digitBuffer) {
      parts.push(
        <sub key={parts.length} className="text-[0.7em] font-semibold">
          {digitBuffer}
        </sub>
      );
      digitBuffer = "";
    }
  };

  for (const ch of value) {
    if (/[0-9]/.test(ch)) {
      flushText();
      digitBuffer += ch;
    } else {
      flushDigits();
      buffer += ch;
    }
  }
  flushText();
  flushDigits();

  return (
    <span className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </span>
  );
}

import React from "react";
import QR from "qrcode";
export default function QRCode({
  value,
  size = 230,
}: {
  value: string;
  size?: number;
}) {
  const code = QR.create(value, { errorCorrectionLevel: "M" });
  const side = code.modules.size;
  let path = "";
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++)
      if (code.modules.get(y, x)) path += `M${x + 4},${y + 4}h1v1h-1z`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${side + 8} ${side + 8}`}
      role="img"
      aria-label="QR"
    >
      <rect width="100%" height="100%" fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}

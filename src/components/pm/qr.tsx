import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "./primitives";

/** Public verification URL for a credential. The QR encodes only this — nothing personal. */
export function verificationUrl(credentialId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/verify/${credentialId}`;
}

export function CredentialQr({ credentialId }: { credentialId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const url = typeof window === "undefined" ? null : verificationUrl(credentialId);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    void import("qrcode").then((QR) =>
      QR.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 512, color: { dark: "#070807", light: "#F5F5EF" } })
        .then((data) => alive && setSrc(data))
        .catch(() => alive && setSrc(null)),
    );
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-border bg-surface/60 p-5 text-center">
      {src ? (
        <img src={src} alt={`QR code linking to the public verification page for ${credentialId}`} className="h-48 w-48 rounded-sm sm:h-56 sm:w-56" />
      ) : (
        <div className="h-48 w-48 animate-pulse rounded-sm bg-panel" aria-hidden />
      )}
      <p className="break-all font-mono text-[0.7rem] text-subtle">{url}</p>
      {src ? (
        <a href={src} download={`${credentialId}-verification-qr.png`}>
          <Button size="sm">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download QR
          </Button>
        </a>
      ) : null}
    </div>
  );
}

/** Decode a QR image in the browser and extract a ProofMesh credential ID from its URL. */
export async function decodeQrImage(file: File): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  if (!code) return null;
  const match = /\/verify\/(PM-\d{6})\b/i.exec(code.data) ?? /^(PM-\d{6})$/i.exec(code.data.trim());
  return match ? match[1]!.toUpperCase() : null;
}

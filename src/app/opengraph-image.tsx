import { ImageResponse } from 'next/og';

/**
 * Imagen que se muestra al compartir la web en Facebook, Instagram o WhatsApp.
 * Sin emojis ni fuentes externas: se genera en el build sin red.
 */
export const alt = 'Simvix Home Services: limpieza del hogar con contrato en Parla y el sur de Madrid';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.9 }}>Simvix Home Services</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginTop: 24 }}>
          Limpieza del hogar con contrato y factura
        </div>
        <div style={{ fontSize: 36, marginTop: 32, opacity: 0.95 }}>
          Profesionales verificadas de tu zona - sustitucion garantizada
        </div>
        <div style={{ fontSize: 30, marginTop: 40, opacity: 0.85 }}>
          Parla - Pinto - Fuenlabrada - Getafe - Leganes - sur de Madrid
        </div>
      </div>
    ),
    size,
  );
}

import { NextRequest, NextResponse } from 'next/server';

// 1. Este archivo corre SOLO en el servidor (Backend).
// 2. El PIN ya no usa "NEXT_PUBLIC_", por lo que NUNCA se filtra al navegador.
const SERVER_PIN = process.env.PORTERIA_PIN || '1';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ success: false, error: 'PIN requerido' }, { status: 400 });
    }

    // Validar formato del PIN (solo dígitos, entre 3 y 8 caracteres)
    const pinStr = String(pin).trim();
    if (!/^\d{3,8}$/.test(pinStr)) {
      return NextResponse.json({ success: false, error: 'Formato de PIN inválido' }, { status: 400 });
    }

    // Comparamos el PIN enviado con el PIN seguro del servidor
    if (pinStr === SERVER_PIN) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // 🛡️ TRUCO DE DEFENSA: Hacemos que la respuesta tarde 1 segundo a propósito.
      // Esto hace que un ataque de fuerza bruta sea lentísimo (solo 1 intento por segundo).
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: false, error: 'PIN incorrecto' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

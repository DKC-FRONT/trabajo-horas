const LIMITE_INCLUIDO = 60;
const TARIFA_EXCESO = 1605;

export interface ResultadoLectura {
  consumo: number;
  consumo_cobrar: number;
  valor: number;
}

export function calcularLectura(
  lectura_anterior: number,
  lectura_actual: number
): ResultadoLectura {
  const consumo = Math.round((lectura_actual - lectura_anterior) * 100) / 100;
  const exceso = consumo - LIMITE_INCLUIDO;
  const consumo_cobrar = exceso > 0 ? Math.round(exceso * 100) / 100 : 0;
  const valor = consumo_cobrar * TARIFA_EXCESO;

  return { consumo, consumo_cobrar, valor };
}
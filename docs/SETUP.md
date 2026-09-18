# UTM Lab · Puesta en marcha

1. Cree un proyecto de Supabase, active Google como proveedor OAuth y configure la URL de retorno `https://SU-DOMINIO/auth/callback` (también `http://localhost:3000/auth/callback` en desarrollo).
2. Ejecute `supabase/migrations/202609180001_initial.sql` en el editor SQL de ese proyecto.
3. Copie `.env.example` como `.env.local` y complete las variables. `OPENAI_API_KEY` y `OPENAI_MODEL` se usan sólo en el servidor; no deben empezar con `NEXT_PUBLIC_`.
4. Instale dependencias con `npm install`, luego ejecute `npm run dev`.

## Protocolo serial v1

El firmware debe confirmar las órdenes con `ACK,id=<uuid>,status=OK`. La aplicación usa `HELLO`, `ARM_TEST`, `START_TEST` y `STOP_TEST`; el controlador decide si una orden es segura y puede rechazarla con `status=ERROR,reason=...`.

Cada muestra debe llegar en una única línea, con CRC-16/CCITT hexadecimal calculado sobre todo el contenido anterior a `,crc=`:

```text
SAMPLE,seq=42,t_ms=1200,force_raw=4567,displacement_raw=123,force_n=101.22,displacement_mm=0.42,crc=ABCD
```

Las muestras sin CRC válido se rechazan. Los saltos de secuencia se muestran y se guardan en el CSV como pérdida detectada. No se generan curvas de ejemplo.

## Límites de seguridad

- El navegador sólo solicita acciones; no es un controlador en tiempo real.
- El firmware debe detener el actuador ante paro de emergencia, finales de carrera, sobrecarga, error de sensor o pérdida de comunicación.
- Antes de aplicar carga real, valide el protocolo con banco de pruebas, la calibración de fuerza/desplazamiento y cada condición de parada.

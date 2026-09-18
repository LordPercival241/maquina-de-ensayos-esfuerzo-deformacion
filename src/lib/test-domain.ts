import { z } from "zod";

export const testSetupSchema = z.object({
  specimenId: z.string().trim().min(1, "Identifique la probeta").max(80),
  material: z.string().trim().min(1, "Indique el material").max(120),
  gaugeLengthMm: z.coerce.number().positive("La longitud inicial debe ser mayor a cero"),
  areaMm2: z.coerce.number().positive("El área inicial debe ser mayor a cero"),
  calibrationProfileId: z.string().trim().min(1, "Seleccione un perfil de calibración")
});

export type TestSetup = z.infer<typeof testSetupSchema>;

export type Sample = {
  sequence: number;
  deviceTimeMs: number;
  forceRaw: number;
  displacementRaw: number;
  forceN: number;
  displacementMm: number;
  stressMpa: number;
  strain: number;
};

export type TestStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "arming"
  | "running"
  | "stopped"
  | "fault";

export const calculateEngineeringValues = (
  forceN: number,
  displacementMm: number,
  setup: Pick<TestSetup, "areaMm2" | "gaugeLengthMm">
) => ({
  stressMpa: forceN / setup.areaMm2,
  strain: displacementMm / setup.gaugeLengthMm
});

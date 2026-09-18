"use client";

import type { TestSetup } from "@/lib/test-domain";
import { supabase } from "@/lib/supabase";

export async function saveCompletedTest(setup: TestSetup, csv: string, sampleCount: number) {
  if (!supabase) throw new Error("Falta configurar Supabase.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("La sesión ya no es válida.");
  const { data: run, error: createError } = await supabase.from("test_runs").insert({
    specimen_id: setup.specimenId,
    material: setup.material,
    gauge_length_mm: setup.gaugeLengthMm,
    initial_area_mm2: setup.areaMm2,
    calibration_profile_id: setup.calibrationProfileId,
    sample_count: sampleCount,
    status: "completed"
  }).select("id").single();
  if (createError || !run) throw new Error(createError?.message || "No se pudo crear el ensayo.");
  const path = `${userData.user.id}/${run.id}.csv`;
  const { error: uploadError } = await supabase.storage.from("test-data").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv", upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error: updateError } = await supabase.from("test_runs").update({ csv_path: path }).eq("id", run.id);
  if (updateError) throw new Error(updateError.message);
  return run.id;
}

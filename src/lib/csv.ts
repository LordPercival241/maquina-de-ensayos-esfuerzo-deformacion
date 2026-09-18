import type { Sample, TestSetup } from "@/lib/test-domain";

const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function makeTestCsv(setup: TestSetup, samples: Sample[], droppedSamples: number) {
  const metadata = [
    ["format", "utm-lab-csv-v1"],
    ["specimen_id", setup.specimenId],
    ["material", setup.material],
    ["gauge_length_mm", setup.gaugeLengthMm],
    ["initial_area_mm2", setup.areaMm2],
    ["calibration_profile_id", setup.calibrationProfileId],
    ["sample_count", samples.length],
    ["detected_dropped_samples", droppedSamples]
  ].map((row) => row.map(escape).join(","));
  const header = ["sequence", "device_time_ms", "force_raw", "displacement_raw", "force_n", "displacement_mm", "engineering_stress_mpa", "engineering_strain"].map(escape).join(",");
  const rows = samples.map((sample) => [sample.sequence, sample.deviceTimeMs, sample.forceRaw, sample.displacementRaw, sample.forceN, sample.displacementMm, sample.stressMpa, sample.strain].map(escape).join(","));
  return [...metadata, "", header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

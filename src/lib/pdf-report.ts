import { jsPDF } from "jspdf";
import type { Sample, TestSetup } from "@/lib/test-domain";

export async function captureChartAsPng(containerElement: HTMLElement): Promise<string | null> {
  const svg = containerElement.querySelector("svg");
  if (!svg) return null;

  try {
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const width = svg.clientWidth || 700;
    const height = svg.clientHeight || 350;
    clonedSvg.setAttribute("width", String(width));
    clonedSvg.setAttribute("height", String(height));

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.fillStyle = "#0c1c2a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export function generateTestPdf(
  setup: TestSetup,
  samples: Sample[],
  droppedSamples: number,
  operatorName: string,
  chartPngDataUrl: string | null
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Cálculos estadísticos
  let maxForce = 0;
  let maxStress = 0;
  let strainAtMaxStress = 0;
  let maxStrain = 0;

  for (const s of samples) {
    if (s.forceN > maxForce) maxForce = s.forceN;
    if (s.stressMpa > maxStress) {
      maxStress = s.stressMpa;
      strainAtMaxStress = s.strain;
    }
    if (s.strain > maxStrain) maxStrain = s.strain;
  }

  // ENCABEZADO
  doc.setFillColor(8, 18, 29);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(125, 211, 252); // Cyan
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("UTM LAB · REPORTE DE ENSAYO DE TRACCIÓN", margin, 12);

  doc.setTextColor(166, 189, 203);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Máquina Universal de Ensayos Low-Cost · Instrumentación Trazable", margin, 18);

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  doc.text(`Fecha: ${dateStr}`, pageWidth - margin, 18, { align: "right" });

  let y = 36;

  // SECCIÓN 1: DATOS GENERALES Y METADATOS
  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(14, 116, 144);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("1. INFORMACIÓN DE LA PROBETA Y CONFIGURACIÓN", margin + 3, y + 5);

  y += 11;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const col1X = margin + 3;
  const col2X = margin + (contentWidth / 2) + 3;

  doc.text(`ID de Probeta:`, col1X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${setup.specimenId}`, col1X + 35, y);
  doc.setFont("helvetica", "normal");

  doc.text(`Operador:`, col2X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${operatorName || "No especificado"}`, col2X + 35, y);
  doc.setFont("helvetica", "normal");

  y += 6;
  doc.text(`Material:`, col1X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${setup.material}`, col1X + 35, y);
  doc.setFont("helvetica", "normal");

  doc.text(`Perfil Calibración:`, col2X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${setup.calibrationProfileId}`, col2X + 35, y);
  doc.setFont("helvetica", "normal");

  y += 6;
  doc.text(`Longitud Inicial (L₀):`, col1X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${setup.gaugeLengthMm} mm`, col1X + 35, y);
  doc.setFont("helvetica", "normal");

  doc.text(`Muestras Adquiridas:`, col2X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${samples.length} puntos`, col2X + 35, y);
  doc.setFont("helvetica", "normal");

  y += 6;
  doc.text(`Área Inicial (A₀):`, col1X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${setup.areaMm2} mm²`, col1X + 35, y);
  doc.setFont("helvetica", "normal");

  doc.text(`Muestras Perdidas:`, col2X, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${droppedSamples}`, col2X + 35, y);
  doc.setFont("helvetica", "normal");

  y += 10;

  // SECCIÓN 2: RESULTADOS MECÁNICOS CLAVE
  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(14, 116, 144);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("2. PROPIEDADES MECÁNICAS CALCULADAS", margin + 3, y + 5);

  y += 11;
  const cardW = (contentWidth - 6) / 3;

  // Tarjeta 1: Fuerza Máxima
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardW, 18, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Fuerza Máxima (F_max)", margin + 3, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${maxForce.toFixed(2)} N`, margin + 3, y + 13);

  // Tarjeta 2: Esfuerzo Máximo (Resistencia)
  const card2X = margin + cardW + 3;
  doc.roundedRect(card2X, y, cardW, 18, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Esfuerzo Máximo (σ_max)", card2X + 3, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 116, 144);
  doc.text(`${maxStress.toFixed(3)} MPa`, card2X + 3, y + 13);

  // Tarjeta 3: Deformación en Rotura / Máxima
  const card3X = card2X + cardW + 3;
  doc.roundedRect(card3X, y, cardW, 18, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Deformación Máxima (ε_max)", card3X + 3, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${(maxStrain * 100).toFixed(2)} %`, card3X + 3, y + 13);

  y += 24;

  // SECCIÓN 3: CURVA ESFUERZO - DEFORMACIÓN
  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(14, 116, 144);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("3. CURVA ESFUERZO–DEFORMACIÓN EXPERIMENTAL", margin + 3, y + 5);

  y += 10;

  if (chartPngDataUrl) {
    const chartHeight = 85;
    doc.addImage(chartPngDataUrl, "PNG", margin, y, contentWidth, chartHeight);
    y += chartHeight + 4;
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 40, "S");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No se pudo incrustar la imagen del gráfico.", margin + 10, y + 20);
    y += 46;
  }

  // SECCIÓN 4: TABLA DE PUNTOS REPRESENTATIVOS
  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(14, 116, 144);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("4. MUESTREO REPRESENTATIVO DEL ENSAYO", margin + 3, y + 5);

  y += 10;
  // Encabezados de tabla
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  const tCols = [
    { label: "Punto", x: margin + 3 },
    { label: "Tiempo (ms)", x: margin + 25 },
    { label: "Fuerza (N)", x: margin + 60 },
    { label: "Desplaz. (mm)", x: margin + 95 },
    { label: "Esfuerzo (MPa)", x: margin + 130 },
    { label: "Deformación (%)", x: margin + 155 }
  ];

  tCols.forEach((col) => doc.text(col.label, col.x, y));
  y += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  // Seleccionar hasta 8 puntos distribuidos a lo largo del ensayo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  const step = Math.max(1, Math.floor(samples.length / 8));
  const sampleSubset = samples.filter((_, idx) => idx % step === 0 || idx === samples.length - 1).slice(0, 8);

  for (const s of sampleSubset) {
    doc.text(String(s.sequence), tCols[0].x, y);
    doc.text(String(s.deviceTimeMs), tCols[1].x, y);
    doc.text(s.forceN.toFixed(2), tCols[2].x, y);
    doc.text(s.displacementMm.toFixed(3), tCols[3].x, y);
    doc.text(s.stressMpa.toFixed(3), tCols[4].x, y);
    doc.text((s.strain * 100).toFixed(2) + " %", tCols[5].x, y);
    y += 4.5;
  }

  // PIE DE PÁGINA
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 280, margin + contentWidth, 280);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Reporte generado localmente en el navegador. Los datos no se transmitieron a la nube para preservar cuota.",
    margin,
    285
  );
  doc.text("Página 1 de 1", pageWidth - margin, 285, { align: "right" });

  // Guardar archivo
  const safeId = setup.specimenId.replace(/[^a-zA-Z0-9_-]/g, "_") || "sin_id";
  doc.save(`reporte-ensayo-${safeId}.pdf`);
}

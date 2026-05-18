import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgressionData } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";

export function exportSessionPDF(session: {
  name: string;
  date: string;
  participants: { name: string; lastDist?: string | null }[];
}) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`ChronoTrack — ${session.name}`, 14, 20);

  // Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Date : ${session.date}`, 14, 30);
  doc.setTextColor(0);

  // Table
  autoTable(doc, {
    startY: 38,
    head: [["Athlète", "Distance"]],
    body: session.participants.map((p) => [p.name, p.lastDist ? `${p.lastDist}m` : "—"]),
    styles: { fontSize: 11 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`chronotrack-${session.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportProgressionPDF(data: ProgressionData[], dist: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Progression — ${dist}m`, 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Exporté le ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
  doc.setTextColor(0);

  // Collect all unique period labels
  const allLabels = Array.from(
    new Set(data.flatMap((d) => d.periods.map((p) => p.label)))
  ).sort();

  const head = [["Athlète", ...allLabels]];
  const body = data.map((athlete) => {
    const row: string[] = [athlete.name];
    for (const label of allLabels) {
      const period = athlete.periods.find((p) => p.label === label);
      row.push(period ? formatTime(period.avgMs) : "—");
    }
    return row;
  });

  autoTable(doc, {
    startY: 38,
    head,
    body,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`chronotrack-progression-${dist}m.pdf`);
}

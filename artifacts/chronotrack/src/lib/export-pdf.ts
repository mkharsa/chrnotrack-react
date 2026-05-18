import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgressionData, SeriesEntry } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";

const PRIMARY = [59, 130, 246] as [number, number, number];
const HEADER_BG = [240, 245, 255] as [number, number, number];

function pageHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Background strip
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 18, "F");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ChronoTrack", 14, 12);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 55, 12);

  doc.setTextColor(0, 0, 0);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 26);
    doc.setTextColor(0);
  }

  return subtitle ? 34 : 26;
}

// ─── Session PDF ──────────────────────────────────────────────────────────────

export type SeriesForPDF = {
  id: string;
  dist: string;
  entries: SeriesEntry[];
};

export function exportSessionPDF(session: {
  name: string;
  date: string;
  participants: { name: string; lastDist?: string | null }[];
  series?: SeriesForPDF[];
}) {
  const doc = new jsPDF();
  const dateFormatted = new Date(session.date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  let y = pageHeader(doc, session.name, `${dateFormatted} · ${session.participants.length} athlète(s)`);

  // ── Participants ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("Participants", 14, y + 4);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y + 8,
    head: [["#", "Athlète", "Distance par défaut"]],
    body: session.participants.map((p, i) => [
      String(i + 1),
      p.name,
      p.lastDist ? `${p.lastDist} m` : "—",
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: PRIMARY },
    alternateRowStyles: { fillColor: HEADER_BG },
  });

  // ── Séries de temps ──
  const series = session.series ?? [];
  if (series.length > 0) {
    for (const serie of series) {
      const includedEntries = serie.entries.filter(e => e.include);
      const allEntries = serie.entries;

      if (allEntries.length === 0) continue;

      // Sort by time asc
      const sorted = [...allEntries].sort((a, b) => a.timeMs - b.timeMs);
      const bestMs = sorted[0]?.timeMs;
      const avgMs = Math.round(
        includedEntries.reduce((s, e) => s + e.timeMs, 0) / (includedEntries.length || 1)
      );

      const curY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PRIMARY);
      doc.text(`Série — ${serie.dist} m`, 14, curY);
      doc.setTextColor(0);

      // Stats summary
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(
        `Meilleur : ${formatTime(bestMs)}   ·   Moyenne : ${formatTime(avgMs)}   ·   ${includedEntries.length} temps inclus`,
        14, curY + 5
      );
      doc.setTextColor(0);

      autoTable(doc, {
        startY: curY + 9,
        head: [["Rang", "Athlète", "Temps", "Inclus"]],
        body: sorted.map((e, i) => [
          String(i + 1),
          e.name,
          formatTime(e.timeMs),
          e.include ? "✓" : "—",
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: PRIMARY },
        alternateRowStyles: { fillColor: HEADER_BG },
        columnStyles: {
          0: { cellWidth: 14 },
          2: { fontStyle: "bold" },
          3: { halign: "center" },
        },
        didParseCell(data) {
          // Highlight best time in green
          if (data.column.index === 2 && data.row.index === 0 && data.section === "body") {
            data.cell.styles.textColor = [22, 163, 74];
          }
        },
      });
    }
  } else {
    // No series yet
    const curY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Aucune série de temps enregistrée pour cette session.", 14, curY);
    doc.setTextColor(0);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `ChronoTrack · Exporté le ${new Date().toLocaleDateString("fr-FR")} · Page ${i}/${pageCount}`,
      14, 290
    );
  }

  doc.save(`chronotrack-${session.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ─── Progression PDF ──────────────────────────────────────────────────────────

export function exportProgressionPDF(data: ProgressionData[], dist: string) {
  const doc = new jsPDF({ orientation: data.length > 5 ? "landscape" : "portrait" });

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  let y = pageHeader(doc, `Progression — ${dist} m`, `Exporté le ${dateStr} · ${data.length} athlète(s)`);

  // ── Résumé par athlète ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("Résumé des performances", 14, y + 4);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y + 8,
    head: [["Athlète", "Meilleur temps", "Temps moyen", "Séries", "Tendance"]],
    body: data.map(athlete => {
      const times = athlete.periods.flatMap(p => Array(p.count).fill(p.avgMs));
      const best = Math.min(...athlete.periods.map(p => p.avgMs));
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / (times.length || 1));
      const lastTrend = athlete.periods[athlete.periods.length - 1]?.trend;
      const trendLabel = lastTrend === "better" ? "↑ En progrès"
        : lastTrend === "worse" ? "↓ En régression"
        : "→ Stable";
      return [
        athlete.name,
        formatTime(best),
        formatTime(avg),
        String(athlete.periods.reduce((s, p) => s + p.count, 0)),
        trendLabel,
      ];
    }),
    styles: { fontSize: 10 },
    headStyles: { fillColor: PRIMARY },
    alternateRowStyles: { fillColor: HEADER_BG },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === "body") {
        const v = String(data.cell.raw);
        if (v.startsWith("↑")) data.cell.styles.textColor = [22, 163, 74];
        else if (v.startsWith("↓")) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  // ── Détail par période ──
  const allLabels = Array.from(
    new Set(data.flatMap(d => d.periods.map(p => p.label)))
  ).sort();

  if (allLabels.length > 0) {
    const curY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY);
    doc.text("Détail par période", 14, curY);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: curY + 6,
      head: [["Athlète", ...allLabels.map(l => `${l}\n(moy · séries)`)]],
      body: data.map(athlete => {
        const row: string[] = [athlete.name];
        for (const label of allLabels) {
          const period = athlete.periods.find(p => p.label === label);
          row.push(period ? `${formatTime(period.avgMs)}\n(${period.count})` : "—");
        }
        return row;
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY },
      alternateRowStyles: { fillColor: HEADER_BG },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `ChronoTrack · Exporté le ${new Date().toLocaleDateString("fr-FR")} · Page ${i}/${pageCount}`,
      14, doc.internal.pageSize.getHeight() - 8
    );
    doc.text(`${dist} m`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  doc.save(`chronotrack-progression-${dist}m.pdf`);
}

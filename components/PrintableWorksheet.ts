import jsPDF from 'jspdf';
import { registerPdfFonts } from '../../../components/pdf/pdfFonts';
import { toPdfText, formatPdfDate } from '../../../components/pdf/pdfUtils';
import { formatCurrency, formatPatientName } from '../../../utils';
import type { LabWorkOrder, LabWorkOrderItem } from '../types';

interface WorksheetData {
  order: LabWorkOrder;
  patient: {
    lastName: string;
    firstName: string;
    title?: string;
    birthDate?: string;
    phone?: string;
  };
  clinic: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    showLogoOnQuote?: boolean;
  };
  doctorName?: string;
  pdfFont?: string;
}

export async function generateWorksheetPdf(data: WorksheetData): Promise<void> {
  const { order, patient, clinic, doctorName, pdfFont } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const font = await registerPdfFonts(doc, (pdfFont || 'Roboto') as Parameters<typeof registerPdfFonts>[1]);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const rightCol = pageWidth - margin;
  let y = margin;

  // ─── Helper functions ─────────────────────────────────────────────

  const line = () => {
    doc.setDrawColor(180);
    doc.line(margin, y, rightCol, y);
    y += 2;
  };

  const bold = (size = 10) => { doc.setFont(font, 'bold'); doc.setFontSize(size); };
  const normal = (size = 9) => { doc.setFont(font, 'normal'); doc.setFontSize(size); };

  const labelValue = (label: string, value: string, x: number, yy: number, labelWidth = 28) => {
    bold(9);
    doc.text(toPdfText(label), x, yy);
    normal(9);
    doc.text(toPdfText(value), x + labelWidth, yy);
  };

  const checkbox = (checked: boolean, label: string, x: number, yy: number) => {
    doc.setDrawColor(100);
    doc.setLineWidth(0.3);
    doc.rect(x, yy - 3, 3.5, 3.5);
    if (checked) {
      doc.setLineWidth(0.6);
      doc.line(x + 0.5, yy - 1, x + 1.5, yy + 0.2);
      doc.line(x + 1.5, yy + 0.2, x + 3, yy - 2.5);
      doc.setLineWidth(0.3);
    }
    normal(8);
    doc.text(toPdfText(label), x + 5, yy);
  };

  // ─── Logo + Title ─────────────────────────────────────────────────

  let logoEndX = margin;
  if (clinic.logo && clinic.logo.startsWith('data:image/') && !clinic.logo.startsWith('data:image/svg') && clinic.showLogoOnQuote) {
    try {
      const fmt = clinic.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.getImageProperties(clinic.logo);
      doc.addImage(clinic.logo, fmt, margin, y - 3, 22, 10);
      logoEndX = margin + 25;
    } catch { /* skip */ }
  }

  // Title
  bold(16);
  doc.text(toPdfText('FOGTECHNIKAI MUNKALAP'), rightCol, y + 2, { align: 'right' });

  bold(10);
  doc.text(toPdfText(order.workOrderNumber), rightCol, y + 8, { align: 'right' });

  if (order.priority === 'urgent') {
    doc.setTextColor(220, 38, 38);
    bold(10);
    doc.text(toPdfText('SÜRGŐS'), rightCol, y + 13, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Clinic info
  bold(11);
  doc.text(toPdfText(clinic.name), logoEndX, y);
  y += 4.5;
  normal(8);
  doc.text(toPdfText(clinic.address), logoEndX, y);
  y += 3.5;
  doc.text(toPdfText(`Tel: ${clinic.phone}`), logoEndX, y);
  y += 3.5;
  doc.text(toPdfText(clinic.email), logoEndX, y);
  y += 6;

  line();
  y += 2;

  // ─── Clinic + Lab side by side ────────────────────────────────────

  const midX = margin + contentWidth / 2 + 5;

  bold(9);
  doc.text(toPdfText('RENDELŐ / ORVOS'), margin, y);
  doc.text(toPdfText('LABOR'), midX, y);
  y += 5;

  normal(9);
  if (doctorName) {
    doc.text(toPdfText(doctorName), margin, y);
  }
  if (order.labPartner) {
    doc.text(toPdfText(order.labPartner.labName), midX, y);
    if (order.labPartner.address) {
      y += 4;
      doc.text(toPdfText(order.labPartner.address), midX, y);
    }
    if (order.labPartner.phone) {
      y += 4;
      doc.text(toPdfText(`Tel: ${order.labPartner.phone}`), midX, y);
    }
  }
  y += 7;

  line();
  y += 2;

  // ─── Patient info ─────────────────────────────────────────────────

  bold(9);
  doc.text(toPdfText('PÁCIENS'), margin, y);
  y += 5;

  const patientName = formatPatientName(patient.lastName, patient.firstName, patient.title);
  labelValue('Név:', patientName, margin, y, 15);

  if (patient.birthDate) {
    labelValue('Szül. dátum:', formatPdfDate(patient.birthDate), midX, y, 25);
  }
  y += 7;

  line();
  y += 2;

  // ─── Technical details ────────────────────────────────────────────

  bold(9);
  doc.text(toPdfText('TECHNIKAI ADATOK'), margin, y);
  y += 6;

  // Row 1: shade + teeth + material
  if (order.shade) {
    labelValue('Fogszín:', order.shade, margin, y, 18);
  }
  if (order.toothNotation) {
    labelValue('Fogak:', order.toothNotation, margin + 50, y, 15);
  }
  if (order.material) {
    labelValue('Anyag:', order.material, midX, y, 15);
  }
  y += 7;

  // Attachments checkboxes
  checkbox(order.upperImpression, 'Felső lenyomat', margin, y);
  checkbox(order.lowerImpression, 'Alsó lenyomat', margin + 40, y);
  checkbox(order.bite, 'Harapás', margin + 80, y);
  y += 6;
  checkbox(order.facebow, 'Arcív', margin, y);
  checkbox(order.photos, 'Fotók', margin + 40, y);
  y += 7;

  line();
  y += 2;

  // ─── Items table ──────────────────────────────────────────────────

  bold(9);
  doc.text(toPdfText('MEGRENDELT MUNKÁK'), margin, y);
  y += 6;

  // Table header
  const cols = {
    nr: margin,
    tooth: margin + 8,
    desc: margin + 22,
    qty: margin + contentWidth - 55,
    unit: margin + contentWidth - 38,
    total: margin + contentWidth - 5,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, contentWidth, 6, 'F');

  bold(8);
  doc.text('#', cols.nr, y);
  doc.text('Fog', cols.tooth, y);
  doc.text('Megnevezés', cols.desc, y);
  doc.text('Db', cols.qty, y);
  doc.text('Egységár', cols.unit, y);
  doc.text('Összesen', cols.total, y, { align: 'right' });
  y += 5;

  const items: LabWorkOrderItem[] = order.items || [];

  normal(8);
  items.forEach((item, i) => {
    const lineTotal = (item.unitPrice ?? 0) * item.quantity;

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }

    doc.text(String(i + 1), cols.nr, y);
    doc.text(toPdfText(item.tooth || '—'), cols.tooth, y);

    // Wrap description if too long
    const descLines = doc.splitTextToSize(toPdfText(item.description), cols.qty - cols.desc - 3);
    doc.text(descLines, cols.desc, y);

    doc.text(String(item.quantity), cols.qty, y);
    doc.text(
      item.unitPrice != null ? formatCurrency(item.unitPrice, order.currency as 'HUF' | 'EUR') : '—',
      cols.unit,
      y,
    );
    doc.text(
      lineTotal > 0 ? formatCurrency(lineTotal, order.currency as 'HUF' | 'EUR') : '—',
      cols.total,
      y,
      { align: 'right' },
    );

    y += Math.max(descLines.length * 4, 5);
  });

  // Total row
  y += 2;
  doc.setDrawColor(180);
  doc.line(cols.qty - 5, y, rightCol, y);
  y += 5;
  bold(10);
  doc.text(toPdfText('ÖSSZESEN:'), cols.unit - 18, y);
  doc.text(
    toPdfText(formatCurrency(order.totalPrice ?? 0, order.currency as 'HUF' | 'EUR')),
    cols.total,
    y,
    { align: 'right' },
  );
  y += 8;

  // ─── Notes ────────────────────────────────────────────────────────

  if (order.notes) {
    line();
    y += 2;
    bold(9);
    doc.text(toPdfText('MEGJEGYZÉSEK'), margin, y);
    y += 5;
    normal(8);
    const noteLines = doc.splitTextToSize(toPdfText(order.notes), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 3;
  }

  // ─── Deadline ─────────────────────────────────────────────────────

  if (order.requestedDeadline) {
    y += 3;
    bold(9);
    doc.text(toPdfText('Kért határidő:'), margin, y);
    normal(9);
    doc.text(toPdfText(formatPdfDate(order.requestedDeadline)), margin + 30, y);
    y += 5;
  }

  if (order.promisedDeadline) {
    bold(9);
    doc.text(toPdfText('Labor által ígért határidő:'), margin, y);
    normal(9);
    doc.text(toPdfText(formatPdfDate(order.promisedDeadline)), margin + 50, y);
    y += 5;
  }

  // ─── Signatures ───────────────────────────────────────────────────

  // Ensure enough space for signatures
  const sigY = Math.max(y + 15, doc.internal.pageSize.getHeight() - 40);
  if (sigY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = margin + 20;
  } else {
    y = sigY;
  }

  normal(9);
  const today = formatPdfDate(new Date().toISOString());
  doc.text(toPdfText(`Dátum: ${today}`), margin, y);
  y += 12;

  // Signature lines
  const sigLineWidth = 55;
  const sigLeftX = margin + 10;
  const sigRightX = rightCol - sigLineWidth - 10;

  doc.setDrawColor(120);
  doc.line(sigLeftX, y, sigLeftX + sigLineWidth, y);
  doc.line(sigRightX, y, sigRightX + sigLineWidth, y);
  y += 4;

  normal(8);
  doc.text(toPdfText('Orvos aláírása'), sigLeftX + sigLineWidth / 2, y, { align: 'center' });
  doc.text(toPdfText('Labor aláírása'), sigRightX + sigLineWidth / 2, y, { align: 'center' });

  // ─── Save ─────────────────────────────────────────────────────────

  doc.save(`Munkalap_${order.workOrderNumber}.pdf`);
}

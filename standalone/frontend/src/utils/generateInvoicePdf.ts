import type { TranslationKeys } from '../i18n/hu';
import {
  pdfText, formatPdfDate, formatPdfCurrency,
  createPdfCtx, drawLine, bold, normal, labelValue, ensureSpace,
} from './pdf';

interface InvoicePdfData {
  invoice: any;
  labName?: string;
  labAddress?: string;
  labTaxNumber?: string;
  t: TranslationKeys;
}

export function generateInvoicePdf({ invoice, labName, labAddress, labTaxNumber, t }: InvoicePdfData) {
  const ctx = createPdfCtx();
  const { doc, margin } = ctx;
  const midX = margin + ctx.contentWidth / 2 + 5;

  // ─── Title ──────────────────────────────────────────────────────────

  bold(ctx, 16);
  doc.text(pdfText(t.invoices.title.toUpperCase()), ctx.rightCol, ctx.y + 2, { align: 'right' });

  bold(ctx, 11);
  doc.text(pdfText(labName || 'DQ Dental Techniq'), margin, ctx.y);
  ctx.y += 5;

  if (labAddress) {
    normal(ctx, 8);
    doc.text(pdfText(labAddress), margin, ctx.y);
    ctx.y += 3.5;
  }
  if (labTaxNumber) {
    normal(ctx, 8);
    doc.text(pdfText(`${t.doctors.taxNumber}: ${labTaxNumber}`), margin, ctx.y);
    ctx.y += 3.5;
  }

  // Invoice number + status
  bold(ctx, 10);
  doc.text(pdfText(invoice.invoiceNumber), ctx.rightCol, ctx.y - 2, { align: 'right' });

  ctx.y += 4;
  drawLine(ctx);
  ctx.y += 2;

  // ─── Invoice details ───────────────────────────────────────────────

  // Left: partner info, Right: dates
  bold(ctx, 9);
  doc.text(pdfText(t.invoices.doctorPartner.toUpperCase()), margin, ctx.y);
  ctx.y += 5;

  normal(ctx, 9);
  if (invoice.doctorPartner) {
    doc.text(pdfText(invoice.doctorPartner.doctorName), margin, ctx.y);
    if (invoice.doctorPartner.clinicName) {
      ctx.y += 4;
      doc.text(pdfText(invoice.doctorPartner.clinicName), margin, ctx.y);
    }
    if (invoice.doctorPartner.address) {
      ctx.y += 4;
      doc.text(pdfText(invoice.doctorPartner.address), margin, ctx.y);
    }
    if (invoice.doctorPartner.taxNumber) {
      ctx.y += 4;
      doc.text(pdfText(`${t.doctors.taxNumber}: ${invoice.doctorPartner.taxNumber}`), margin, ctx.y);
    }
  }

  // Dates on the right side
  const dateY = ctx.y - (invoice.doctorPartner?.clinicName ? 12 : 4);
  bold(ctx, 9);
  doc.text(pdfText(`${t.invoices.issueDate}:`), midX, dateY);
  normal(ctx, 9);
  doc.text(formatPdfDate(invoice.issueDate), midX + 35, dateY);

  if (invoice.dueDate) {
    bold(ctx, 9);
    doc.text(pdfText(`${t.invoices.dueDate}:`), midX, dateY + 5);
    normal(ctx, 9);
    doc.text(formatPdfDate(invoice.dueDate), midX + 35, dateY + 5);
  }

  if (invoice.paidAt) {
    bold(ctx, 9);
    doc.text(pdfText(`${t.invoices.paidAt}:`), midX, dateY + 10);
    normal(ctx, 9);
    doc.text(formatPdfDate(invoice.paidAt), midX + 35, dateY + 10);
  }

  ctx.y += 7;
  drawLine(ctx);
  ctx.y += 2;

  // ─── Items table ────────────────────────────────────────────────────

  bold(ctx, 9);
  doc.text(pdfText(t.invoices.items.toUpperCase()), margin, ctx.y);
  ctx.y += 6;

  const cols = {
    nr: margin,
    desc: margin + 8,
    qty: margin + ctx.contentWidth - 55,
    unit: margin + ctx.contentWidth - 35,
    total: margin + ctx.contentWidth - 5,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, ctx.y - 4, ctx.contentWidth, 6, 'F');

  bold(ctx, 8);
  doc.text('#', cols.nr, ctx.y);
  doc.text(pdfText(t.invoices.description), cols.desc, ctx.y);
  doc.text(pdfText(t.invoices.quantity), cols.qty, ctx.y);
  doc.text(pdfText(t.invoices.unitPrice), cols.unit, ctx.y);
  doc.text(pdfText(t.invoices.lineTotal), cols.total, ctx.y, { align: 'right' });
  ctx.y += 5;

  const items: any[] = invoice.items || [];
  normal(ctx, 8);

  items.forEach((item: any, i: number) => {
    ensureSpace(ctx, 8);

    doc.text(String(i + 1), cols.nr, ctx.y);

    const descLines = doc.splitTextToSize(pdfText(item.description), cols.qty - cols.desc - 3);
    doc.text(descLines, cols.desc, ctx.y);

    doc.text(String(item.quantity), cols.qty, ctx.y);
    doc.text(formatPdfCurrency(item.unitPrice, invoice.currency), cols.unit, ctx.y);
    doc.text(formatPdfCurrency(item.totalPrice, invoice.currency), cols.total, ctx.y, { align: 'right' });

    ctx.y += Math.max(descLines.length * 4, 5);
  });

  // ─── Total ──────────────────────────────────────────────────────────

  ctx.y += 2;
  doc.setDrawColor(180);
  doc.line(cols.qty - 5, ctx.y, ctx.rightCol, ctx.y);
  ctx.y += 5;

  bold(ctx, 11);
  doc.text(pdfText(`${t.invoices.totalAmount}:`), cols.unit - 22, ctx.y);
  doc.text(pdfText(formatPdfCurrency(invoice.totalAmount, invoice.currency)), cols.total, ctx.y, { align: 'right' });
  ctx.y += 8;

  // ─── Notes ──────────────────────────────────────────────────────────

  if (invoice.notes) {
    ensureSpace(ctx, 20);
    drawLine(ctx);
    ctx.y += 2;
    bold(ctx, 9);
    doc.text(pdfText(t.invoices.notes.toUpperCase()), margin, ctx.y);
    ctx.y += 5;
    normal(ctx, 8);
    const noteLines = doc.splitTextToSize(pdfText(invoice.notes), ctx.contentWidth);
    doc.text(noteLines, margin, ctx.y);
    ctx.y += noteLines.length * 4 + 3;
  }

  // ─── Signatures ─────────────────────────────────────────────────────

  const sigY = Math.max(ctx.y + 15, doc.internal.pageSize.getHeight() - 40);
  if (sigY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    ctx.y = margin + 20;
  } else {
    ctx.y = sigY;
  }

  const sigLineWidth = 55;
  const sigLeftX = margin + 10;
  const sigRightX = ctx.rightCol - sigLineWidth - 10;

  doc.setDrawColor(120);
  doc.line(sigLeftX, ctx.y, sigLeftX + sigLineWidth, ctx.y);
  doc.line(sigRightX, ctx.y, sigRightX + sigLineWidth, ctx.y);
  ctx.y += 4;

  normal(ctx, 8);
  doc.text(pdfText(labName || 'Labor'), sigLeftX + sigLineWidth / 2, ctx.y, { align: 'center' });
  doc.text(pdfText(invoice.doctorPartner?.doctorName || ''), sigRightX + sigLineWidth / 2, ctx.y, { align: 'center' });

  // ─── Save ───────────────────────────────────────────────────────────

  doc.save(`Szamla_${invoice.invoiceNumber}.pdf`);
}

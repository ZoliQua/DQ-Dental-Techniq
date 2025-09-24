import type { TranslationKeys } from '../i18n/hu';
import {
  pdfText, formatPdfDate, formatPdfCurrency,
  createPdfCtx, drawLine, bold, normal, labelValue, checkbox, ensureSpace,
} from './pdf';

interface WorkOrderPdfData {
  order: any;
  labName?: string;
  t: TranslationKeys;
}

export function generateWorkOrderPdf({ order, labName, t }: WorkOrderPdfData) {
  const ctx = createPdfCtx();
  const { doc, margin } = ctx;
  const midX = margin + ctx.contentWidth / 2 + 5;

  // ─── Title ──────────────────────────────────────────────────────────

  bold(ctx, 16);
  doc.text(pdfText('FOGTECHNIKAI MUNKALAP'), ctx.rightCol, ctx.y + 2, { align: 'right' });

  bold(ctx, 11);
  doc.text(pdfText(labName || 'DQ Dental Techniq'), margin, ctx.y);
  ctx.y += 6;

  bold(ctx, 10);
  doc.text(pdfText(order.workOrderNumber), ctx.rightCol, ctx.y, { align: 'right' });

  if (order.priority === 'urgent') {
    doc.setTextColor(220, 38, 38);
    bold(ctx, 10);
    doc.text(pdfText(t.workOrders.urgent.toUpperCase()), ctx.rightCol, ctx.y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  ctx.y += 8;
  drawLine(ctx);
  ctx.y += 2;

  // ─── Doctor + Lab info ──────────────────────────────────────────────

  bold(ctx, 9);
  doc.text(pdfText(t.workOrders.doctor.toUpperCase()), margin, ctx.y);
  doc.text(pdfText('LABOR'), midX, ctx.y);
  ctx.y += 5;

  normal(ctx, 9);
  if (order.doctorPartner) {
    doc.text(pdfText(order.doctorPartner.doctorName), margin, ctx.y);
    if (order.doctorPartner.clinicName) {
      ctx.y += 4;
      doc.text(pdfText(order.doctorPartner.clinicName), margin, ctx.y);
    }
    if (order.doctorPartner.phone) {
      ctx.y += 4;
      doc.text(pdfText(`Tel: ${order.doctorPartner.phone}`), margin, ctx.y);
    }
  }

  // Lab side
  const labY = ctx.y - (order.doctorPartner?.clinicName ? 8 : 4);
  doc.text(pdfText(labName || 'DQ Dental Techniq'), midX, labY);

  ctx.y += 7;
  drawLine(ctx);
  ctx.y += 2;

  // ─── Patient ────────────────────────────────────────────────────────

  bold(ctx, 9);
  doc.text(pdfText(t.workOrders.patient.toUpperCase()), margin, ctx.y);
  ctx.y += 5;

  if (order.patient) {
    labelValue(ctx, `${t.patients.lastName}:`, `${order.patient.lastName} ${order.patient.firstName}`, margin, 25);
    if (order.patient.birthDate) {
      normal(ctx, 9);
      doc.text(pdfText(`${t.patients.birthDate}: ${order.patient.birthDate}`), midX, ctx.y);
    }
  }
  ctx.y += 7;
  drawLine(ctx);
  ctx.y += 2;

  // ─── Technical details ──────────────────────────────────────────────

  bold(ctx, 9);
  doc.text(pdfText(t.workOrders.toothNotation.toUpperCase()), margin, ctx.y);
  ctx.y += 6;

  if (order.shade) labelValue(ctx, `${t.workOrders.shade}:`, order.shade, margin, 18);
  if (order.toothNotation) labelValue(ctx, `${t.workOrders.toothNotation}:`, order.toothNotation, margin + 50, 15);
  if (order.material) labelValue(ctx, `${t.workOrders.material}:`, order.material, midX, 15);
  ctx.y += 7;

  checkbox(ctx, order.upperImpression, t.workOrders.upperImpression, margin);
  checkbox(ctx, order.lowerImpression, t.workOrders.lowerImpression, margin + 40);
  checkbox(ctx, order.bite, t.workOrders.bite, margin + 80);
  ctx.y += 6;
  checkbox(ctx, order.facebow, t.workOrders.facebow, margin);
  checkbox(ctx, order.photos, t.workOrders.photos, margin + 40);
  ctx.y += 7;

  drawLine(ctx);
  ctx.y += 2;

  // ─── Items table ────────────────────────────────────────────────────

  bold(ctx, 9);
  doc.text(pdfText(t.workOrders.items.toUpperCase()), margin, ctx.y);
  ctx.y += 6;

  const cols = {
    nr: margin,
    tooth: margin + 8,
    desc: margin + 22,
    qty: margin + ctx.contentWidth - 55,
    unit: margin + ctx.contentWidth - 38,
    total: margin + ctx.contentWidth - 5,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, ctx.y - 4, ctx.contentWidth, 6, 'F');

  bold(ctx, 8);
  doc.text('#', cols.nr, ctx.y);
  doc.text(pdfText(t.workOrders.tooth), cols.tooth, ctx.y);
  doc.text(pdfText(t.workOrders.description), cols.desc, ctx.y);
  doc.text(pdfText(t.workOrders.quantity), cols.qty, ctx.y);
  doc.text(pdfText(t.workOrders.unitPrice), cols.unit, ctx.y);
  doc.text(pdfText(t.workOrders.lineTotal), cols.total, ctx.y, { align: 'right' });
  ctx.y += 5;

  const items: any[] = order.items || [];
  normal(ctx, 8);

  items.forEach((item: any, i: number) => {
    ensureSpace(ctx, 8);

    const lineTotal = (item.unitPrice ?? 0) * item.quantity;
    doc.text(String(i + 1), cols.nr, ctx.y);
    doc.text(pdfText(item.tooth || '—'), cols.tooth, ctx.y);

    const descLines = doc.splitTextToSize(pdfText(item.description), cols.qty - cols.desc - 3);
    doc.text(descLines, cols.desc, ctx.y);

    doc.text(String(item.quantity), cols.qty, ctx.y);
    doc.text(item.unitPrice != null ? formatPdfCurrency(item.unitPrice, order.currency) : '—', cols.unit, ctx.y);
    doc.text(lineTotal > 0 ? formatPdfCurrency(lineTotal, order.currency) : '—', cols.total, ctx.y, { align: 'right' });

    ctx.y += Math.max(descLines.length * 4, 5);
  });

  // Total
  ctx.y += 2;
  doc.setDrawColor(180);
  doc.line(cols.qty - 5, ctx.y, ctx.rightCol, ctx.y);
  ctx.y += 5;
  bold(ctx, 10);
  doc.text(pdfText(`${t.workOrders.total}:`), cols.unit - 18, ctx.y);
  doc.text(pdfText(formatPdfCurrency(order.totalPrice ?? 0, order.currency)), cols.total, ctx.y, { align: 'right' });
  ctx.y += 8;

  // ─── Notes ──────────────────────────────────────────────────────────

  if (order.notes) {
    ensureSpace(ctx, 20);
    drawLine(ctx);
    ctx.y += 2;
    bold(ctx, 9);
    doc.text(pdfText(t.workOrders.notes.toUpperCase()), margin, ctx.y);
    ctx.y += 5;
    normal(ctx, 8);
    const noteLines = doc.splitTextToSize(pdfText(order.notes), ctx.contentWidth);
    doc.text(noteLines, margin, ctx.y);
    ctx.y += noteLines.length * 4 + 3;
  }

  if (order.labNotes) {
    ensureSpace(ctx, 20);
    bold(ctx, 9);
    doc.text(pdfText(t.workOrders.labNotes.toUpperCase()), margin, ctx.y);
    ctx.y += 5;
    normal(ctx, 8);
    const labLines = doc.splitTextToSize(pdfText(order.labNotes), ctx.contentWidth);
    doc.text(labLines, margin, ctx.y);
    ctx.y += labLines.length * 4 + 3;
  }

  // ─── Deadlines ──────────────────────────────────────────────────────

  if (order.requestedDeadline || order.promisedDeadline) {
    ensureSpace(ctx, 15);
    ctx.y += 3;
    if (order.requestedDeadline) {
      bold(ctx, 9);
      doc.text(pdfText(`${t.workOrders.requestedDeadline}:`), margin, ctx.y);
      normal(ctx, 9);
      doc.text(formatPdfDate(order.requestedDeadline), margin + 45, ctx.y);
      ctx.y += 5;
    }
    if (order.promisedDeadline) {
      bold(ctx, 9);
      doc.text(pdfText(`${t.workOrders.promisedDeadline}:`), margin, ctx.y);
      normal(ctx, 9);
      doc.text(formatPdfDate(order.promisedDeadline), margin + 45, ctx.y);
      ctx.y += 5;
    }
  }

  // ─── Signatures ─────────────────────────────────────────────────────

  const sigY = Math.max(ctx.y + 15, doc.internal.pageSize.getHeight() - 40);
  if (sigY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    ctx.y = margin + 20;
  } else {
    ctx.y = sigY;
  }

  normal(ctx, 9);
  doc.text(pdfText(`${t.invoices.issueDate}: ${formatPdfDate(new Date().toISOString())}`), margin, ctx.y);
  ctx.y += 12;

  const sigLineWidth = 55;
  const sigLeftX = margin + 10;
  const sigRightX = ctx.rightCol - sigLineWidth - 10;

  doc.setDrawColor(120);
  doc.line(sigLeftX, ctx.y, sigLeftX + sigLineWidth, ctx.y);
  doc.line(sigRightX, ctx.y, sigRightX + sigLineWidth, ctx.y);
  ctx.y += 4;

  normal(ctx, 8);
  doc.text(pdfText(t.workOrders.doctor), sigLeftX + sigLineWidth / 2, ctx.y, { align: 'center' });
  doc.text('Labor', sigRightX + sigLineWidth / 2, ctx.y, { align: 'center' });

  // ─── Save ───────────────────────────────────────────────────────────

  doc.save(`Munkalap_${order.workOrderNumber}.pdf`);
}

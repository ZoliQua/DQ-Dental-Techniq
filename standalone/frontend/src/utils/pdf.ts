import jsPDF from 'jspdf';

// ─── Hungarian character transliteration for jsPDF built-in fonts ──
// jsPDF's built-in helvetica only supports Latin-1 (ISO 8859-1).
// ő/ű are outside this range, so we map them to ö/ü.

const CHAR_MAP: Record<string, string> = {
  'ő': 'ö', 'Ő': 'Ö', 'ű': 'ü', 'Ű': 'Ü',
};

export function pdfText(text: string): string {
  return text.replace(/[őŐűŰ]/g, (ch) => CHAR_MAP[ch] || ch);
}

export function formatPdfDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function formatPdfCurrency(amount: number, currency = 'HUF'): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'EUR' ? 2 : 0,
  }).format(amount);
}

// ─── PDF builder helpers ────────────────────────────────────────────

export interface PdfCtx {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  contentWidth: number;
  rightCol: number;
}

export function createPdfCtx(): PdfCtx {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  return {
    doc,
    y: margin,
    margin,
    pageWidth,
    contentWidth: pageWidth - 2 * margin,
    rightCol: pageWidth - margin,
  };
}

export function drawLine(ctx: PdfCtx) {
  ctx.doc.setDrawColor(180);
  ctx.doc.line(ctx.margin, ctx.y, ctx.rightCol, ctx.y);
  ctx.y += 2;
}

export function bold(ctx: PdfCtx, size = 10) {
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(size);
}

export function normal(ctx: PdfCtx, size = 9) {
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(size);
}

export function labelValue(ctx: PdfCtx, label: string, value: string, x: number, labelWidth = 28) {
  bold(ctx, 9);
  ctx.doc.text(pdfText(label), x, ctx.y);
  normal(ctx, 9);
  ctx.doc.text(pdfText(value), x + labelWidth, ctx.y);
}

export function checkbox(ctx: PdfCtx, checked: boolean, label: string, x: number) {
  ctx.doc.setDrawColor(100);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.rect(x, ctx.y - 3, 3.5, 3.5);
  if (checked) {
    ctx.doc.setLineWidth(0.6);
    ctx.doc.line(x + 0.5, ctx.y - 1, x + 1.5, ctx.y + 0.2);
    ctx.doc.line(x + 1.5, ctx.y + 0.2, x + 3, ctx.y - 2.5);
    ctx.doc.setLineWidth(0.3);
  }
  normal(ctx, 8);
  ctx.doc.text(pdfText(label), x + 5, ctx.y);
}

export function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.doc.internal.pageSize.getHeight() - 15) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

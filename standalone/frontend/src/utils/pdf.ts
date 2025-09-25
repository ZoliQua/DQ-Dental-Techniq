import jsPDF from 'jspdf';
import { robotoRegularBase64 } from './fonts/robotoRegular';
import { robotoBoldBase64 } from './fonts/robotoBold';

// ─── Roboto font registration ──────────────────────────────────────
// Roboto supports full Hungarian character set (á, é, í, ó, ö, ő, ú, ü, ű).

const FONT_FAMILY = 'Roboto';

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
  doc.addFont('Roboto-Regular.ttf', FONT_FAMILY, 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
  doc.addFont('Roboto-Bold.ttf', FONT_FAMILY, 'bold');
  doc.setFont(FONT_FAMILY, 'normal');
}

// ─── Text helpers ───────────────────────────────────────────────────

/** Pass-through — Roboto renders all Hungarian characters natively */
export function pdfText(text: string): string {
  return text;
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
  registerFonts(doc);
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
  ctx.doc.setFont(FONT_FAMILY, 'bold');
  ctx.doc.setFontSize(size);
}

export function normal(ctx: PdfCtx, size = 9) {
  ctx.doc.setFont(FONT_FAMILY, 'normal');
  ctx.doc.setFontSize(size);
}

export function labelValue(ctx: PdfCtx, label: string, value: string, x: number, labelWidth = 28) {
  bold(ctx, 9);
  ctx.doc.text(label, x, ctx.y);
  normal(ctx, 9);
  ctx.doc.text(value, x + labelWidth, ctx.y);
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
  ctx.doc.text(label, x + 5, ctx.y);
}

export function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.doc.internal.pageSize.getHeight() - 15) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

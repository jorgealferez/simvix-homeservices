import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';

export interface PdfBuilderOptions {
  title: string;
  subtitle?: string;
  footer?: string;
}

export class PdfBuilder {
  private doc!: PDFDocument;
  private font!: PDFFont;
  private fontBold!: PDFFont;
  private page!: PDFPage;
  private y = 0;
  private pageNumber = 0;

  static async create(options: PdfBuilderOptions): Promise<PdfBuilder> {
    const b = new PdfBuilder();
    await b.init(options);
    return b;
  }

  private async init(options: PdfBuilderOptions): Promise<void> {
    this.doc = await PDFDocument.create();
    this.doc.setTitle(options.title);
    this.doc.setAuthor(process.env.OBRAS_FIRMA_NOMBRE ?? 'Simvix Obras');
    this.doc.setProducer('Simvix Obras');
    this.doc.setCreator('Simvix Obras');
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
    this.headingTitle(options.title);
    if (options.subtitle) this.text(options.subtitle, { italic: true });
    this.spacer(10);
  }

  private newPage(): void {
    this.page = this.doc.addPage([595, 842]); // A4
    this.pageNumber += 1;
    this.y = 800;
    this.drawFooter();
  }

  private drawFooter(): void {
    const footer = `${process.env.OBRAS_FIRMA_NOMBRE ?? 'Simvix Obras'} — página ${this.pageNumber}`;
    this.page.drawText(footer, {
      x: 40,
      y: 25,
      size: 8,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  private ensureSpace(min: number): void {
    if (this.y - min < 50) {
      this.newPage();
    }
  }

  headingTitle(text: string): void {
    this.ensureSpace(40);
    this.page.drawText(text, { x: 40, y: this.y, size: 18, font: this.fontBold });
    this.y -= 28;
  }

  heading1(text: string): void {
    this.ensureSpace(30);
    this.page.drawText(text, { x: 40, y: this.y, size: 14, font: this.fontBold });
    this.y -= 22;
  }

  heading2(text: string): void {
    this.ensureSpace(25);
    this.page.drawText(text, { x: 40, y: this.y, size: 12, font: this.fontBold });
    this.y -= 18;
  }

  text(text: string, opts: { italic?: boolean; bold?: boolean; indent?: number } = {}): void {
    const lines = wrapText(text, 95);
    const font = opts.bold ? this.fontBold : this.font;
    const x = 40 + (opts.indent ?? 0);
    for (const line of lines) {
      this.ensureSpace(14);
      this.page.drawText(line, { x, y: this.y, size: 10, font });
      this.y -= 14;
    }
  }

  bullet(text: string): void {
    this.text(`• ${text}`, { indent: 10 });
  }

  spacer(amount = 8): void {
    this.y -= amount;
    if (this.y < 60) this.newPage();
  }

  hr(): void {
    this.ensureSpace(12);
    this.page.drawLine({
      start: { x: 40, y: this.y },
      end: { x: 555, y: this.y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    this.y -= 14;
  }

  /**
   * Renderiza markdown de forma muy ligera: headings, listas, párrafos, separadores.
   * No interpreta tablas; las pinta como texto monoespaciado simulado.
   */
  markdown(md: string): void {
    const lines = md.split('\n');
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        this.spacer(6);
        continue;
      }
      if (line.startsWith('# ')) {
        this.heading1(line.slice(2).trim());
      } else if (line.startsWith('## ')) {
        this.heading2(line.slice(3).trim());
      } else if (line.startsWith('### ')) {
        this.text(line.slice(4).trim(), { bold: true });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        this.bullet(line.slice(2).trim());
      } else if (line.startsWith('|')) {
        // tabla en bruto
        this.text(line);
      } else if (line.startsWith('---')) {
        this.hr();
      } else {
        this.text(line);
      }
    }
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const p of paragraphs) {
    if (p.length <= maxChars) {
      out.push(p);
      continue;
    }
    const words = p.split(/\s+/);
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) {
        if (line) out.push(line.trim());
        if (w.length > maxChars) {
          // palabra extremadamente larga
          for (let i = 0; i < w.length; i += maxChars) out.push(w.slice(i, i + maxChars));
          line = '';
        } else {
          line = w;
        }
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line) out.push(line);
  }
  return out;
}

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function generateReceiptPDF(data: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 width, Half height (Compact Receipt / Payslip format)
  const page = pdfDoc.addPage([595.28, 420.94]); 
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 40;
  let cursorY = height - margin;

  const drawText = (text: string, font: any, size: number, x: number, alignCenter: boolean = false, boxWidth: number = 0) => {
    let finalX = x;
    if (alignCenter && boxWidth > 0) {
      const textWidth = font.widthOfTextAtSize(text, size);
      finalX = x + (boxWidth - textWidth) / 2;
    }
    page.drawText(text, { x: finalX, y: cursorY, size, font, color: rgb(0, 0, 0) });
  };

  const drawLine = (yOffset: number, thickness: number = 1) => {
    page.drawLine({
      start: { x: margin, y: cursorY + yOffset },
      end: { x: width - margin, y: cursorY + yOffset },
      thickness: thickness,
      color: rgb(0, 0, 0)
    });
  };

  // --- LOGO HANDLING ---
  const publicDir = path.join(process.cwd(), 'public');
  const logoPath = path.join(publicDir, 'logo.png');
  let logoWidth = 0;
  if (fs.existsSync(logoPath)) {
    try {
      const logoImageBytes = fs.readFileSync(logoPath);
      let img;
      try {
        img = await pdfDoc.embedPng(logoImageBytes);
      } catch (err) {
        img = await pdfDoc.embedJpg(logoImageBytes);
      }
      const dims = img.scale(0.3); // Scale down
      page.drawImage(img, {
        x: margin,
        y: cursorY - 10,
        width: dims.width,
        height: dims.height,
      });
      logoWidth = dims.width + 10;
    } catch(e) {
      console.error("Failed to embed logo", e);
    }
  }

  // --- HEADER ---
  drawText('GREEN HOUSE SERVICOS DE LOCACAO DE MAO DE OBRA LTDA', helveticaBold, 10, margin + logoWidth);
  cursorY -= 14;
  drawText('RECIBO DE PAGAMENTO DE BENEFÍCIO', helveticaBold, 12, margin + logoWidth);
  cursorY -= 14;
  drawText(`Competência: ${data.competencia}`, helvetica, 10, margin + logoWidth);
  
  cursorY -= 20;
  drawLine(10, 1);
  
  // --- COLABORADOR INFO ---
  drawText(`Colaborador:`, helveticaBold, 9, margin);
  drawText(data.nome, helvetica, 9, margin + 65);
  drawText(`CPF:`, helveticaBold, 9, width - margin - 150);
  drawText(data.cpf, helvetica, 9, width - margin - 120);
  cursorY -= 12;
  
  drawText(`Período:`, helveticaBold, 9, margin);
  drawText(`${data.ini} até ${data.fim}`, helvetica, 9, margin + 45);
  drawText(`Dias Úteis:`, helveticaBold, 9, width - margin - 150);
  drawText(`${data.dias_uteis}`, helvetica, 9, width - margin - 95);
  cursorY -= 12;
  
  drawText(`Diária Alimentação:`, helveticaBold, 9, margin);
  drawText(`${data.valor_unitario_va}`, helvetica, 9, margin + 95);
  drawText(`Diária Transporte:`, helveticaBold, 9, width - margin - 150);
  drawText(`${data.valor_unitario_vt}`, helvetica, 9, width - margin - 60);

  cursorY -= 5;
  drawLine(-5, 0.5);
  cursorY -= 15;

  // --- GRID HEADERS ---
  drawText(`DESCRIÇÃO`, helveticaBold, 9, margin);
  drawText(`VENCIMENTOS`, helveticaBold, 9, margin + 250);
  drawText(`DESCONTOS`, helveticaBold, 9, margin + 360);
  cursorY -= 5;
  drawLine(-5, 0.5);
  cursorY -= 15;

  // --- GRID BODY ---
  const printRow = (desc: string, venc: string, descValue: string) => {
    drawText(desc, helvetica, 9, margin);
    drawText(venc, helvetica, 9, margin + 250);
    drawText(descValue, helvetica, 9, margin + 360);
    cursorY -= 12;
  };

  printRow('Vale Alimentação', data.va_receita, data.va_despesa);
  printRow('Vale Transporte', data.vt_receita, data.vt_despesa);
  printRow('Dias Descontados (Faltas/Atestados)', '-', `${data.dias_descontados} dias`);
  
  cursorY -= 5;
  drawLine(-5, 0.5);
  cursorY -= 15;

  // --- LÍQUIDOS ---
  drawText(`LÍQUIDO A DEPOSITAR (VA):`, helveticaBold, 9, margin + 100);
  drawText(data.valor_liquido_depositado_va, helveticaBold, 9, margin + 250);
  cursorY -= 12;
  drawText(`LÍQUIDO A DEPOSITAR (VT):`, helveticaBold, 9, margin + 100);
  drawText(data.valor_liquido_depositado_vt, helveticaBold, 9, margin + 250);
  
  cursorY -= 5;
  drawLine(-5, 1);
  cursorY -= 20;

  // --- TEXTO ALINHADO À ESQUERDA (Com word-wrap simples) ---
  const declaration = `Eu, ${data.nome}, recebi a quantia discriminada acima, da Empresa GREEN HOUSE SERVIÇOS DE LOCAÇÃO DE MÃO DE OBRA LTDA, para minha utilização no período indicado.`;
  
  const maxW = width - margin * 2;
  const words = declaration.split(' ');
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
    const testWidth = helvetica.widthOfTextAtSize(testLine, 9);
    if (testWidth > maxW) {
      page.drawText(currentLine, { x: margin, y: cursorY, size: 9, font: helvetica, color: rgb(0, 0, 0) });
      cursorY -= 12;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine !== '') {
    page.drawText(currentLine, { x: margin, y: cursorY, size: 9, font: helvetica, color: rgb(0, 0, 0) });
    cursorY -= 16;
  }

  if (data.obs && data.obs.trim() !== '' && data.obs !== 'Sem observações') {
    drawText(`Observação: ${data.obs}`, helvetica, 8, margin);
  }

  // --- FIXED BOTTOM BLOCK ---
  cursorY = 90;
  
  // --- CENTERED DATE ---
  drawText(`Brasília - DF,  ${data.data_atual}.`, helvetica, 10, margin, true, maxW);
  
  cursorY = 50; 
  // --- SIGNATURE LINE ---
  drawText('__________________________________________________________', helvetica, 10, margin, true, maxW);
  cursorY -= 12;
  drawText(data.nome, helveticaBold, 9, margin, true, maxW);
  cursorY -= 10;
  drawText(`CPF: ${data.cpf}`, helvetica, 8, margin, true, maxW);

  return await pdfDoc.save();
}

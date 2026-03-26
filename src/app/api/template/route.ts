import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const headers = [
      'NOME', // A
      'CPF',  // B
      'Periodo VA-VT início', // C
      'Periodo VA-VT  fim',   // D
      'DIAS ÚTEIS', // E
      'VALOR UNITÁRIO ALIMENTAÇÃO', // F
      'VALOR UNITÁRIO VALE TRANSPORTE', // G
      'VALE ALIMENTAÇÃO', // H
      'VALE TRANSPORTE',  // I
      'DIAS DESCONTADO',  // J
      'DIAS DESCONTADOS VT', // K
      'VALE ALIMENTAÇÃO (DESCONTO POR FALTA E ATESTADO)', // L
      'VALE TRANSPORTE (DESCONTO POR FALTA E ATESTADO)',  // M
      'VALOR PAGO VA', // N
      'VALOR PAGO VT', // O
      'VALOR DESCONTADO VA', // P
      'VALOR DESCONTADO VT', // Q
      'VALOR LÍQUIDO DEPOSITADO VA', // R
      'VALOR LÍQUIDO DEPOSITADO VT', // S
      'Observação', // T
      'DATA ASSINATURA DO RECIBO', // U
      'Terminado', // V
      'EMAIL FUNCIONARIO', // W
      'WHATSAPP FUNCIONARIO' // X
    ];

    const dummyData = [
      'JOAO DA SILVA', // A
      '111.222.333-44', // B
      '01/05/2026', // C
      '31/05/2026', // D
      21, // E
      46.38, // F
      11.00, // G
      { t: 'n', f: 'E2*F2' }, // H
      { t: 'n', f: 'E2*G2' }, // I
      0, // J
      0, // K
      { t: 'n', f: 'J2*F2' }, // L
      { t: 'n', f: 'K2*G2' }, // M
      { t: 'n', f: 'H2' }, // N
      { t: 'n', f: 'I2' }, // O
      { t: 'n', f: 'L2' }, // P
      { t: 'n', f: 'M2' }, // Q
      { t: 'n', f: 'N2-P2' }, // R
      { t: 'n', f: 'O2-Q2' }, // S
      'Sem observações', // T
      '01 de maio de 2026', // U
      'Pendente', // V
      'joao.silva@exemplo.com', // W
      '5561999999999' // X
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([headers, dummyData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Beneficios');

    // Auto-size columns slightly
    worksheet['!cols'] = headers.map(() => ({ wch: 25 }));

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Beneficios_Oficial.xlsx"'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return NextResponse.json({ error: 'Erro gerando o template' }, { status: 500 });
  }
}

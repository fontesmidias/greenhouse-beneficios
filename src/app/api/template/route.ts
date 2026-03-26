import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const workbook = xlsx.utils.book_new();
    
    // Headers required by the PRD
    const headers = [
      ["NOME", "CPF", "TELEFONE", "EMAIL", "VA_VALOR_DIARIO", "VT_VALOR_DIARIO", "DIAS_UTEIS", "DIAS_DESCONTO", "OBSERVACAO"]
    ];

    // Dummy Row to show an example to DP
    const data = [
      ["João da Silva", "11122233344", "5511999999999", "joao@email.com", 46.38, 11.00, 22, 1, "Atestado médico de 1 dia"]
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([...headers, ...data]);

    // Set column widths to make it look nice
    worksheet['!cols'] = [
      { wch: 30 }, // NOME
      { wch: 15 }, // CPF
      { wch: 15 }, // TELEFONE
      { wch: 25 }, // EMAIL
      { wch: 20 }, // VA
      { wch: 20 }, // VT
      { wch: 15 }, // Dias
      { wch: 15 }, // Desc
      { wch: 40 }, // Obs
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Beneficios_GreenHouse.xlsx"',
      },
    });
  } catch (error) {
    console.error('Failed to generate template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

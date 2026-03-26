import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse as JSON with headers
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    
    if (data.length === 0) {
      return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 });
    }

    // Basic validation check
    const firstRow = data[0] as any;
    if (!firstRow.hasOwnProperty('NOME') || !firstRow.hasOwnProperty('CPF')) {
      return NextResponse.json({ error: 'Planilha inválida. O cabeçalho deve conter NOME e CPF. Baixe o modelo padrão.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: data.length, rows: data }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar planilha:', error);
    return NextResponse.json({ error: 'Falha ao ler o arquivo Excel. Verifique se o formato está correto.', details: String(error) }, { status: 500 });
  }
}

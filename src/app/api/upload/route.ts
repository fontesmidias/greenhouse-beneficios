import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { logger } from '../../../lib/logger';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      logger.warn("Upload falhou: Nenhum arquivo enviado no FormData");
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    logger.info(`Iniciando leitura do arquivo Excel: ${file.name} (${file.size} bytes)`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse as JSON with headers
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    
    if (data.length === 0) {
      return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 });
    }

    // Detailed validation check per row to give precise UI feedback
    for (let i = 0; i < data.length; i++) {
       const row = data[i] as any;
       const rowNumber = i + 2; // +1 for 0-index, +1 for header

       if (!row['NOME'] || String(row['NOME']).trim() === '') {
          return NextResponse.json({ error: `🚨 ERRO NA PLANILHA (Linha ${rowNumber}): A coluna "NOME" está vazia ou ausente.` }, { status: 400 });
       }
       if (!row['CPF'] || String(row['CPF']).trim() === '') {
          return NextResponse.json({ error: `🚨 ERRO NA PLANILHA (Linha ${rowNumber}): A coluna "CPF" está inválida para o Colaborador ${row['NOME']}.` }, { status: 400 });
       }
    }

    logger.info(`Planilha lida validada com sucesso. Colaboradores: ${data.length}`, { file: file.name });
    return NextResponse.json({ success: true, count: data.length, rows: data }, { status: 200 });

  } catch (error: any) {
    logger.error('Erro ao processar planilha na etapa de leitura:', { error: String(error) });
    console.error('Erro ao processar planilha:', error);
    return NextResponse.json({ error: 'Falha ao ler o arquivo Excel. Verifique se o formato está correto.', details: String(error) }, { status: 500 });
  }
}

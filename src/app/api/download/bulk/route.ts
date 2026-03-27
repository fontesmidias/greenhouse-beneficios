import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { BulkDownloadService } from '@/lib/services/BulkDownloadService';

export async function POST(request: NextRequest) {
  try {
    // Autenticação e autorização
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // TODO: Verificar role DP_MANAGER ou ADMIN
    // if (!['ADMIN', 'DP_MANAGER'].includes(session.user.role)) {
    //   return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    // }

    // Parse request body
    const { receiptIds } = await request.json();

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs de recibos inválida' },
        { status: 400 }
      );
    }

    // Processar bulk download
    const result = await BulkDownloadService.processBulkDownload(receiptIds);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Retornar ZIP como download
    const response = new NextResponse(
      result.zipBuffer ? Uint8Array.from(result.zipBuffer) : null,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
          'Cache-Control': 'no-cache'
        }
      }
    );

    return response;

  } catch (error) {
    console.error('Erro no bulk download:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
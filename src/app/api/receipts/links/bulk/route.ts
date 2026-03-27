import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { LinkService } from '@/lib/services/LinkService';

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

    if (receiptIds.length > 50) {
      return NextResponse.json(
        { error: 'Máximo de 50 links por vez' },
        { status: 400 }
      );
    }

    // Obter links em massa
    const result = await LinkService.getBulkMagicLinks(receiptIds, (session.user as any).id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      links: result.links
    });

  } catch (error) {
    console.error('Erro ao obter links em massa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
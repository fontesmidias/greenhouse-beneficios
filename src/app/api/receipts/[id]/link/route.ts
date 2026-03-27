import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { LinkService } from '@/lib/services/LinkService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    // Autenticação e autorização
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // TODO: Verificar role DP_MANAGER ou ADMIN
    // if (!['ADMIN', 'DP_MANAGER'].includes(session.user.role)) {
    //   return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    // }

    if (!id) {
      return NextResponse.json(
        { error: 'ID do recibo é obrigatório' },
        { status: 400 }
      );
    }

    // Obter link mágico
    const result = await LinkService.getMagicLink(id, (session.user as any).id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      link: result.link
    });

  } catch (error) {
    console.error('Erro ao obter link:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
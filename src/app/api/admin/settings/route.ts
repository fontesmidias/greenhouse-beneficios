import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/authz';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const smtps = await prisma.smtpConfig.findMany();
    const evos = await prisma.evoInstance.findMany();
    return NextResponse.json({ smtps, evos });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { action, type, data } = await req.json();

    if (type === 'smtp') {
       if (action === 'create') {
         await prisma.smtpConfig.create({ data });
       } else if (action === 'delete') {
         await prisma.smtpConfig.delete({ where: { id: data.id } });
       }
    } else if (type === 'evo') {
       if (action === 'create') {
         await prisma.evoInstance.create({ data });
       } else if (action === 'delete') {
         await prisma.evoInstance.delete({ where: { id: data.id } });
       } else if (action === 'status') {
         await prisma.evoInstance.update({ where: { id: data.id }, data: { status: data.status } });
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha ao executar ação', msg: error.message }, { status: 500 });
  }
}

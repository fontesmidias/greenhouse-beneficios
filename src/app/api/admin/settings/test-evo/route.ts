import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

type EvoInline = {
  name: string;
  apiUrl: string;
  apiKey: string;
};

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { evoId, evoInline, toPhone } = body as {
      evoId?: string;
      evoInline?: EvoInline;
      toPhone: string;
    };

    if (!toPhone || typeof toPhone !== "string") {
      return NextResponse.json({ success: false, error: "Número de WhatsApp destinatário é obrigatório." }, { status: 400 });
    }

    const numericPhone = toPhone.replace(/\D/g, "");
    if (numericPhone.length < 10) {
      return NextResponse.json({ success: false, error: "Número inválido. Use formato com DDI (ex.: 5561999999999)." }, { status: 400 });
    }

    let apiUrl: string;
    let apiKey: string;
    let instanceName: string;
    let label: string;

    if (evoId) {
      const cfg = await prisma.evoInstance.findUnique({ where: { id: evoId } });
      if (!cfg) {
        return NextResponse.json({ success: false, error: "Instância Evo não encontrada." }, { status: 404 });
      }
      apiUrl = cfg.apiUrl;
      apiKey = cfg.apiKey;
      instanceName = cfg.name;
      label = cfg.name;
    } else if (evoInline) {
      if (!evoInline.name || !evoInline.apiUrl || !evoInline.apiKey) {
        return NextResponse.json({ success: false, error: "Preencha nome, URL e chave para testar." }, { status: 400 });
      }
      apiUrl = evoInline.apiUrl;
      apiKey = evoInline.apiKey;
      instanceName = evoInline.name;
      label = evoInline.name;
    } else {
      return NextResponse.json({ success: false, error: "Informe evoId ou evoInline." }, { status: 400 });
    }

    const text =
      "Teste de Evolution API — GreenHouse DP. Se você recebeu esta mensagem, a credencial está funcionando corretamente.";

    const payload = {
      number: numericPhone,
      options: { delay: 500, presence: "composing" },
      text,
    };

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[admin/settings/test-evo] falha HTTP", { label, status: response.status, body: errorBody.slice(0, 500) });
      return NextResponse.json({
        success: false,
        error: `Evolution API respondeu HTTP ${response.status}: ${errorBody.slice(0, 300)}`,
      });
    }

    const data = await response.json();
    console.log("[admin/settings/test-evo] sucesso", { label, to: numericPhone });
    return NextResponse.json({ success: true, response: data });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("[admin/settings/test-evo] excecao:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg });
  }
}

import { prisma } from '../prisma';
import { v4 as uuidv4 } from 'uuid';

export class LinkService {
  /**
   * Obtém o link mágico de um recibo para reenvio
   */
  static async getMagicLink(receiptId: string, userId?: string): Promise<{
    success: boolean;
    link?: string;
    error?: string;
  }> {
    try {
      // Buscar recibo no banco
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId }
      });

      if (!receipt) {
        return { success: false, error: 'Recibo não encontrado' };
      }

      // Validar status do recibo
      if (!['ENVIADO', 'ASSINADO'].includes(receipt.status)) {
        return { success: false, error: 'Recibo deve estar enviado ou assinado' };
      }

      // Verificar se tem token
      if (!receipt.magicLinkToken) {
        return { success: false, error: 'Token mágico não encontrado' };
      }

      // Gerar link completo
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const link = `${baseUrl}/sign?token=${receipt.magicLinkToken}`;

      // Registrar auditoria
      await prisma.magicLinkAudit.create({
        data: {
          receiptId,
          userId,
          action: 'LINK_OBTAINED',
          ipAddress: null // TODO: capturar IP do request
        }
      });

      return { success: true, link };

    } catch (error) {
      console.error('Erro ao obter link mágico:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      };
    }
  }

  /**
   * Obtém links em massa para múltiplos recibos
   */
  static async getBulkMagicLinks(receiptIds: string[], userId?: string): Promise<{
    success: boolean;
    links?: Array<{ receiptId: string; nome: string; link: string }>;
    error?: string;
  }> {
    try {
      const links = [];

      for (const receiptId of receiptIds) {
        const result = await this.getMagicLink(receiptId, userId);
        if (!result.success) {
          return { success: false, error: result.error };
        }

        // Buscar nome do recibo
        const receipt = await prisma.receipt.findUnique({
          where: { id: receiptId },
          select: { nome: true }
        });

        links.push({
          receiptId,
          nome: receipt?.nome || 'N/A',
          link: result.link!
        });
      }

      return { success: true, links };

    } catch (error) {
      console.error('Erro ao obter links em massa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      };
    }
  }
}
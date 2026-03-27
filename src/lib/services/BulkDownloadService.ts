import JSZip from 'jszip';
import { prisma } from '../prisma';
import fs from 'fs';
import path from 'path';

export class BulkDownloadService {
  /**
   * Valida se os recibos podem ser baixados em massa
   */
  static async validateReceiptIds(receiptIds: string[]): Promise<{
    valid: boolean;
    error?: string;
    validReceipts?: any[];
  }> {
    if (!receiptIds || receiptIds.length === 0) {
      return { valid: false, error: 'Nenhum recibo selecionado' };
    }

    if (receiptIds.length > 100) {
      return { valid: false, error: 'Máximo de 100 recibos por download' };
    }

    const validReceipts = [];

    for (const id of receiptIds) {
      const receipt = await prisma.receipt.findUnique({
        where: { id }
      });
      
      if (!receipt) {
        return { valid: false, error: `Recibo ${id} não encontrado` };
      }

      if (receipt.status !== 'ASSINADO') {
        return { valid: false, error: `Recibo ${receipt.nome} não está assinado` };
      }

      if (!receipt.pdfSignedPath || !fs.existsSync(receipt.pdfSignedPath)) {
        return { valid: false, error: `PDF assinado não encontrado para ${receipt.nome}` };
      }

      validReceipts.push(receipt);
    }

    return { valid: true, validReceipts };
  }

  /**
   * Cria um arquivo ZIP com múltiplos PDFs
   */
  static async createBulkZip(receipts: any[]): Promise<{
    zipBuffer: Buffer;
    fileName: string;
  }> {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    for (const receipt of receipts) {
      try {
        const pdfBuffer = fs.readFileSync(receipt.pdfSignedPath);
        const fileName = `Recibo_${receipt.competencia.replace('/', '-')}_${receipt.nome.replace(/\s+/g, '_')}.pdf`;
        zip.file(fileName, pdfBuffer);
      } catch (error) {
        console.error(`Erro ao adicionar PDF ${receipt.id}:`, error);
        throw new Error(`Falha ao processar PDF de ${receipt.nome}`);
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const fileName = `recibos_assinados_${timestamp}.zip`;

    return { zipBuffer, fileName };
  }

  /**
   * Processa download em massa completo
   */
  static async processBulkDownload(receiptIds: string[]): Promise<{
    success: boolean;
    zipBuffer?: Buffer;
    fileName?: string;
    error?: string;
  }> {
    try {
      // 1. Validar recibos
      const validation = await this.validateReceiptIds(receiptIds);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 2. Criar ZIP
      const { zipBuffer, fileName } = await this.createBulkZip(validation.validReceipts!);

      // 3. Log da operação (futuro: implementar auditoria)

      return {
        success: true,
        zipBuffer,
        fileName
      };

    } catch (error) {
      console.error('Erro no bulk download:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      };
    }
  }
}
'use client';

import { useState } from 'react';

interface Receipt {
  id: string;
  nome: string;
  competencia: string;
  status: string;
  email?: string;
  telefone?: string;
}

interface BulkReceiptSelectorProps {
  receipts: Receipt[];
  onBulkDownload: (selectedIds: string[]) => void;
  onGetBulkLinks: (selectedIds: string[]) => void;
  loading?: boolean;
}

export function BulkReceiptSelector({
  receipts,
  onBulkDownload,
  onGetBulkLinks,
  loading = false
}: BulkReceiptSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Filtrar apenas recibos assinados
  const signedReceipts = receipts.filter(r => r.status === 'ASSINADO');

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(signedReceipts.map(r => r.id)));
      setSelectAll(true);
    }
  };

  const handleSelectReceipt = (receiptId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId);
    } else {
      newSelected.add(receiptId);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === signedReceipts.length);
  };

  const handleBulkDownload = () => {
    if (selectedIds.size > 0) {
      onBulkDownload(Array.from(selectedIds));
    }
  };

  const handleGetBulkLinks = () => {
    if (selectedIds.size > 0) {
      onGetBulkLinks(Array.from(selectedIds));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com controles */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">
              Selecionar Todos ({signedReceipts.length})
            </span>
          </label>
          <span className="text-sm text-gray-500">
            {selectedIds.size} selecionado(s)
          </span>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleGetBulkLinks}
            disabled={selectedIds.size === 0 || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Obter Links
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0 || loading}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processando...' : 'Download Massa'}
          </button>
        </div>
      </div>

      {/* Tabela de recibos */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Competência
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {signedReceipts.map((receipt) => (
              <tr key={receipt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(receipt.id)}
                    onChange={() => handleSelectReceipt(receipt.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {receipt.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {receipt.competencia}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {receipt.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {receipt.email || receipt.telefone || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onGetBulkLinks([receipt.id])}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Obter Link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {signedReceipts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum recibo assinado encontrado
        </div>
      )}
    </div>
  );
}
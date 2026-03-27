'use client';

import { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  links: Array<{
    receiptId: string;
    nome: string;
    link: string;
  }>;
}

export function LinkModal({ isOpen, onClose, title, links }: LinkModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (index: number) => {
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllLinks = () => {
    const allLinksText = links.map(link =>
      `${link.nome}: ${link.link}`
    ).join('\n');

    navigator.clipboard.writeText(allLinksText);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {links.length > 1 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <button
              onClick={copyAllLinks}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {copiedIndex === -1 ? 'Copiado!' : 'Copiar Todos os Links'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={link.receiptId} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-900">{link.nome}</span>
                <CopyToClipboard
                  text={link.link}
                  onCopy={() => handleCopy(index)}
                >
                  <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                    {copiedIndex === index ? 'Copiado!' : 'Copiar'}
                  </button>
                </CopyToClipboard>
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <code className="text-sm text-gray-800 break-all">
                  {link.link}
                </code>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
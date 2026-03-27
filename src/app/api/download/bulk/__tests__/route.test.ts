import { NextRequest } from 'next/server';
import { POST } from '../route';

jest.mock('../../../../../../lib/services/BulkDownloadService', () => ({
  createBulkZip: jest.fn(),
}));

import { createBulkZip } from '../../../../../lib/services/BulkDownloadService';

describe('/api/download/bulk', () => {
  it('should return ZIP file for valid receipt IDs', async () => {
    const mockZipBuffer = Buffer.from('mock zip content');

    (createBulkZip as jest.Mock).mockResolvedValue(mockZipBuffer);

    const request = new NextRequest('http://localhost:3000/api/download/bulk', {
      method: 'POST',
      body: JSON.stringify({ receiptIds: ['1', '2'] }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="recibos-bulk.zip"');

    const buffer = await response.arrayBuffer();
    expect(Buffer.from(buffer)).toEqual(mockZipBuffer);
    expect(createBulkZip).toHaveBeenCalledWith(['1', '2']);
  });

  it('should return 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/download/bulk', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('receiptIds é obrigatório e deve ser um array');
  });

  it('should return 500 on service error', async () => {
    (createBulkZip as jest.Mock).mockRejectedValue(new Error('Service error'));

    const request = new NextRequest('http://localhost:3000/api/download/bulk', {
      method: 'POST',
      body: JSON.stringify({ receiptIds: ['1'] }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erro interno do servidor');
  });
});
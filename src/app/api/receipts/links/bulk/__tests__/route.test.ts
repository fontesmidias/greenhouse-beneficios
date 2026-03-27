import { NextRequest } from 'next/server';
import { POST } from '../route';

jest.mock('../../../../../../lib/services/LinkService', () => ({
  getBulkMagicLinks: jest.fn(),
}));

import { getBulkMagicLinks } from '../../../../../lib/services/LinkService';

describe('/api/receipts/links/bulk', () => {
  it('should return bulk links for valid receipt IDs', async () => {
    const mockLinks = [
      { receiptId: '1', link: 'http://example.com/link1' },
      { receiptId: '2', link: 'http://example.com/link2' },
    ];

    (getBulkMagicLinks as jest.Mock).mockResolvedValue(mockLinks);

    const request = new NextRequest('http://localhost:3000/api/receipts/links/bulk', {
      method: 'POST',
      body: JSON.stringify({ receiptIds: ['1', '2'] }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.links).toEqual(mockLinks);
    expect(getBulkMagicLinks).toHaveBeenCalledWith(['1', '2']);
  });

  it('should return 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/receipts/links/bulk', {
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
    (getBulkMagicLinks as jest.Mock).mockRejectedValue(new Error('Service error'));

    const request = new NextRequest('http://localhost:3000/api/receipts/links/bulk', {
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
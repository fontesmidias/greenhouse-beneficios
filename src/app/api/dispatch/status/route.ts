import { NextResponse } from 'next/server';

export async function GET() {
  const status = (global as any).dispatchStatus || {
    active: false,
    total: 0,
    sent: 0,
    failures: 0,
    etaSeconds: 0,
  };
  return NextResponse.json(status);
}

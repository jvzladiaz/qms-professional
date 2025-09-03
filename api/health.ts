import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      core: { status: 'HEALTHY' },
      reporting: { status: 'HEALTHY' }
    },
    version: '5.0.0',
    features: {
      pdfGeneration: true,
      excelExport: true,
      advancedAnalytics: true,
      notifications: true,
      websockets: true
    }
  });
}
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.json({
      data: [
        {
          id: "demo-fmea-1",
          name: "Engine FMEA",
          description: "FMEA for engine assembly process",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      total: 1
    });
  }
  
  if (req.method === 'POST') {
    return res.json({
      data: {
        id: `demo-fmea-${Date.now()}`,
        name: req.body.name || "New FMEA",
        description: req.body.description || "",
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
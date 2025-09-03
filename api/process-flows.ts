import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.json({
      data: [
        {
          id: "demo-flow-1",
          name: "Engine Assembly Process",
          description: "Main engine assembly line process flow",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { processSteps: 5, stepConnections: 4 }
        },
        {
          id: "demo-flow-2", 
          name: "Quality Control Process",
          description: "Quality inspection and testing process",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { processSteps: 3, stepConnections: 2 }
        }
      ],
      total: 2
    });
  }
  
  if (req.method === 'POST') {
    return res.json({
      data: {
        id: `demo-flow-${Date.now()}`,
        name: req.body.name || "New Process Flow",
        description: req.body.description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { processSteps: 0, stepConnections: 0 }
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
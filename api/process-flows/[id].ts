import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    return res.json({
      data: {
        id: id,
        name: id === "demo-flow-1" ? "Engine Assembly Process" : "Quality Control Process",
        description: id === "demo-flow-1" ? "Main engine assembly line process flow" : "Quality inspection and testing process",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        processSteps: [
          {
            id: `step-${id}-1`,
            name: "Start Process",
            type: "START",
            position: { x: 100, y: 100 }
          },
          {
            id: `step-${id}-2`, 
            name: "Main Operation",
            type: "OPERATION",
            position: { x: 300, y: 100 }
          }
        ],
        stepConnections: [
          {
            id: `conn-${id}-1`,
            source: `step-${id}-1`,
            target: `step-${id}-2`
          }
        ]
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedProcessFlowData() {
  console.log('🌱 Seeding Process Flow data...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@atek-metals.com' },
    update: {},
    create: {
      email: 'admin@atek-metals.com',
      passwordHash: await bcrypt.hash('admin123', 12),
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      department: 'IT',
      isActive: true,
    },
  })

  // Create process engineer
  const processEngineer = await prisma.user.upsert({
    where: { email: 'john.engineer@atek-metals.com' },
    update: {},
    create: {
      email: 'john.engineer@atek-metals.com',
      passwordHash: await bcrypt.hash('engineer123', 12),
      firstName: 'John',
      lastName: 'Smith',
      role: 'PROCESS_ENGINEER',
      department: 'Manufacturing Engineering',
      isActive: true,
    },
  })

  // Create quality manager
  const qualityManager = await prisma.user.upsert({
    where: { email: 'jane.quality@atek-metals.com' },
    update: {},
    create: {
      email: 'jane.quality@atek-metals.com',
      passwordHash: await bcrypt.hash('quality123', 12),
      firstName: 'Jane',
      lastName: 'Johnson',
      role: 'QUALITY_MANAGER',
      department: 'Quality Assurance',
      isActive: true,
    },
  })

  console.log('✅ Users created')

  // Create sample project
  const project = await prisma.project.upsert({
    where: { projectCode: 'FORD-2024-001' },
    update: {},
    create: {
      name: 'Ford F-150 Bracket Production',
      description: 'Manufacturing process for Ford F-150 suspension bracket components',
      projectCode: 'FORD-2024-001',
      customer: 'Ford Motor Company',
      productLine: 'Automotive Brackets',
      status: 'ACTIVE',
      priority: 'HIGH',
      startDate: new Date('2024-01-15'),
      targetDate: new Date('2024-06-30'),
      createdById: processEngineer.id,
      updatedById: processEngineer.id,
    },
  })

  // Create sample part
  const part = await prisma.part.upsert({
    where: { partNumber: 'FB-2024-001' },
    update: {},
    create: {
      partNumber: 'FB-2024-001',
      name: 'Front Suspension Bracket',
      description: 'High-strength steel bracket for Ford F-150 front suspension',
      customer: 'Ford Motor Company',
      revision: 'C',
      drawingNumber: 'FB-DWG-2024-001-C',
      materialSpec: 'AISI 4140 Steel, Heat Treated',
      weightGrams: 1250.50,
    },
  })

  console.log('✅ Project and Part created')

  // Create default swimlanes with automotive manufacturing departments
  const swimlanes = await Promise.all([
    prisma.swimlane.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440001' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Raw Material',
        description: 'Material receiving and preparation',
        department: 'Warehouse',
        responsibleRole: 'Material Handler',
        color: '#E8F5E8',
        positionOrder: 1,
      },
    }),
    prisma.swimlane.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440002' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Manufacturing',
        description: 'Primary manufacturing operations',
        department: 'Manufacturing',
        responsibleRole: 'Production Operator',
        color: '#E3F2FD',
        positionOrder: 2,
      },
    }),
    prisma.swimlane.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440003' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Quality Control',
        description: 'Quality inspection and testing',
        department: 'Quality',
        responsibleRole: 'Quality Inspector',
        color: '#FFF3E0',
        positionOrder: 3,
      },
    }),
    prisma.swimlane.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440004' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Packaging & Shipping',
        description: 'Final packaging and shipping operations',
        department: 'Logistics',
        responsibleRole: 'Shipping Clerk',
        color: '#F3E5F5',
        positionOrder: 4,
      },
    }),
  ])

  console.log('✅ Swimlanes created')

  // Create comprehensive process flow
  const processFlow = await prisma.processFlow.create({
    data: {
      projectId: project.id,
      partId: part.id,
      name: 'Ford F-150 Bracket Manufacturing Process',
      description: 'Complete manufacturing process flow for Ford F-150 suspension bracket',
      version: '2.1',
      status: 'ACTIVE',
      priority: 'HIGH',
      processType: 'MANUFACTURING',
      estimatedCycleTime: 1800, // 30 minutes
      taktTime: 900, // 15 minutes
      canvasSettings: {
        zoom: 1,
        panX: 0,
        panY: 0,
        gridSize: 20,
        snapToGrid: true,
      },
      createdById: processEngineer.id,
      updatedById: processEngineer.id,
    },
  })

  console.log('✅ Process Flow created')

  // Create process steps with realistic automotive manufacturing sequence
  const steps = [
    // Raw Material Swimlane
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      stepNumber: 10,
      name: 'Material Receipt',
      description: 'Receive and inspect incoming raw steel plates',
      stepType: 'INSPECTION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440001',
      operationTime: 300,
      positionX: 150,
      positionY: 100,
      qualityRequirements: 'Material certification, dimensional check',
      safetyRequirements: 'PPE required, proper lifting techniques',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440002',
      stepNumber: 20,
      name: 'Material Staging',
      description: 'Stage material for cutting operation',
      stepType: 'TRANSPORT',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440001',
      operationTime: 180,
      positionX: 400,
      positionY: 100,
    },
    // Manufacturing Swimlane
    {
      id: '650e8400-e29b-41d4-a716-446655440003',
      stepNumber: 30,
      name: 'Plasma Cutting',
      description: 'Cut steel plate to bracket blank dimensions using CNC plasma',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440002',
      operationTime: 420,
      setupTime: 300,
      positionX: 150,
      positionY: 250,
      qualityRequirements: 'Dimensional accuracy ±0.5mm, edge quality per spec',
      safetyRequirements: 'Plasma cutting safety, ventilation required',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440004',
      stepNumber: 40,
      name: 'CNC Machining',
      description: 'Machine holes and features per engineering drawing',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440002',
      operationTime: 900,
      setupTime: 600,
      positionX: 400,
      positionY: 250,
      qualityRequirements: 'Hole diameter ±0.1mm, surface finish Ra 3.2μm',
      safetyRequirements: 'Machine guarding, coolant safety',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440005',
      stepNumber: 50,
      name: 'Forming Operation',
      description: 'Form bracket shape using hydraulic press brake',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440002',
      operationTime: 300,
      setupTime: 450,
      positionX: 650,
      positionY: 250,
      qualityRequirements: 'Bend angle ±1°, no cracking or deformation',
      safetyRequirements: 'Press brake safety, pinch point awareness',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440006',
      stepNumber: 60,
      name: 'Welding',
      description: 'Weld reinforcement plates per welding procedure',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440002',
      operationTime: 600,
      setupTime: 180,
      positionX: 900,
      positionY: 250,
      qualityRequirements: 'Full penetration welds, no defects per AWS D1.1',
      safetyRequirements: 'Welding PPE, ventilation, fire safety',
    },
    // Quality Control Swimlane
    {
      id: '650e8400-e29b-41d4-a716-446655440007',
      stepNumber: 70,
      name: 'Dimensional Inspection',
      description: 'CMM inspection of all critical dimensions',
      stepType: 'INSPECTION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440003',
      operationTime: 900,
      positionX: 150,
      positionY: 400,
      qualityRequirements: 'All dimensions within drawing tolerance',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440008',
      stepNumber: 80,
      name: 'Weld Quality Check',
      description: 'Visual and dye penetrant inspection of welds',
      stepType: 'INSPECTION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440003',
      operationTime: 450,
      positionX: 400,
      positionY: 400,
      qualityRequirements: 'No weld defects per AWS D1.1',
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440009',
      stepNumber: 85,
      name: 'Rework Decision',
      description: 'Determine if part requires rework or is acceptable',
      stepType: 'DECISION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440003',
      operationTime: 120,
      positionX: 650,
      positionY: 400,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440010',
      stepNumber: 90,
      name: 'Surface Treatment',
      description: 'Apply phosphate coating and primer',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440002',
      operationTime: 1200,
      setupTime: 300,
      positionX: 900,
      positionY: 250,
      qualityRequirements: 'Coating thickness 10-25μm, no bare spots',
      safetyRequirements: 'Chemical handling PPE, ventilation',
    },
    // Packaging & Shipping Swimlane
    {
      id: '650e8400-e29b-41d4-a716-446655440011',
      stepNumber: 100,
      name: 'Final Packaging',
      description: 'Package parts for shipment to customer',
      stepType: 'OPERATION',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440004',
      operationTime: 240,
      positionX: 150,
      positionY: 550,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440012',
      stepNumber: 110,
      name: 'Shipping',
      description: 'Load and ship to customer facility',
      stepType: 'TRANSPORT',
      swimlaneId: '550e8400-e29b-41d4-a716-446655440004',
      operationTime: 180,
      positionX: 400,
      positionY: 550,
    },
  ]

  for (const step of steps) {
    await prisma.processStep.create({
      data: {
        ...step,
        processFlowId: processFlow.id,
      },
    })
  }

  console.log('✅ Process Steps created')

  // Create step connections (process flow)
  const connections = [
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440001',
      targetStepId: '650e8400-e29b-41d4-a716-446655440002',
      label: 'Material OK',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440002',
      targetStepId: '650e8400-e29b-41d4-a716-446655440003',
      label: 'To Cutting',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440003',
      targetStepId: '650e8400-e29b-41d4-a716-446655440004',
      label: 'Blanks Cut',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440004',
      targetStepId: '650e8400-e29b-41d4-a716-446655440005',
      label: 'Machined',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440005',
      targetStepId: '650e8400-e29b-41d4-a716-446655440006',
      label: 'Formed',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440006',
      targetStepId: '650e8400-e29b-41d4-a716-446655440007',
      label: 'Welded',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440007',
      targetStepId: '650e8400-e29b-41d4-a716-446655440008',
      label: 'Dimensions OK',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440008',
      targetStepId: '650e8400-e29b-41d4-a716-446655440009',
      label: 'Check Results',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440009',
      targetStepId: '650e8400-e29b-41d4-a716-446655440010',
      label: 'Accept',
      connectionType: 'conditional',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440009',
      targetStepId: '650e8400-e29b-41d4-a716-446655440006',
      label: 'Rework',
      connectionType: 'conditional',
      strokeColor: '#ff9800',
      strokeStyle: 'dashed',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440010',
      targetStepId: '650e8400-e29b-41d4-a716-446655440011',
      label: 'Coated',
    },
    {
      sourceStepId: '650e8400-e29b-41d4-a716-446655440011',
      targetStepId: '650e8400-e29b-41d4-a716-446655440012',
      label: 'Packaged',
    },
  ]

  for (const connection of connections) {
    await prisma.stepConnection.create({
      data: {
        ...connection,
        processFlowId: processFlow.id,
      },
    })
  }

  console.log('✅ Step Connections created')

  // Create resources
  const resources = [
    {
      name: 'CNC Plasma Cutter',
      resourceType: 'MACHINE',
      description: 'High-precision CNC plasma cutting system',
      specification: 'Hypertherm HPR400XD with CNC control',
      manufacturer: 'Hypertherm',
      model: 'HPR400XD',
      location: 'Bay 1',
      hourlyRate: 85.00,
    },
    {
      name: '5-Axis CNC Mill',
      resourceType: 'MACHINE',
      description: '5-axis CNC milling center',
      specification: 'Haas UMC-750SS with 40-tool ATC',
      manufacturer: 'Haas',
      model: 'UMC-750SS',
      location: 'Bay 2',
      hourlyRate: 120.00,
    },
    {
      name: 'Press Brake 300T',
      resourceType: 'MACHINE',
      description: '300-ton hydraulic press brake',
      specification: 'Amada HFE 3013 with 3D-graphic control',
      manufacturer: 'Amada',
      model: 'HFE 3013',
      location: 'Bay 3',
      hourlyRate: 95.00,
    },
    {
      name: 'Welding Station',
      resourceType: 'MACHINE',
      description: 'Automated MIG welding cell',
      specification: 'Lincoln PowerWave S500 with robotic arm',
      manufacturer: 'Lincoln Electric',
      model: 'PowerWave S500',
      location: 'Bay 4',
      hourlyRate: 75.00,
    },
    {
      name: 'CMM',
      resourceType: 'MACHINE',
      description: 'Coordinate measuring machine',
      specification: 'Zeiss Contura G2 with VAST probe system',
      manufacturer: 'Zeiss',
      model: 'Contura G2',
      location: 'Quality Lab',
      hourlyRate: 65.00,
    },
    {
      name: 'Certified Welder',
      resourceType: 'OPERATOR',
      description: 'AWS D1.1 certified welder',
      specification: 'Level II certification, 10+ years experience',
      hourlyRate: 45.00,
    },
    {
      name: 'CNC Operator',
      resourceType: 'OPERATOR',
      description: 'Skilled CNC machine operator',
      specification: 'Level III certification, CNC programming',
      hourlyRate: 38.00,
    },
    {
      name: 'Quality Inspector',
      resourceType: 'OPERATOR',
      description: 'ASQ certified quality inspector',
      specification: 'ASQ CQI certification, CMM programming',
      hourlyRate: 42.00,
    },
  ] as const

  const createdResources = []
  for (const resource of resources) {
    const createdResource = await prisma.resource.create({
      data: resource,
    })
    createdResources.push(createdResource)
  }

  console.log('✅ Resources created')

  // Assign resources to process steps
  const resourceAssignments = [
    // Plasma Cutting
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440003',
      resourceId: createdResources.find(r => r.name === 'CNC Plasma Cutter')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
      setupRequired: true,
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440003',
      resourceId: createdResources.find(r => r.name === 'CNC Operator')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
    // CNC Machining
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440004',
      resourceId: createdResources.find(r => r.name === '5-Axis CNC Mill')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
      setupRequired: true,
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440004',
      resourceId: createdResources.find(r => r.name === 'CNC Operator')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
    // Forming
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440005',
      resourceId: createdResources.find(r => r.name === 'Press Brake 300T')!.id,
      quantityRequired: 1,
      utilizationPercentage: 80,
      setupRequired: true,
    },
    // Welding
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440006',
      resourceId: createdResources.find(r => r.name === 'Welding Station')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440006',
      resourceId: createdResources.find(r => r.name === 'Certified Welder')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
    // Quality Inspection
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440007',
      resourceId: createdResources.find(r => r.name === 'CMM')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440007',
      resourceId: createdResources.find(r => r.name === 'Quality Inspector')!.id,
      quantityRequired: 1,
      utilizationPercentage: 100,
    },
  ]

  for (const assignment of resourceAssignments) {
    await prisma.processStepResource.create({
      data: assignment,
    })
  }

  console.log('✅ Resource assignments created')

  // Create control points
  const controlPoints = [
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440001',
      name: 'Material Certification Check',
      controlType: 'CRITICAL',
      specification: 'Verify material meets AISI 4140 specification',
      measurementMethod: 'Certificate review and material test',
      inspectionFrequency: 'Every lot',
      responsibleRole: 'Material Inspector',
      reactionPlan: 'Reject non-conforming material, return to supplier',
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440003',
      name: 'Cut Dimension Check',
      controlType: 'MAJOR',
      specification: 'Overall dimensions per drawing FB-DWG-2024-001-C',
      measurementMethod: 'Caliper measurement',
      inspectionFrequency: 'First piece and every 10th piece',
      upperSpecLimit: 150.5,
      lowerSpecLimit: 149.5,
      targetValue: 150.0,
      unit: 'mm',
      responsibleRole: 'Machine Operator',
      reactionPlan: 'Adjust cutting parameters if out of spec',
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440004',
      name: 'Hole Diameter Control',
      controlType: 'CRITICAL',
      specification: 'Mounting hole diameter 12.0 +0.2/-0.0 mm',
      measurementMethod: 'Go/No-Go gauge and pin gauge',
      inspectionFrequency: 'Every piece',
      upperSpecLimit: 12.2,
      lowerSpecLimit: 12.0,
      targetValue: 12.1,
      unit: 'mm',
      responsibleRole: 'CNC Operator',
      reactionPlan: 'Stop production, adjust tooling, rework if possible',
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440005',
      name: 'Bend Angle Control',
      controlType: 'MAJOR',
      specification: 'Bend angle 90° ±1°',
      measurementMethod: 'Digital angle gauge',
      inspectionFrequency: 'First piece and after tool change',
      upperSpecLimit: 91.0,
      lowerSpecLimit: 89.0,
      targetValue: 90.0,
      unit: 'degrees',
      responsibleRole: 'Press Operator',
      reactionPlan: 'Adjust press brake angle settings',
    },
    {
      processStepId: '650e8400-e29b-41d4-a716-446655440006',
      name: 'Weld Quality Control',
      controlType: 'CRITICAL',
      specification: 'Full penetration welds per AWS D1.1',
      measurementMethod: 'Visual inspection and dye penetrant test',
      inspectionFrequency: 'Every piece',
      responsibleRole: 'Certified Welder',
      reactionPlan: 'Repair weld if acceptable, scrap if not repairable',
    },
  ] as const

  for (const controlPoint of controlPoints) {
    await prisma.controlPoint.create({
      data: controlPoint,
    })
  }

  console.log('✅ Control Points created')

  // Create process approvals
  await prisma.processApproval.createMany({
    data: [
      {
        processFlowId: processFlow.id,
        approverRole: 'Process Engineer',
        approverUserId: processEngineer.id,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        comments: 'Process reviewed and approved for production',
        approvalLevel: 1,
      },
      {
        processFlowId: processFlow.id,
        approverRole: 'Quality Manager',
        approverUserId: qualityManager.id,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        comments: 'Quality requirements verified and approved',
        approvalLevel: 2,
      },
    ],
  })

  console.log('✅ Process Approvals created')
  console.log('🎉 Process Flow seeding completed successfully!')

  return {
    project,
    part,
    processFlow,
    users: { adminUser, processEngineer, qualityManager },
    swimlanes,
  }
}

export default seedProcessFlowData

// Run seeding if this file is executed directly
if (require.main === module) {
  seedProcessFlowData()
    .catch((e) => {
      console.error('❌ Error during process flow seeding:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
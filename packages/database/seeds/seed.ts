import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create sample users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@atek-metals.com' },
    update: {},
    create: {
      email: 'admin@atek-metals.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: 'Quality Assurance',
      isActive: true,
    },
  })

  const qualityManager = await prisma.user.upsert({
    where: { email: 'quality.manager@atek-metals.com' },
    update: {},
    create: {
      email: 'quality.manager@atek-metals.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'QUALITY_MANAGER',
      department: 'Quality Assurance',
      isActive: true,
    },
  })

  const processEngineer = await prisma.user.upsert({
    where: { email: 'process.engineer@atek-metals.com' },
    update: {},
    create: {
      email: 'process.engineer@atek-metals.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'PROCESS_ENGINEER',
      department: 'Manufacturing Engineering',
      isActive: true,
    },
  })

  console.log('✅ Users created')

  // Create sample part
  const samplePart = await prisma.part.upsert({
    where: { partNumber: 'ATEK-2024-001' },
    update: {},
    create: {
      partNumber: 'ATEK-2024-001',
      name: 'Automotive Bracket Assembly',
      description: 'High-strength steel bracket for automotive suspension system',
      customer: 'Ford Motor Company',
      revision: 'C',
      specifications: {
        create: [
          {
            characteristic: 'Overall Length',
            specification: '150.0 ± 0.5',
            tolerance: '±0.5',
            unit: 'mm',
          },
          {
            characteristic: 'Material Thickness',
            specification: '3.0 ± 0.1',
            tolerance: '±0.1',
            unit: 'mm',
          },
          {
            characteristic: 'Hole Diameter',
            specification: '12.0 +0.2/-0.0',
            tolerance: '+0.2/-0.0',
            unit: 'mm',
          },
        ],
      },
    },
  })

  console.log('✅ Parts created')

  // Create sample process flow
  const processFlow = await prisma.processFlow.create({
    data: {
      name: 'Automotive Bracket Manufacturing Process',
      description: 'Complete manufacturing process for automotive bracket assembly',
      version: '1.0',
      status: 'ACTIVE',
      priority: 'HIGH',
      productLine: 'Automotive Components',
      partId: samplePart.id,
      createdById: processEngineer.id,
      updatedById: processEngineer.id,
      steps: {
        create: [
          {
            stepNumber: 1,
            name: 'Material Preparation',
            description: 'Cut steel sheet to required dimensions',
            stepType: 'OPERATION',
            duration: 15,
            positionX: 100,
            positionY: 100,
            resources: {
              create: [
                {
                  type: 'MACHINE',
                  name: 'CNC Plasma Cutter',
                  specification: 'Hypertherm HPR400XD',
                },
                {
                  type: 'MATERIAL',
                  name: 'Steel Sheet',
                  specification: 'AISI 1020 - 3mm thickness',
                },
              ],
            },
            controlPoints: {
              create: [
                {
                  name: 'Material Thickness Check',
                  type: 'CRITICAL',
                  specification: '3.0 ± 0.1 mm',
                  method: 'Micrometer measurement',
                  frequency: 'Every piece',
                  responsibility: 'Operator',
                },
              ],
            },
          },
          {
            stepNumber: 2,
            name: 'Forming Operation',
            description: 'Form bracket shape using press brake',
            stepType: 'OPERATION',
            duration: 30,
            positionX: 300,
            positionY: 100,
            resources: {
              create: [
                {
                  type: 'MACHINE',
                  name: 'Press Brake',
                  specification: 'Amada HFE 1303S',
                },
                {
                  type: 'TOOL',
                  name: 'Forming Dies',
                  specification: 'Custom bracket forming dies',
                },
              ],
            },
          },
          {
            stepNumber: 3,
            name: 'Quality Inspection',
            description: 'Dimensional inspection and surface quality check',
            stepType: 'INSPECTION',
            duration: 10,
            positionX: 500,
            positionY: 100,
            controlPoints: {
              create: [
                {
                  name: 'Dimensional Check',
                  type: 'CRITICAL',
                  specification: 'Per drawing ATEK-2024-001',
                  method: 'CMM measurement',
                  frequency: 'Every 5th piece',
                  responsibility: 'Quality Inspector',
                },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('✅ Process flow created')

  // Create sample FMEA
  const fmea = await prisma.fMEA.create({
    data: {
      name: 'Automotive Bracket PFMEA',
      description: 'Process FMEA for automotive bracket manufacturing',
      type: 'PROCESS',
      methodology: 'AIAG_VDA',
      version: '1.0',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      productLine: 'Automotive Components',
      part: 'ATEK-2024-001',
      process: 'Bracket Manufacturing',
      createdById: processEngineer.id,
      updatedById: processEngineer.id,
      team: {
        create: [
          {
            userId: processEngineer.id,
            role: 'TEAM_LEADER',
            responsibility: 'FMEA coordination and process expertise',
          },
          {
            userId: qualityManager.id,
            role: 'QUALITY_ENGINEER',
            responsibility: 'Quality systems and controls',
          },
        ],
      },
      failureModes: {
        create: [
          {
            item: 'Material Cutting',
            function: 'Cut steel sheet to required dimensions',
            functionalRequirement: 'Accurate dimensional cutting per specifications',
            failureMode: 'Incorrect dimensions',
            effectsLocal: 'Part does not fit in forming dies',
            effectsHigher: 'Rework required, production delay',
            effectsEnd: 'Customer delivery delay',
            cause: 'Machine setup error, worn cutting tools',
            preventionControl: 'Setup verification, tool maintenance',
            detectionControl: 'First piece inspection',
            preventionType: 'PROCESS',
            detectionType: 'INSPECTION',
            severity: 7,
            occurrence: 4,
            detection: 3,
            rpn: 84,
            actionPriority: 'M',
            riskLevel: 'MODERATE',
            riskCategory: 'OPERATIONAL',
            acceptability: 'ACCEPTABLE_WITH_ACTIONS',
            actions: {
              create: [
                {
                  description: 'Implement automated setup verification system',
                  responsibility: 'Manufacturing Engineering',
                  targetDate: new Date('2024-06-01'),
                  status: 'PLANNED',
                },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('✅ FMEA created')

  // Create sample control plan
  const controlPlan = await prisma.controlPlan.create({
    data: {
      name: 'Automotive Bracket Control Plan',
      description: 'Production control plan for automotive bracket manufacturing',
      version: '1.0',
      status: 'APPROVED',
      priority: 'HIGH',
      productLine: 'Automotive Components',
      part: 'ATEK-2024-001',
      process: 'Bracket Manufacturing',
      planType: 'PRODUCTION',
      effectiveDate: new Date(),
      reviewDate: new Date('2024-12-01'),
      createdById: qualityManager.id,
      updatedById: qualityManager.id,
      controlPoints: {
        create: [
          {
            sequenceNumber: 10,
            processStep: 'Material Cutting',
            characteristic: 'Overall Length',
            nominal: 150.0,
            lowerLimit: 149.5,
            upperLimit: 150.5,
            unit: 'mm',
            specType: 'VARIABLE',
            toleranceType: 'BILATERAL',
            controlMethodType: 'MEASUREMENT',
            controlMethodDescription: 'Caliper measurement',
            equipment: 'Digital Caliper ±0.01mm',
            sampleSize: 1,
            frequency: 'Every piece',
            frequencyType: 'CONTINUOUS',
            statisticalMethodType: 'X_MR',
            upperControlLimit: 150.3,
            lowerControlLimit: 149.7,
            target: 150.0,
            cpkRequirement: 1.33,
            outOfSpecAction: 'Stop production, adjust machine',
            containmentAction: 'Sort and inspect all parts since last good part',
            correctionAction: 'Recalibrate cutting machine',
            responsibleRole: 'Machine Operator',
          },
          {
            sequenceNumber: 20,
            processStep: 'Forming Operation',
            characteristic: 'Bend Angle',
            nominal: 90.0,
            lowerLimit: 89.0,
            upperLimit: 91.0,
            unit: 'degrees',
            specType: 'VARIABLE',
            controlMethodType: 'MEASUREMENT',
            controlMethodDescription: 'Angle gauge measurement',
            equipment: 'Digital Angle Gauge',
            sampleSize: 1,
            frequency: 'Every 5th piece',
            frequencyType: 'PERIODIC',
            outOfSpecAction: 'Adjust press brake settings',
            containmentAction: 'Check last 5 pieces',
            correctionAction: 'Recalibrate press brake angle',
            responsibleRole: 'Press Brake Operator',
          },
        ],
      },
    },
  })

  console.log('✅ Control plan created')

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
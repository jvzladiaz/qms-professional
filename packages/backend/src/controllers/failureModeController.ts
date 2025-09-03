import { Request, Response } from 'express'
import { PrismaClient } from '../generated/client'
import FmeaCalculationService from '../services/fmeaCalculationService'
import { ApiResponse } from '../types/api'
import logger from '../utils/logger'

const prisma = new PrismaClient()
const fmeaCalcService = new FmeaCalculationService(prisma)

export interface CreateFailureModeRequest {
  fmeaId: string
  itemFunction: string
  failureMode: string
  sequenceNumber?: number
  severityRating: number
  severityJustification?: string
  primaryProcessStepId?: string
  failureClassification?: string
  specialCharacteristic?: boolean
}

export interface UpdateFailureModeRequest extends Partial<Omit<CreateFailureModeRequest, 'fmeaId'>> {}

export interface CreateFailureEffectRequest {
  failureModeId: string
  effectDescription: string
  effectType?: string
  customerImpact?: string
  safetyImpact?: boolean
  regulatoryImpact?: boolean
  warrantyImpact?: boolean
  sequenceNumber?: number
}

export interface CreateFailureCauseRequest {
  failureModeId: string
  causeDescription: string
  causeCategory?: string
  occurrenceRating: number
  occurrenceJustification?: string
  isRootCause?: boolean
  causeMechanism?: string
  sequenceNumber?: number
}

export interface CreateFailureControlRequest {
  failureCauseId: string
  controlDescription: string
  controlType: 'PREVENTION' | 'DETECTION'
  controlMethod?: string
  detectionRating: number
  detectionJustification?: string
  validationMethod?: string
  responsibility?: string
  frequency?: string
  sampleSize?: number
  processStepId?: string
  controlPointId?: string
  sequenceNumber?: number
}

/**
 * Get all failure modes for an FMEA
 */
export const getFailureModes = async (req: Request<{ fmeaId: string }>, res: Response) => {
  try {
    const { fmeaId } = req.params

    const failureModes = await prisma.failureMode.findMany({
      where: { fmeaId },
      include: {
        effects: {
          orderBy: { sequenceNumber: 'asc' }
        },
        causes: {
          include: {
            controls: {
              orderBy: { sequenceNumber: 'asc' }
            }
          },
          orderBy: { sequenceNumber: 'asc' }
        },
        actionItems: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        processStepLinks: {
          include: {
            processStep: {
              select: {
                id: true,
                stepNumber: true,
                name: true,
                stepType: true
              }
            }
          }
        },
        primaryProcessStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        }
      },
      orderBy: { sequenceNumber: 'asc' }
    })

    // Calculate RPN for each failure mode
    const failureModesWithRpn = await Promise.all(
      failureModes.map(async (fm) => {
        const rpnCalc = await fmeaCalcService.calculateRpn(fm.id)
        const rpnAnalysis = await fmeaCalcService.analyzeRpn(fm.id, fmeaId)
        
        return {
          ...fm,
          currentRpn: rpnCalc.rpn,
          riskLevel: rpnAnalysis.riskLevel,
          requiresAction: rpnAnalysis.requiresAction,
          rpnBreakdown: {
            severity: rpnCalc.severity,
            occurrence: rpnCalc.occurrence,
            detection: rpnCalc.detection
          }
        }
      })
    )

    const response: ApiResponse<typeof failureModesWithRpn> = {
      success: true,
      data: failureModesWithRpn
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching failure modes:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_FAILURE_MODES_ERROR',
        message: 'Failed to fetch failure modes'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Get a single failure mode by ID
 */
export const getFailureModeById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const failureMode = await prisma.failureMode.findUnique({
      where: { id },
      include: {
        fmea: {
          select: {
            id: true,
            fmeaNumber: true,
            title: true,
            severityThreshold: true,
            occurrenceThreshold: true,
            detectionThreshold: true,
            rpnThreshold: true
          }
        },
        effects: {
          orderBy: { sequenceNumber: 'asc' }
        },
        causes: {
          include: {
            controls: {
              include: {
                processStep: {
                  select: {
                    id: true,
                    stepNumber: true,
                    name: true,
                    stepType: true
                  }
                },
                controlPoint: {
                  select: {
                    id: true,
                    name: true,
                    controlType: true,
                    specification: true
                  }
                }
              },
              orderBy: { sequenceNumber: 'asc' }
            }
          },
          orderBy: { sequenceNumber: 'asc' }
        },
        actionItems: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            verifiedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        processStepLinks: {
          include: {
            processStep: {
              select: {
                id: true,
                stepNumber: true,
                name: true,
                stepType: true,
                description: true
              }
            }
          }
        },
        primaryProcessStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true,
            description: true
          }
        },
        rpnCalculations: {
          include: {
            calculatedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { calculationDate: 'desc' },
          take: 10
        }
      }
    })

    if (!failureMode) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_MODE_NOT_FOUND', message: 'Failure mode not found' }
      })
    }

    // Calculate current RPN
    const rpnCalc = await fmeaCalcService.calculateRpn(failureMode.id)
    const rpnAnalysis = await fmeaCalcService.analyzeRpn(failureMode.id, failureMode.fmeaId)

    const failureModeWithRpn = {
      ...failureMode,
      currentRpn: rpnCalc.rpn,
      riskLevel: rpnAnalysis.riskLevel,
      requiresAction: rpnAnalysis.requiresAction,
      recommendations: rpnAnalysis.recommendations,
      rpnBreakdown: {
        severity: rpnCalc.severity,
        occurrence: rpnCalc.occurrence,
        detection: rpnCalc.detection
      }
    }

    const response: ApiResponse<typeof failureModeWithRpn> = {
      success: true,
      data: failureModeWithRpn
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching failure mode:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_FAILURE_MODE_ERROR',
        message: 'Failed to fetch failure mode'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create a new failure mode
 */
export const createFailureMode = async (req: Request<{}, {}, CreateFailureModeRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      fmeaId,
      itemFunction,
      failureMode,
      sequenceNumber,
      severityRating,
      severityJustification,
      primaryProcessStepId,
      failureClassification = 'PROCESS',
      specialCharacteristic = false
    } = req.body

    // Validate required fields
    if (!fmeaId || !itemFunction || !failureMode || !severityRating) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'FMEA ID, item function, failure mode, and severity rating are required'
        }
      })
    }

    // Validate severity rating
    if (severityRating < 1 || severityRating > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEVERITY_RATING',
          message: 'Severity rating must be between 1 and 10'
        }
      })
    }

    // Verify FMEA exists
    const fmea = await prisma.fmea.findUnique({
      where: { id: fmeaId }
    })

    if (!fmea) {
      return res.status(404).json({
        success: false,
        error: { code: 'FMEA_NOT_FOUND', message: 'FMEA not found' }
      })
    }

    // Get next sequence number if not provided
    let nextSequenceNumber = sequenceNumber
    if (!nextSequenceNumber) {
      const lastFailureMode = await prisma.failureMode.findFirst({
        where: { fmeaId },
        orderBy: { sequenceNumber: 'desc' }
      })
      nextSequenceNumber = lastFailureMode ? lastFailureMode.sequenceNumber + 1 : 1
    }

    const newFailureMode = await prisma.failureMode.create({
      data: {
        fmeaId,
        itemFunction,
        failureMode,
        sequenceNumber: nextSequenceNumber,
        severityRating,
        severityJustification,
        primaryProcessStepId,
        failureClassification,
        specialCharacteristic
      },
      include: {
        primaryProcessStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        }
      }
    })

    // Log initial RPN calculation
    const rpnCalc = await fmeaCalcService.calculateRpn(newFailureMode.id)
    await fmeaCalcService.logRpnCalculation(
      newFailureMode.id,
      rpnCalc,
      userId,
      'Initial failure mode creation'
    )

    const response: ApiResponse<typeof newFailureMode> = {
      success: true,
      data: newFailureMode
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating failure mode:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_FAILURE_MODE_ERROR',
        message: 'Failed to create failure mode'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Update a failure mode
 */
export const updateFailureMode = async (req: Request<{ id: string }, {}, UpdateFailureModeRequest>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Check if failure mode exists
    const existingFailureMode = await prisma.failureMode.findUnique({
      where: { id }
    })

    if (!existingFailureMode) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_MODE_NOT_FOUND', message: 'Failure mode not found' }
      })
    }

    // Validate severity rating if provided
    if (req.body.severityRating && (req.body.severityRating < 1 || req.body.severityRating > 10)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEVERITY_RATING',
          message: 'Severity rating must be between 1 and 10'
        }
      })
    }

    const updatedFailureMode = await prisma.failureMode.update({
      where: { id },
      data: req.body,
      include: {
        primaryProcessStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        }
      }
    })

    // Log RPN calculation if severity changed
    if (req.body.severityRating && req.body.severityRating !== existingFailureMode.severityRating) {
      const rpnCalc = await fmeaCalcService.calculateRpn(updatedFailureMode.id)
      await fmeaCalcService.logRpnCalculation(
        updatedFailureMode.id,
        rpnCalc,
        userId,
        `Severity updated from ${existingFailureMode.severityRating} to ${req.body.severityRating}`
      )
    }

    const response: ApiResponse<typeof updatedFailureMode> = {
      success: true,
      data: updatedFailureMode
    }

    res.json(response)
  } catch (error) {
    logger.error('Error updating failure mode:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_FAILURE_MODE_ERROR',
        message: 'Failed to update failure mode'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Delete a failure mode
 */
export const deleteFailureMode = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    // Check if failure mode exists
    const existingFailureMode = await prisma.failureMode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            effects: true,
            causes: true,
            actionItems: true
          }
        }
      }
    })

    if (!existingFailureMode) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_MODE_NOT_FOUND', message: 'Failure mode not found' }
      })
    }

    // Delete failure mode (cascade will handle related records)
    await prisma.failureMode.delete({
      where: { id }
    })

    const response: ApiResponse<{ deleted: true }> = {
      success: true,
      data: { deleted: true }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error deleting failure mode:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_FAILURE_MODE_ERROR',
        message: 'Failed to delete failure mode'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create failure effect
 */
export const createFailureEffect = async (req: Request<{}, {}, CreateFailureEffectRequest>, res: Response) => {
  try {
    const {
      failureModeId,
      effectDescription,
      effectType = 'LOCAL',
      customerImpact,
      safetyImpact = false,
      regulatoryImpact = false,
      warrantyImpact = false,
      sequenceNumber
    } = req.body

    if (!failureModeId || !effectDescription) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Failure mode ID and effect description are required'
        }
      })
    }

    // Get next sequence number if not provided
    let nextSequenceNumber = sequenceNumber
    if (!nextSequenceNumber) {
      const lastEffect = await prisma.failureEffect.findFirst({
        where: { failureModeId },
        orderBy: { sequenceNumber: 'desc' }
      })
      nextSequenceNumber = lastEffect ? lastEffect.sequenceNumber + 1 : 1
    }

    const newEffect = await prisma.failureEffect.create({
      data: {
        failureModeId,
        effectDescription,
        effectType,
        customerImpact,
        safetyImpact,
        regulatoryImpact,
        warrantyImpact,
        sequenceNumber: nextSequenceNumber
      }
    })

    const response: ApiResponse<typeof newEffect> = {
      success: true,
      data: newEffect
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating failure effect:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_FAILURE_EFFECT_ERROR',
        message: 'Failed to create failure effect'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create failure cause
 */
export const createFailureCause = async (req: Request<{}, {}, CreateFailureCauseRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      failureModeId,
      causeDescription,
      causeCategory = 'OTHER',
      occurrenceRating,
      occurrenceJustification,
      isRootCause = false,
      causeMechanism,
      sequenceNumber
    } = req.body

    if (!failureModeId || !causeDescription || !occurrenceRating) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Failure mode ID, cause description, and occurrence rating are required'
        }
      })
    }

    // Validate occurrence rating
    if (occurrenceRating < 1 || occurrenceRating > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OCCURRENCE_RATING',
          message: 'Occurrence rating must be between 1 and 10'
        }
      })
    }

    // Get next sequence number if not provided
    let nextSequenceNumber = sequenceNumber
    if (!nextSequenceNumber) {
      const lastCause = await prisma.failureCause.findFirst({
        where: { failureModeId },
        orderBy: { sequenceNumber: 'desc' }
      })
      nextSequenceNumber = lastCause ? lastCause.sequenceNumber + 1 : 1
    }

    const newCause = await prisma.failureCause.create({
      data: {
        failureModeId,
        causeDescription,
        causeCategory,
        occurrenceRating,
        occurrenceJustification,
        isRootCause,
        causeMechanism,
        sequenceNumber: nextSequenceNumber
      }
    })

    // Log RPN calculation update
    const rpnCalc = await fmeaCalcService.calculateRpn(failureModeId)
    await fmeaCalcService.logRpnCalculation(
      failureModeId,
      rpnCalc,
      userId,
      `Cause added: ${causeDescription.substring(0, 50)}...`
    )

    const response: ApiResponse<typeof newCause> = {
      success: true,
      data: newCause
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating failure cause:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_FAILURE_CAUSE_ERROR',
        message: 'Failed to create failure cause'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Create failure control
 */
export const createFailureControl = async (req: Request<{}, {}, CreateFailureControlRequest>, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    const {
      failureCauseId,
      controlDescription,
      controlType,
      controlMethod,
      detectionRating,
      detectionJustification,
      validationMethod,
      responsibility,
      frequency,
      sampleSize,
      processStepId,
      controlPointId,
      sequenceNumber
    } = req.body

    if (!failureCauseId || !controlDescription || !controlType || !detectionRating) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Failure cause ID, control description, control type, and detection rating are required'
        }
      })
    }

    // Validate detection rating
    if (detectionRating < 1 || detectionRating > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DETECTION_RATING',
          message: 'Detection rating must be between 1 and 10'
        }
      })
    }

    // Get failure cause to access failure mode
    const failureCause = await prisma.failureCause.findUnique({
      where: { id: failureCauseId }
    })

    if (!failureCause) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_CAUSE_NOT_FOUND', message: 'Failure cause not found' }
      })
    }

    // Get next sequence number if not provided
    let nextSequenceNumber = sequenceNumber
    if (!nextSequenceNumber) {
      const lastControl = await prisma.failureControl.findFirst({
        where: { failureCauseId },
        orderBy: { sequenceNumber: 'desc' }
      })
      nextSequenceNumber = lastControl ? lastControl.sequenceNumber + 1 : 1
    }

    const newControl = await prisma.failureControl.create({
      data: {
        failureCauseId,
        controlDescription,
        controlType,
        controlMethod,
        detectionRating,
        detectionJustification,
        validationMethod,
        responsibility,
        frequency,
        sampleSize,
        processStepId,
        controlPointId,
        sequenceNumber: nextSequenceNumber
      },
      include: {
        processStep: {
          select: {
            id: true,
            stepNumber: true,
            name: true,
            stepType: true
          }
        },
        controlPoint: {
          select: {
            id: true,
            name: true,
            controlType: true,
            specification: true
          }
        }
      }
    })

    // Log RPN calculation update
    const rpnCalc = await fmeaCalcService.calculateRpn(failureCause.failureModeId)
    await fmeaCalcService.logRpnCalculation(
      failureCause.failureModeId,
      rpnCalc,
      userId,
      `${controlType} control added: ${controlDescription.substring(0, 50)}...`
    )

    const response: ApiResponse<typeof newControl> = {
      success: true,
      data: newControl
    }

    res.status(201).json(response)
  } catch (error) {
    logger.error('Error creating failure control:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_FAILURE_CONTROL_ERROR',
        message: 'Failed to create failure control'
      }
    }
    res.status(500).json(response)
  }
}

/**
 * Calculate RPN for failure mode
 */
export const calculateRpn = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
      })
    }

    // Get failure mode to verify it exists
    const failureMode = await prisma.failureMode.findUnique({
      where: { id }
    })

    if (!failureMode) {
      return res.status(404).json({
        success: false,
        error: { code: 'FAILURE_MODE_NOT_FOUND', message: 'Failure mode not found' }
      })
    }

    const rpnCalc = await fmeaCalcService.calculateRpn(id)
    const rpnAnalysis = await fmeaCalcService.analyzeRpn(id, failureMode.fmeaId)

    // Log the calculation
    await fmeaCalcService.logRpnCalculation(
      id,
      rpnCalc,
      userId,
      'Manual RPN calculation request'
    )

    const response: ApiResponse<{
      calculation: typeof rpnCalc
      analysis: typeof rpnAnalysis
    }> = {
      success: true,
      data: {
        calculation: rpnCalc,
        analysis: rpnAnalysis
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error calculating RPN:', error)
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'RPN_CALCULATION_ERROR',
        message: 'Failed to calculate RPN'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  getFailureModes,
  getFailureModeById,
  createFailureMode,
  updateFailureMode,
  deleteFailureMode,
  createFailureEffect,
  createFailureCause,
  createFailureControl,
  calculateRpn
}

Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastLoginAt: 'lastLoginAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  department: 'department',
  industry: 'industry',
  status: 'status',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  archivedAt: 'archivedAt',
  createdById: 'createdById'
};

exports.Prisma.ProcessFlowScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  sequence: 'sequence',
  input: 'input',
  output: 'output',
  resources: 'resources',
  controls: 'controls',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  projectId: 'projectId'
};

exports.Prisma.ProcessScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  sequence: 'sequence',
  processType: 'processType',
  input: 'input',
  output: 'output',
  resources: 'resources',
  controls: 'controls',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  processFlowId: 'processFlowId'
};

exports.Prisma.FmeaScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  fmeaType: 'fmeaType',
  status: 'status',
  version: 'version',
  approvalDate: 'approvalDate',
  nextReviewDate: 'nextReviewDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  projectId: 'projectId',
  processFlowId: 'processFlowId',
  createdById: 'createdById'
};

exports.Prisma.FailureModeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  potential_failure: 'potential_failure',
  potential_effects: 'potential_effects',
  severity: 'severity',
  potential_causes: 'potential_causes',
  occurrence: 'occurrence',
  current_controls: 'current_controls',
  detection: 'detection',
  rpn: 'rpn',
  recommended_actions: 'recommended_actions',
  responsibility: 'responsibility',
  target_date: 'target_date',
  actions_taken: 'actions_taken',
  revised_severity: 'revised_severity',
  revised_occurrence: 'revised_occurrence',
  revised_detection: 'revised_detection',
  revised_rpn: 'revised_rpn',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  fmeaId: 'fmeaId',
  processId: 'processId'
};

exports.Prisma.ControlPlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  process_step: 'process_step',
  control_method: 'control_method',
  specification: 'specification',
  measurement_technique: 'measurement_technique',
  sample_size: 'sample_size',
  frequency: 'frequency',
  control_method_type: 'control_method_type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  projectId: 'projectId',
  fmeaId: 'fmeaId'
};

exports.Prisma.ActionItemScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  dueDate: 'dueDate',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  projectId: 'projectId',
  failureModeId: 'failureModeId',
  assigneeId: 'assigneeId',
  createdById: 'createdById'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  authorId: 'authorId',
  projectId: 'projectId',
  fmeaId: 'fmeaId',
  failureModeId: 'failureModeId',
  actionItemId: 'actionItemId',
  parentId: 'parentId'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  message: 'message',
  type: 'type',
  read: 'read',
  createdAt: 'createdAt',
  userId: 'userId',
  projectId: 'projectId',
  actionItemId: 'actionItemId'
};

exports.Prisma.ChangeEventScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  changeType: 'changeType',
  oldValues: 'oldValues',
  newValues: 'newValues',
  description: 'description',
  reason: 'reason',
  createdAt: 'createdAt',
  createdById: 'createdById',
  projectId: 'projectId'
};

exports.Prisma.ComplianceReportScalarFieldEnum = {
  id: 'id',
  standard: 'standard',
  status: 'status',
  score: 'score',
  findings: 'findings',
  recommendations: 'recommendations',
  assessedAt: 'assessedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  projectId: 'projectId',
  assessedById: 'assessedById'
};

exports.Prisma.RiskAnalyticsScalarFieldEnum = {
  id: 'id',
  period: 'period',
  totalRpn: 'totalRpn',
  avgSeverity: 'avgSeverity',
  avgOccurrence: 'avgOccurrence',
  avgDetection: 'avgDetection',
  highRiskCount: 'highRiskCount',
  trendData: 'trendData',
  createdAt: 'createdAt',
  projectId: 'projectId',
  fmeaId: 'fmeaId'
};

exports.Prisma.AuditTrailScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  userId: 'userId'
};

exports.Prisma.ProjectMemberScalarFieldEnum = {
  id: 'id',
  role: 'role',
  joinedAt: 'joinedAt',
  userId: 'userId',
  projectId: 'projectId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
  VIEWER: 'VIEWER'
};

exports.Industry = exports.$Enums.Industry = {
  AUTOMOTIVE: 'AUTOMOTIVE',
  AEROSPACE: 'AEROSPACE',
  MEDICAL: 'MEDICAL',
  MANUFACTURING: 'MANUFACTURING',
  OTHER: 'OTHER'
};

exports.ProjectStatus = exports.$Enums.ProjectStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  ON_HOLD: 'ON_HOLD'
};

exports.FmeaType = exports.$Enums.FmeaType = {
  PROCESS: 'PROCESS',
  DESIGN: 'DESIGN',
  SYSTEM: 'SYSTEM',
  SERVICE: 'SERVICE'
};

exports.FmeaStatus = exports.$Enums.FmeaStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED'
};

exports.ControlMethodType = exports.$Enums.ControlMethodType = {
  PREVENTION: 'PREVENTION',
  DETECTION: 'DETECTION',
  REACTION: 'REACTION'
};

exports.Priority = exports.$Enums.Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.ActionStatus = exports.$Enums.ActionStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  REMINDER: 'REMINDER'
};

exports.ChangeType = exports.$Enums.ChangeType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE'
};

exports.ComplianceStandard = exports.$Enums.ComplianceStandard = {
  IATF_16949: 'IATF_16949',
  ISO_9001: 'ISO_9001',
  AS9100: 'AS9100',
  ISO_13485: 'ISO_13485',
  CUSTOM: 'CUSTOM'
};

exports.ComplianceStatus = exports.$Enums.ComplianceStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  NEEDS_REVIEW: 'NEEDS_REVIEW'
};

exports.ProjectRole = exports.$Enums.ProjectRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

exports.Prisma.ModelName = {
  User: 'User',
  Project: 'Project',
  ProcessFlow: 'ProcessFlow',
  Process: 'Process',
  Fmea: 'Fmea',
  FailureMode: 'FailureMode',
  ControlPlan: 'ControlPlan',
  ActionItem: 'ActionItem',
  Comment: 'Comment',
  Notification: 'Notification',
  ChangeEvent: 'ChangeEvent',
  ComplianceReport: 'ComplianceReport',
  RiskAnalytics: 'RiskAnalytics',
  AuditTrail: 'AuditTrail',
  ProjectMember: 'ProjectMember'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

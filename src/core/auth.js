const { forbidden } = require('./errors');

const roles = Object.freeze({
  PUBLIC: 'PUBLIC',
  DONOR: 'DONOR',
  NGO: 'NGO',
  FIELD: 'FIELD',
  GOVT: 'GOVT',
  SYSTEM: 'SYSTEM'
});

function actorFromRequest(req) {
  return {
    id: req.headers['x-actor-id'] || 'anonymous',
    role: String(req.headers['x-role'] || roles.PUBLIC).toUpperCase(),
    // In production this comes only from a verified Cognito JWT claim.
    organizationId: req.headers['x-org-id'] || null
  };
}

function requireRole(actor, allowed) {
  if (!allowed.includes(actor.role)) {
    throw forbidden(`This action requires one of: ${allowed.join(', ')}.`);
  }
}

function requireOrganization(actor, organizationId) {
  if (actor.role !== roles.GOVT && actor.role !== roles.SYSTEM && actor.organizationId !== organizationId) {
    throw forbidden('Cross-organization access is denied.');
  }
}

module.exports = { roles, actorFromRequest, requireRole, requireOrganization };

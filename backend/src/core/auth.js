const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { forbidden, badRequest } = require('./errors');

const roles = Object.freeze({
  PUBLIC: 'PUBLIC',
  DONOR: 'DONOR',
  NGO: 'NGO',
  VENDOR: 'VENDOR',
  FIELD: 'FIELD',
  GOVT: 'GOVT',
  SYSTEM: 'SYSTEM',
});

let verifier = null;

function initVerifier(config) {
  if (!verifier && config.COGNITO_USER_POOL_ID && config.COGNITO_CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: config.COGNITO_USER_POOL_ID,
      clientId: config.COGNITO_CLIENT_ID,
      tokenUse: 'access',
    });
  }
  return verifier;
}

function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

async function verifyToken(token, config) {
  const v = initVerifier(config);
  if (!v) return null;
  try {
    return await v.verify(token);
  } catch (err) {
    throw badRequest('Invalid or expired token');
  }
}

function mapClaimsToActor(claims) {
  const role = claims['cognito:groups']?.[0] || roles.PUBLIC;
  return {
    id: claims.sub || claims['cognito:username'] || 'unknown',
    role: role.toUpperCase(),
    organizationId: claims['custom:orgId'] || claims['custom:organizationId'] || null,
    email: claims.email || null,
    token: claims,
  };
}

async function actorFromRequest(req, config) {
  const token = extractToken(req);

  if (token) {
    const claims = await verifyToken(token, config);
    if (claims) {
      return mapClaimsToActor(claims);
    }
  }

  if (config.FEATURE_DEMO_ROLE_HEADERS) {
    const role = req.headers['x-role'] || req.headers['X-Role'] || roles.PUBLIC;
    const actorId = req.headers['x-actor-id'] || req.headers['X-Actor-Id'] || 'anonymous';
    const orgId = req.headers['x-org-id'] || req.headers['X-Org-Id'] || null;

    return {
      id: actorId,
      role: String(role).toUpperCase(),
      organizationId: orgId,
    };
  }

  return {
    id: 'anonymous',
    role: roles.PUBLIC,
    organizationId: null,
  };
}

function requireRole(actor, allowed) {
  if (!allowed.includes(actor.role)) {
    throw forbidden(`This action requires one of: ${allowed.join(', ')}.`);
  }
}

function requireOrganization(actor, organizationId) {
  if (
    actor.role !== roles.GOVT &&
    actor.role !== roles.SYSTEM &&
    actor.organizationId !== organizationId
  ) {
    throw forbidden('Cross-organization access is denied.');
  }
}

module.exports = {
  roles,
  actorFromRequest,
  requireRole,
  requireOrganization,
  initVerifier,
  verifyToken,
};

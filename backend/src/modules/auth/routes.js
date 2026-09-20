const { withValidation } = require('../../core/validation');
const { registerSchema, loginSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema, resendVerificationSchema, inviteSchema } = require('./validation');
const { roles } = require('../../core/auth');

const AUTHENTICATED = [roles.DONOR, roles.NGO, roles.VENDOR, roles.FIELD, roles.GOVT, roles.SYSTEM];

function createAuthRoutes(router, auth, { withRole } = {}) {
  if (!withRole) {
    throw new Error('createAuthRoutes requires { withRole } from the app composer');
  }
  router.add('POST', '/api/v1/auth/register', withValidation(registerSchema, 'body', async ({ body, actor }) => {
    const result = await auth.registerUser(body, actor);
    return { status: 201, body: result };
  }));

  router.add('POST', '/api/v1/auth/login', withValidation(loginSchema, 'body', async ({ body }) => {
    const result = await auth.loginUser(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/verify-email', withValidation(verifyEmailSchema, 'body', async ({ body }) => {
    const result = await auth.verifyEmail(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/resend-verification', withValidation(resendVerificationSchema, 'body', async ({ body }) => {
    const result = await auth.resendVerification(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/forgot-password', withValidation(forgotPasswordSchema, 'body', async ({ body }) => {
    const result = await auth.forgotPassword(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/reset-password', withValidation(resetPasswordSchema, 'body', async ({ body }) => {
    const result = await auth.resetPassword(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/refresh', withValidation(refreshTokenSchema, 'body', async ({ body }) => {
    const result = await auth.refreshToken(body);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/logout', async ({ req }) => {
    const accessToken = req.headers['authorization']?.replace('Bearer ', '');
    if (!accessToken) {
      throw require('../../core/errors').badRequest('Authorization header required');
    }
    const result = await auth.logoutUser(accessToken);
    return { body: result };
  });

  router.add('GET', '/api/v1/auth/me', withRole(AUTHENTICATED, async ({ actor }) => {
    const user = await auth.getUserById(actor.id).catch(() => null)
      || await auth.getUserByEmail(actor.email).catch(() => null);
    return { body: { user: user || actor } };
  }));

  router.add('GET', '/api/v1/auth/users/:id', withRole(AUTHENTICATED, async ({ params, actor }) => {
    if (actor.role !== 'GOVT' && actor.id !== params.id) {
      throw require('../../core/errors').unauthorized('Cannot view other users');
    }
    const user = await auth.getUserById(params.id);
    if (!user) {
      throw require('../../core/errors').notFound('User not found');
    }
    return { body: { user } };
  }));

  router.add('PATCH', '/api/v1/auth/users/:id', withRole(AUTHENTICATED, async ({ params, body, actor }) => {
    if (actor.role !== 'GOVT' && actor.id !== params.id) {
      throw require('../../core/errors').unauthorized('Cannot update other users');
    }
    const user = await auth.updateUserProfile(params.id, body);
    return { body: { user } };
  }));

  router.add('POST', '/api/v1/auth/change-password', withRole(AUTHENTICATED, async ({ body, actor }) => {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      throw require('../../core/errors').badRequest('Current and new password required');
    }
    const result = await auth.changePassword(actor.id, currentPassword, newPassword);
    return { body: result };
  }));

  router.add('DELETE', '/api/v1/auth/users/:id', withRole(AUTHENTICATED, async ({ params, actor }) => {
    const result = await auth.deleteUser(params.id, actor);
    return { body: result };
  }));

  router.add('GET', '/api/v1/auth/users', withRole([roles.GOVT], async ({ query, actor }) => {
    const { limit, paginationToken } = query;
    const result = await auth.listUsers({ limit: limit ? parseInt(limit) : undefined, paginationToken });
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/assign-role', withRole([roles.GOVT], async ({ body, actor }) => {
    const { userId, role } = body;
    if (!userId || !role) {
      throw require('../../core/errors').badRequest('userId and role required');
    }
    const result = await auth.assignRole(userId, role, actor);
    return { body: { user: result } };
  }));

  router.add('POST', '/api/v1/auth/invites', withRole([roles.GOVT], withValidation(inviteSchema, 'body', async ({ body, actor }) => {
    const result = await auth.createInvite(body, actor);
    return { status: 201, body: result };
  })));

  router.add('GET', '/api/v1/auth/invites', withRole([roles.GOVT], async ({ actor }) => {
    const result = await auth.listInvites(actor);
    return { body: result };
  }));

  router.add('DELETE', '/api/v1/auth/invites/:id', withRole([roles.GOVT], async ({ params, actor }) => {
    const result = await auth.revokeInvite(params.id, actor);
    return { body: result };
  }));

  router.add('POST', '/api/v1/auth/invites/:id/resend', withRole([roles.GOVT], async ({ params, actor }) => {
    const result = await auth.resendInvite(params.id, actor);
    return { body: result };
  }));
}

module.exports = { createAuthRoutes };
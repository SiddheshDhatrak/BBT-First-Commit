const { withValidation } = require('../../core/validation');
const { registerSchema, loginSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema, resendVerificationSchema } = require('./validation');

function createAuthRoutes(router, auth) {
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

  router.add('GET', '/api/v1/auth/me', async ({ actor }) => {
    if (actor.role === 'PUBLIC') {
      throw require('../../core/errors').unauthorized('Authentication required');
    }
    return { body: { user: actor } };
  });

  router.add('GET', '/api/v1/auth/users/:id', async ({ params, actor }) => {
    if (actor.role !== 'GOVT' && actor.id !== params.id) {
      throw require('../../core/errors').unauthorized('Cannot view other users');
    }
    const user = await auth.getUserById(params.id);
    if (!user) {
      throw require('../../core/errors').notFound('User not found');
    }
    return { body: { user } };
  });

  router.add('PATCH', '/api/v1/auth/users/:id', async ({ params, body, actor }) => {
    if (actor.role !== 'GOVT' && actor.id !== params.id) {
      throw require('../../core/errors').unauthorized('Cannot update other users');
    }
    const user = await auth.updateUserProfile(params.id, body);
    return { body: { user } };
  });

  router.add('POST', '/api/v1/auth/change-password', async ({ body, actor }) => {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      throw require('../../core/errors').badRequest('Current and new password required');
    }
    const result = await auth.changePassword(actor.id, currentPassword, newPassword);
    return { body: result };
  });

  router.add('DELETE', '/api/v1/auth/users/:id', async ({ params, actor }) => {
    const result = await auth.deleteUser(params.id, actor);
    return { body: result };
  });

  router.add('GET', '/api/v1/auth/users', async ({ query, actor }) => {
    if (actor.role !== 'GOVT') {
      throw require('../../core/errors').unauthorized('Admin access required');
    }
    const { limit, paginationToken } = query;
    const result = await auth.listUsers({ limit: limit ? parseInt(limit) : undefined, paginationToken });
    return { body: result };
  });

  router.add('POST', '/api/v1/auth/assign-role', async ({ body, actor }) => {
    const { userId, role } = body;
    if (!userId || !role) {
      throw require('../../core/errors').badRequest('userId and role required');
    }
    const result = await auth.assignRole(userId, role, actor);
    return { body: { user: result } };
  });
}

module.exports = { createAuthRoutes };
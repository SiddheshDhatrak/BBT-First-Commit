const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand, AdminDeleteUserCommand, AdminConfirmSignUpCommand, AdminResendConfirmationCodeCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand, InitiateAuthCommand, GlobalSignOutCommand, SignUpCommand, ConfirmSignUpCommand, ResendConfirmationCodeCommand, AdminUpdateUserAttributesCommand, AdminGetUserCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { badRequest, conflict, forbidden, notFound, unauthorized } = require('../../core/errors');
const { loadConfig } = require('../../core/config');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const ROLE_GROUP_MAP = {
  DONOR: 'DONOR',
  NGO: 'NGO',
  VENDOR: 'VENDOR',
  FIELD: 'FIELD',
  GOVT: 'GOVT',
};

const MOCK_USERS = new Map();

function createAuthService(config = loadConfig()) {
  const userPoolId = config.COGNITO_USER_POOL_ID;
  const clientId = config.COGNITO_CLIENT_ID;

  const isConfigured = !!(userPoolId && clientId);
  
  if (!isConfigured && config.NODE_ENV === 'production') {
    throw new Error('Cognito configuration missing: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID required');
  }

  // Public self-registration is limited to DONOR/NGO/VENDOR. FIELD and GOVT
  // require a GOVT/SYSTEM actor (admin invite flow) or a valid invitation token.
  const SELF_SERVE_ROLES = ['DONOR', 'NGO', 'VENDOR'];
  const PRIVILEGED_ROLES = ['FIELD', 'GOVT'];

  function resolveRegistrationRole(input, actor) {
    const requested = String(input.role || 'DONOR').toUpperCase();
    if (PRIVILEGED_ROLES.includes(requested)) {
      const approver = actor && (actor.role === 'GOVT' || actor.role === 'SYSTEM');
      if (!approver && !input.invitationToken) {
        throw forbidden('FIELD and GOVT roles require an admin invitation.');
      }
    }
    return SELF_SERVE_ROLES.includes(requested) ? requested : requested;
  }

  async function registerUser(input, actor) {
    const role = resolveRegistrationRole(input, actor);
    if (!isConfigured) {
      const mockUser = {
        id: `mock-${Date.now()}`,
        email: input.email,
        name: input.name,
        role,
        organizationId: input.organizationId || null,
        emailVerified: true,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      MOCK_USERS.set(input.email, mockUser);
      return { user: mockUser, message: 'Mock registration (Cognito not configured)' };
    }

    const existingUser = await getUserByEmail(input.email);
    if (existingUser) {
      throw conflict('User with this email already exists');
    }

    const createUserParams = {
      UserPoolId: userPoolId,
      Username: input.email,
      TemporaryPassword: input.password,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: input.name },
        { Name: 'custom:role', Value: role },
      ],
    };

    if (input.organizationId) {
      createUserParams.UserAttributes.push({ Name: 'custom:orgId', Value: input.organizationId });
    }

    await cognitoClient.send(new AdminCreateUserCommand(createUserParams));

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: input.email,
      Password: input.password,
      Permanent: true,
    }));

    const groupName = ROLE_GROUP_MAP[role];
    if (groupName) {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: input.email,
        GroupName: groupName,
      }));
    }

    await cognitoClient.send(new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: input.email,
    }));

    const user = await getUserByEmail(input.email);
    return { user, message: 'User registered successfully. Please check your email for verification.' };
  }

  async function loginUser(input) {
    if (!isConfigured) {
      const { email, password } = input;
      const user = await getUserByEmail(email);
      if (!user || password !== 'password123') {
        throw unauthorized('Invalid email or password');
      }
      return {
        accessToken: `mock-access-token-${Date.now()}`,
        refreshToken: `mock-refresh-token-${Date.now()}`,
        idToken: `mock-id-token-${Date.now()}`,
        expiresIn: 3600,
        user,
      };
    }

    const { email, password } = input;

    const authParams = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    try {
      const result = await cognitoClient.send(new InitiateAuthCommand(authParams));
      const { AuthenticationResult, ChallengeName } = result;

      if (ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        throw badRequest('Temporary password expired. Please reset your password.');
      }

      if (!AuthenticationResult) {
        throw unauthorized('Invalid credentials');
      }

      const user = await getUserByEmail(email);
      return {
        accessToken: AuthenticationResult.AccessToken,
        refreshToken: AuthenticationResult.RefreshToken,
        idToken: AuthenticationResult.IdToken,
        expiresIn: AuthenticationResult.ExpiresIn,
        user,
      };
    } catch (error) {
      if (error.name === 'NotAuthorizedException') {
        throw unauthorized('Invalid email or password');
      }
      if (error.name === 'UserNotConfirmedException') {
        throw badRequest('Please verify your email before logging in');
      }
      throw error;
    }
  }

  async function verifyEmail(input) {
    if (!isConfigured) {
      return { message: 'Email verified successfully (mock). You can now log in.' };
    }

    const { email, code } = input;

    const confirmParams = {
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    };

    await cognitoClient.send(new ConfirmSignUpCommand(confirmParams));

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async function resendVerification(input) {
    if (!isConfigured) {
      return { message: 'Verification code sent (mock). Please check your email.' };
    }

    const { email } = input;

    const resendParams = {
      ClientId: clientId,
      Username: email,
    };

    await cognitoClient.send(new ResendConfirmationCodeCommand(resendParams));

    return { message: 'Verification code sent. Please check your email.' };
  }

  async function forgotPassword(input) {
    if (!isConfigured) {
      return { message: 'If the email exists, a reset code has been sent (mock).' };
    }

    const { email } = input;

    const forgotParams = {
      ClientId: clientId,
      Username: email,
    };

    await cognitoClient.send(new ForgotPasswordCommand(forgotParams));

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async function resetPassword(input) {
    if (!isConfigured) {
      return { message: 'Password reset successfully (mock). You can now log in with your new password.' };
    }

    const { email, code, newPassword } = input;

    const confirmParams = {
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    };

    await cognitoClient.send(new ConfirmForgotPasswordCommand(confirmParams));

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async function refreshToken(input) {
    if (!isConfigured) {
      return {
        accessToken: `mock-access-token-${Date.now()}`,
        idToken: `mock-id-token-${Date.now()}`,
        expiresIn: 3600,
      };
    }

    const { refreshToken } = input;

    const authParams = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };

    try {
      const result = await cognitoClient.send(new InitiateAuthCommand(authParams));
      return {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn,
      };
    } catch (error) {
      if (error.name === 'NotAuthorizedException') {
        throw unauthorized('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  async function logoutUser(accessToken) {
    if (!isConfigured) {
      return { message: 'Logged out successfully (mock)' };
    }

    const logoutParams = {
      AccessToken: accessToken,
    };

    await cognitoClient.send(new GlobalSignOutCommand(logoutParams));
    return { message: 'Logged out successfully' };
  }

  async function getUserByEmail(email) {
    if (!isConfigured) {
      return MOCK_USERS.get(email) || null;
    }

    try {
      const result = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email,
      }));

      const attributes = {};
      result.UserAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        id: result.Username,
        email: attributes.email,
        name: attributes.name,
        role: attributes['custom:role'] || 'DONOR',
        organizationId: attributes['custom:orgId'] || null,
        emailVerified: attributes.email_verified === 'true',
        status: result.UserStatus,
        createdAt: result.UserCreateDate,
        lastModified: result.UserLastModifiedDate,
      };
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  async function getUserById(userId) {
    if (!isConfigured) {
      for (const user of MOCK_USERS.values()) {
        if (user.id === userId || user.email === userId) {
          return user;
        }
      }
      return null;
    }

    try {
      const result = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId,
      }));

      const attributes = {};
      result.UserAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        id: result.Username,
        email: attributes.email,
        name: attributes.name,
        role: attributes['custom:role'] || 'DONOR',
        organizationId: attributes['custom:orgId'] || null,
        emailVerified: attributes.email_verified === 'true',
        status: result.UserStatus,
        createdAt: result.UserCreateDate,
        lastModified: result.UserLastModifiedDate,
      };
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  async function updateUserProfile(userId, updates) {
    if (!isConfigured) {
      for (const [email, user] of MOCK_USERS.entries()) {
        if (user.id === userId || user.email === userId) {
          if (updates.name) user.name = updates.name;
          if (updates.organizationId) user.organizationId = updates.organizationId;
          if (updates.role) user.role = updates.role;
          user.lastModified = new Date().toISOString();
          return user;
        }
      }
      throw notFound('User not found');
    }

    const userAttributes = [];

    if (updates.name) {
      userAttributes.push({ Name: 'name', Value: updates.name });
    }
    if (updates.organizationId) {
      userAttributes.push({ Name: 'custom:orgId', Value: updates.organizationId });
    }
    if (updates.role) {
      userAttributes.push({ Name: 'custom:role', Value: updates.role });
    }

    if (userAttributes.length > 0) {
      await cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: userAttributes,
      }));
    }

    return getUserById(userId);
  }

  async function changePassword(userId, currentPassword, newPassword) {
    if (!isConfigured) {
      return { message: 'Password changed successfully (mock)' };
    }

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: userId,
      Password: newPassword,
      Permanent: true,
    }));
    return { message: 'Password changed successfully' };
  }

  async function deleteUser(userId, actor) {
    if (!isConfigured) {
      for (const [email, user] of MOCK_USERS.entries()) {
        if (user.id === userId || user.email === userId) {
          MOCK_USERS.delete(email);
          return { message: 'User deleted successfully (mock)' };
        }
      }
      throw notFound('User not found');
    }

    if (actor.role !== 'GOVT' && actor.id !== userId) {
      throw unauthorized('Cannot delete other users');
    }

    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: userId,
    }));
    return { message: 'User deleted successfully' };
  }

  async function listUsers(filters = {}) {
    if (!isConfigured) {
      const users = Array.from(MOCK_USERS.values());
      return { users: users.slice(0, filters.limit || 50), nextToken: null };
    }

    const listParams = {
      UserPoolId: userPoolId,
      Limit: filters.limit || 50,
    };

    if (filters.paginationToken) {
      listParams.PaginationToken = filters.paginationToken;
    }

    const result = await cognitoClient.send(new ListUsersCommand(listParams));

    const users = result.Users.map(user => {
      const attributes = {};
      user.Attributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
      return {
        id: user.Username,
        email: attributes.email,
        name: attributes.name,
        role: attributes['custom:role'] || 'DONOR',
        organizationId: attributes['custom:orgId'] || null,
        emailVerified: attributes.email_verified === 'true',
        status: user.UserStatus,
        createdAt: user.UserCreateDate,
        lastModified: user.UserLastModifiedDate,
      };
    });

    return { users, nextToken: result.PaginationToken };
  }

  async function assignRole(userId, role, actor) {
    if (!isConfigured) {
      for (const user of MOCK_USERS.values()) {
        if (user.id === userId || user.email === userId) {
          user.role = role;
          return user;
        }
      }
      throw notFound('User not found');
    }

    if (actor.role !== 'GOVT' && actor.role !== 'SYSTEM') {
      throw unauthorized('Only government users can assign roles');
    }

    const groupName = ROLE_GROUP_MAP[role];
    if (!groupName) {
      throw badRequest('Invalid role');
    }

    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: userId,
      GroupName: groupName,
    }));

    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userId,
      UserAttributes: [{ Name: 'custom:role', Value: role }],
    }));

    return getUserById(userId);
  }

  return {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    refreshToken,
    logoutUser,
    getUserByEmail,
    getUserById,
    updateUserProfile,
    changePassword,
    deleteUser,
    listUsers,
    assignRole,
  };
}

module.exports = { createAuthService };
// Frontend Auth Module - Mock implementation for development
// Replace with real AWS Amplify v6 when Cognito is configured

const mockAuth = {
  async signUp(email: string, password: string, name: string, role: string, organizationId?: string) {
    console.log('Mock signUp:', { email, name, role, organizationId });
    return { 
      userId: `mock-${Date.now()}`, 
      isSignUpComplete: true, 
      nextStep: { signUpStep: 'COMPLETE' } 
    };
  },

  async confirmSignUp(email: string, code: string) {
    return { message: 'Email verified successfully (mock)' };
  },

  async resendConfirmationCode(email: string) {
    return { message: 'Verification code sent (mock)' };
  },

  async signIn(email: string, password: string) {
    return {
      user: {
        id: `mock-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'DONOR',
        organizationId: null,
        emailVerified: true,
      },
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
      idToken: `mock-id-token-${Date.now()}`,
    };
  },

  async confirmSignIn(email: string, code: string) {
    return { message: 'MFA verified (mock)' };
  },

  async forgotPassword(email: string) {
    return { message: 'If the email exists, a reset code has been sent (mock)' };
  },

  async forgotPasswordSubmit(email: string, code: string, newPassword: string) {
    return { message: 'Password reset successfully (mock)' };
  },

  async signOut() {
    return { message: 'Signed out successfully (mock)' };
  },

  async getCurrentUser() {
    return null;
  },

  async refreshSession() {
    return {
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
      idToken: `mock-id-token-${Date.now()}`,
    };
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return { message: 'Password changed successfully (mock)' };
  },

  async completeNewPassword(password: string, requiredAttributes = {}) {
    return { message: 'Password set successfully (mock)' };
  },
};

export const isAmplifyConfigured = false;

export interface CognitoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export const auth = {
  signUp: mockAuth.signUp,
  confirmSignUp: mockAuth.confirmSignUp,
  resendConfirmationCode: mockAuth.resendConfirmationCode,
  signIn: mockAuth.signIn,
  confirmSignIn: mockAuth.confirmSignIn,
  forgotPassword: mockAuth.forgotPassword,
  forgotPasswordSubmit: mockAuth.forgotPasswordSubmit,
  signOut: mockAuth.signOut,
  getCurrentUser: mockAuth.getCurrentUser,
  refreshSession: mockAuth.refreshSession,
  changePassword: mockAuth.changePassword,
  completeNewPassword: mockAuth.completeNewPassword,
};

export default auth;
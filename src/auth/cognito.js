import {
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resetPassword as amplifyResetPassword,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
} from 'aws-amplify/auth';

function readMessage(error) {
  return error?.message || error?.name || 'Authentication failed';
}

export async function signInWithCognito(username, password) {
  try {
    const result = await amplifySignIn({
      username,
      password,
      options: { authFlowType: 'USER_PASSWORD_AUTH' },
    });
    if (!result.isSignedIn) {
      throw new Error('Sign-in is incomplete. Please try again.');
    }
    return result;
  } catch (error) {
    if (error?.name === 'UserNotConfirmedException') {
      throw new Error('Account not confirmed. Check your email for the verification code.');
    }
    if (error?.name === 'NotAuthorizedException' && String(error?.message || '').includes('attempts exceeded')) {
      throw new Error('Too many failed attempts. Wait 15 minutes, then try again.');
    }
    throw new Error(readMessage(error));
  }
}

export async function signUpWithCognito({ username, password, email, name, profileType = 'candidate' }) {
  const normalizedProfileType = profileType === 'interviewer' ? 'interviewer' : 'candidate';
  const basePayload = {
    username,
    password,
    options: {
      userAttributes: {
        email,
        ...(name ? { name } : {}),
      },
    },
  };
  try {
    return await amplifySignUp({
      ...basePayload,
      options: {
        ...basePayload.options,
        userAttributes: {
          ...basePayload.options.userAttributes,
          'custom:profile_type': normalizedProfileType,
        },
      },
    });
  } catch (error) {
    const message = String(error?.message || '');
    // Some user pools do not define this custom attribute yet.
    if (message.includes('custom:profile_type') && message.includes('schema')) {
      return amplifySignUp(basePayload);
    }
    if (error?.name === 'UsernameExistsException') {
      throw new Error('An account with this email already exists.');
    }
    throw new Error(readMessage(error));
  }
}

export async function confirmCognitoSignUp(username, confirmationCode) {
  return amplifyConfirmSignUp({ username, confirmationCode });
}

export async function signOutFromCognito() {
  return amplifySignOut();
}

export async function requestPasswordReset(username) {
  return amplifyResetPassword({ username });
}

export async function confirmPasswordReset({ username, confirmationCode, newPassword }) {
  return amplifyConfirmResetPassword({
    username,
    confirmationCode,
    newPassword,
  });
}

export async function getCognitoAccessToken() {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() || null;
}

export async function getCognitoUserProfile() {
  const currentUser = await getCurrentUser();
  const session = await fetchAuthSession();
  const claims = session.tokens?.idToken?.payload || {};

  return {
    id: currentUser.userId || claims.sub || null,
    name: claims.name || claims['cognito:username'] || currentUser.username || '',
    email: claims.email || '',
    profile_type: claims['custom:profile_type'] || null,
  };
}

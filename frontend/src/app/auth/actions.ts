
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { auth, db } from '@/services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getErrorMessage } from '@/lib/errors';

function ensureFirebaseServices() {
    if (!auth || !db) {
        throw new Error("Firebase services are not available. Please check your configuration.");
    }
}

// Sign Up Schema and State
const SignUpFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(9, { message: "Please enter a valid phone number." }),
  occupation: z.string().optional(),
  country: z.string().min(1, { message: "Please select your country." }),
  city: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  nationalIdFront: z.instanceof(File).optional(),
  nationalIdBack: z.instanceof(File).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export type SignUpFormState = {
  message: string | null;
  errors?: {
    fullName?: string[];
    email?: string[];
    phoneNumber?: string[];
    occupation?: string[];
    country?: string[];
    city?: string[];
    password?: string[];
    confirmPassword?: string[];
    nationalIdFront?: string[];
    nationalIdBack?: string[];
    server?: string[];
  };
  success?: boolean;
};

export async function signupAction(
  prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const validatedFields = SignUpFormSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    occupation: formData.get('occupation'),
    country: formData.get('country'),
    city: formData.get('city'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    nationalIdFront: formData.get('nationalIdFront'),
    nationalIdBack: formData.get('nationalIdBack'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your inputs.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email, password, fullName, phoneNumber, occupation, country, city } = validatedFields.data;
  let user;

  try {
    ensureFirebaseServices();
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    user = userCredential.user;

    // 2. Update user's display name in Firebase Auth
    await updateProfile(user, { displayName: fullName });

  } catch (error: any) {
    let errorMessage = 'An unknown error occurred during sign up.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email address is already in use by another account.';
    } else {
      errorMessage = getErrorMessage(error, errorMessage);
    }
    return { message: `Sign up failed: ${errorMessage}`, success: false, errors: { server: [errorMessage] } };
  }

  // 3. Create a user document in Firestore
  try {
    await setDoc(doc(db!, "users", user.uid), {
      uid: user.uid,
      fullName,
      email,
      phoneNumber,
      occupation: occupation || '',
      country,
      city: city || '',
      createdAt: serverTimestamp(),
      avatarUrl: 'https://placehold.co/128x128.png',
      bio: '',
      rating: 0,
      reviewsCount: 0,
      servicesOffered: [],
      servicesRequested: [],
    });
  } catch (_error) {
    // user doc creation failed; auth already succeeded so continue
  }

  redirect('/profile/verify');
}

// Sign In Schema and State
const SignInFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  rememberMe: z.boolean().optional(),
});

export type SignInFormState = {
  message: string | null;
  errors?: {
    email?: string[];
    password?: string[];
    server?: string[];
  };
  success?: boolean;
};

export async function signinAction(
  prevState: SignInFormState,
  formData: FormData
): Promise<SignInFormState> {
  const validatedFields = SignInFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe') === 'on',
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your inputs.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    ensureFirebaseServices();
    await signInWithEmailAndPassword(auth!, email, password);
  } catch (error: any) {
    let errorMessage = 'Invalid email or password.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password. Please try again.';
    } else {
      errorMessage = getErrorMessage(error, errorMessage);
    }
    return { message: errorMessage, success: false, errors: { server: [errorMessage] } };
  }

  return { message: 'Sign in successful!', success: true };
}


export async function signoutAction() {
  // This server action can't directly sign out the client.
  // The sign-out logic is handled on the client in the AuthContext.
  // We just need to redirect the user to the homepage after they initiate the sign-out.
  redirect('/');
}

// Forgot Password Schema and State
const ForgotPasswordFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export type ForgotPasswordFormState = {
  message: string | null;
  errors?: {
    email?: string[];
    server?: string[];
  };
  success?: boolean;
};

export async function forgotPasswordAction(
  prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const validatedFields = ForgotPasswordFormSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email } = validatedFields.data;

  try {
    ensureFirebaseServices();
    await sendPasswordResetEmail(auth!, email);
    // Always return a generic success message to prevent email enumeration.
    return {
      message: 'If an account exists for that email, a password reset link has been sent.',
      success: true,
    };
  } catch (_error: unknown) {
    // Also return a generic message on error for security.
    // A specific error could be logged for developers but not shown to the user.
    return {
      message: 'If an account exists for that email, a password reset link has been sent.',
      success: true,
    };
  }
}

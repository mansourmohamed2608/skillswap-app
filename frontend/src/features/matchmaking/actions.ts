'use server';

import { generateServiceMatch, type GenerateServiceMatchInput, type GenerateServiceMatchOutput } from '@/ai/flows/generate-service-match';
import { z } from 'zod';
import { findBannedKeywordInFields } from '@/lib/moderation';

const MatchmakingFormSchema = z.object({
  userProfile: z.string().min(10, 'Please describe your offered skills and services in more detail (min 10 characters).'),
  serviceRequests: z.string().min(10, 'Please describe your requested services in more detail (min 10 characters).'),
});

export type MatchmakingFormState = {
  message: string | null;
  messageKey?: string;
  errorKey?: string;
  matches?: string[];
  errors?: {
    userProfile?: string[];
    serviceRequests?: string[];
    server?: string[];
  };
};

export async function findMatchesAction(
  prevState: MatchmakingFormState,
  formData: FormData
): Promise<MatchmakingFormState> {
  const validatedFields = MatchmakingFormSchema.safeParse({
    userProfile: formData.get('userProfile'),
    serviceRequests: formData.get('serviceRequests'),
  });

  if (!validatedFields.success) {
    return {
      message: null,
      messageKey: 'matchmaking.form.validationMessage',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const inputData: GenerateServiceMatchInput = {
    userProfile: validatedFields.data.userProfile,
    serviceRequests: validatedFields.data.serviceRequests,
  };

  const banned = findBannedKeywordInFields([
    { label: 'userProfile', value: inputData.userProfile },
    { label: 'serviceRequests', value: inputData.serviceRequests },
  ]);
  if (banned) {
    return {
      message: null,
      messageKey: 'matchmaking.form.errorMessage',
      errorKey: 'matchmaking.form.bannedMessage',
      errors: { server: [] },
    };
  }

  try {
    const result: GenerateServiceMatchOutput = await generateServiceMatch(inputData);
    if (result.matches && result.matches.length > 0) {
      return {
        message: null,
        messageKey: 'matchmaking.form.successMessage',
        matches: result.matches,
      };
    } else {
      return {
        message: null,
        messageKey: 'matchmaking.form.noMatchesMessage',
        matches: [],
      };
    }
  } catch {
    return {
      message: null,
      messageKey: 'matchmaking.form.errorMessage',
      errorKey: 'matchmaking.form.errorDetail',
      errors: { server: [] },
    };
  }
}

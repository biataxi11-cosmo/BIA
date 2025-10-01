'use server';

/**
 * @fileOverview Flow for calculating suggested tip amounts based on ride fare in regions where tipping is customary.
 *
 * - `calculateTip`: Calculates the suggested tip amount.
 * - `CalculateTipInput`: The input type for the `calculateTip` function.
 * - `CalculateTipOutput`: The return type for the `calculateTip` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateTipInputSchema = z.object({
  rideFare: z
    .number()
    .describe('The fare amount of the ride, in local currency.'),
  location: z.string().describe('The location of the ride.'),
});
export type CalculateTipInput = z.infer<typeof CalculateTipInputSchema>;

const CalculateTipOutputSchema = z.object({
  suggestedTipPercentage: z
    .number()
    .describe(
      'The suggested tip percentage based on the ride fare and location.'
    ),
  suggestedTipAmount: z
    .number()
    .describe('The suggested tip amount in local currency.'),
  isTippingCustomary: z
    .boolean()
    .describe('Whether tipping is customary in the specified location.'),
});

export type CalculateTipOutput = z.infer<typeof CalculateTipOutputSchema>;

export async function calculateTip(input: CalculateTipInput): Promise<CalculateTipOutput> {
  return calculateTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateTipPrompt',
  input: {schema: CalculateTipInputSchema},
  output: {schema: CalculateTipOutputSchema},
  prompt: `You are a tip calculator that suggests tip amounts based on location and ride fare.

  Determine if tipping is customary in the provided location.
  Calculate a reasonable tip percentage and amount based on the ride fare, assuming the local currency is the appropriate currency.
  Provide the suggested tip percentage and amount.
  If tipping is not customary, return a 0 tip percentage and amount, and set isTippingCustomary to false.

  The ride fare is {{{rideFare}}} in local currency.
  The location is {{{location}}}.`,
});

const calculateTipFlow = ai.defineFlow(
  {
    name: 'calculateTipFlow',
    inputSchema: CalculateTipInputSchema,
    outputSchema: CalculateTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

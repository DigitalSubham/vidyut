/** Common result shape for every provider adapter — mirrors the honest-stub posture already established for `appbuild.generate` (Unit 31). */
export interface SendResult {
  sent: boolean;
  stubbed: boolean;
  providerRef?: string;
  error?: string;
}

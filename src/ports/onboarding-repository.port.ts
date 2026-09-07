export interface OnboardingRepository {
  complete(): void
  hasCompleted(): boolean
  reset(): void
}

import type { OnboardingRepository } from '../../ports/onboarding-repository.port'

const ONBOARDING_STORAGE_KEY = 'pinnoco:onboarding:v1'

export class OnboardingPreferencesRepository implements OnboardingRepository {
  private completedInMemory = false

  constructor(private readonly storage: Storage | null) {}

  complete(): void {
    this.completedInMemory = true
    try {
      this.storage?.setItem(ONBOARDING_STORAGE_KEY, 'complete')
    } catch {
      // Onboarding remains complete for this page even when storage is unavailable.
    }
  }

  reset(): void {
    this.completedInMemory = false
    try {
      this.storage?.removeItem(ONBOARDING_STORAGE_KEY)
    } catch {
      // The in-memory flag still resets when storage is unavailable.
    }
  }

  hasCompleted(): boolean {
    if (this.completedInMemory) return true
    try {
      return this.storage?.getItem(ONBOARDING_STORAGE_KEY) === 'complete'
    } catch {
      return false
    }
  }
}

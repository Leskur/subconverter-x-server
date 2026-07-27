export type UpdateIntervalMode = 'auto' | number

export interface SubscriptionConfig {
  updateInterval: UpdateIntervalMode
}

export interface SubscriptionInput {
  updateInterval?: UpdateIntervalMode
}

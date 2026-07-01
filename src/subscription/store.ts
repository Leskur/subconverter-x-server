import type { SubscriptionConfig, SubscriptionInput } from './types.js'
import { configStore } from '../config/store.js'

export class FileSubscriptionStore {
  async get(): Promise<SubscriptionConfig> {
    return { updateInterval: await configStore.getUpdateInterval() }
  }

  async save(input: SubscriptionInput): Promise<SubscriptionConfig> {
    if (input.updateInterval !== undefined) {
      await configStore.setUpdateInterval(input.updateInterval)
    }
    return this.get()
  }

  async reset(): Promise<SubscriptionConfig> {
    await configStore.setUpdateInterval('auto')
    return { updateInterval: 'auto' }
  }
}

export const subscriptionStore = new FileSubscriptionStore()

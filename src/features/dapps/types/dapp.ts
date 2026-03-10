export interface DAppInfo {
  id: number
  name: string
  description: string
  url: string
  icon: string
  chains: number[]
  category: string
  featured: boolean
  inject_mode: 'proxy' | 'sdk'
  status: 'active' | 'maintenance' | 'deprecated'
}

export interface DAppCategory {
  id: string
  name: string
  icon: string
  sort_order: number
}

export interface DAppListResponse {
  dapps: DAppInfo[]
  categories: DAppCategory[]
  updated_at: string
}

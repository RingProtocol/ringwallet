export interface DAppInfo {
  id: number
  name: string
  description: string
  url: string
  icon: string
  chains: number[]
  category: string
  top: number
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

export interface Race {
  id: string
  source_id: string | null
  title: string
  date_start: string
  date_end: string | null
  location_name: string
  country: string
  lat: number | null
  lng: number | null
  discipline: 'obstacle' | 'bike_road' | 'bike_mtb' | 'bike_gravel'
  is_kids_friendly: boolean
  min_age: number | null
  max_age: number | null
  distances: Array<{ name: string; km: number }> | null
  registration_url: string | null
  source_url: string | null
  organizer: string | null
  description: string | null
  image_url: string | null
  approval_status: 'pending_review' | 'approved' | 'rejected'
  is_official: boolean
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export interface Filters {
  disciplines: string[]
  kidsOnly: boolean
  countries: string[]
  dateFrom: string
  dateTo: string
  age: string
}

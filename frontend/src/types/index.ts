export interface User {
  username: string
  rol: 'admin' | 'manager' | 'dev'
  locatie_id: number | null
}

export interface Locatie {
  id: number
  numeLocatie: string
  spalatori?: Spalator[]
}

export interface Spalator {
  id: number
  numeSpalator: string
  locatie_id?: number
}

export interface ManagerUser {
  id: number
  username: string
  locatie_id: number | null
}

export interface PretServicii {
  id: number
  serviciiPrestate: string
  pretAutoturism: number
  pretSUV: number
  pretVan: number
  comisionAutoturism: number
  comisionSUV: number
  comisionVan: number
}

export interface Serviciu {
  id: number
  serviciiPrestate: string
  dataSpalare: string
  pretServicii: number
  comisionServicii: number
  tipPlata: 'CASH' | 'CARD' | 'CURS' | 'CONTRACT' | 'PROTOCOL'
  nrFirma: string | null
  spalator: string | null
}

export interface ClientCard {
  client: {
    numarAutoturism: string
    marcaAutoturism: string
    tipAutoturism: string
    emailClient: string | null
    telefonClient: string | null
  }
  servicii: Serviciu[]
}

export interface PeriodStats {
  spalari: number
  incasari: number  // CURS excluded — collected only
  cursInAsteptare: { count: number; amount: number }
  clientiNoi: number
  spalariTipPlata: { CASH: number; CARD: number; CURS: number; CONTRACT: number; PROTOCOL: number }
  incasariTipPlata: { CASH: number; CARD: number; CURS?: number; CONTRACT: number; PROTOCOL: number }
  spalariPerSpalator: Record<string, number>
  comisionPerSpalator: Record<string, number>
  spalariTipServiciu: Record<string, number>
  incasariTipServiciu: Record<string, number>
}

export interface LocationReport {
  ziuaCurenta: PeriodStats
  ziuaTrecuta: PeriodStats
  saptamanaCurenta: PeriodStats
  saptamanaTrecuta: PeriodStats
  lunaCurenta: PeriodStats
  lunaTrecuta: PeriodStats
}

export interface ReportsResponse {
  locatii: Locatie[]
  reports: Record<string, LocationReport>
}

// Istoric types
export interface IstoricBar {
  label: string
  incasari: number
  spalari: number
  masini: number
  month?: number  // annual view only — used for drill-down click
}

export interface IstoricKpi {
  incasari: number
  spalari: number
  masini: number
  lunaDeVarf?: string  // annual view only
}

export interface IstoricServiceBreakdown {
  name: string
  spalari: number
  incasari: number
}

export interface IstoricData {
  view: 'annual' | 'monthly'
  year: number
  month?: number
  monthLabel?: string
  bars: IstoricBar[]
  kpi: IstoricKpi
  serviciiBreakdown: IstoricServiceBreakdown[]
  locatii: { id: number; numeLocatie: string }[]
  availableYears: number[]
  primaLuna: string | null
}

export interface AdminClient {
  id: number
  numar: string
  marca: string
  tip: string
  vizite: number
  total: number
  ultimaSpalare: string | null
  topServiciu: string | null
}

export interface AdminClientiResponse {
  clienti: AdminClient[]
  total: number
}

// Dev types
export interface DevLocatieStats {
  id: number
  numeLocatie: string
  totalServicii: number
  totalIncasari: number
  totalClienti: number
  totalSpalatori: number
  totalManageri: number
}

export interface DevOverviewResponse {
  allTime: {
    totalServicii: number
    totalIncasari: number
    totalClienti: number
    totalComision: number
  }
  perLocatie: DevLocatieStats[]
  users: { admins: number; managers: number; devs: number }
}

export interface DevClient {
  id: number
  numarAutoturism: string
  marcaAutoturism: string
  tipAutoturism: string
  emailClient: string | null
  telefonClient: string | null
  locatie: string | null
  totalServicii: number
  ultimaSpalare: string | null
  gdpr: boolean
  newsletter: boolean
}

export interface DevClientsResponse {
  clients: DevClient[]
  total: number
  page: number
  pages: number
}

export interface DevClientHistory {
  client: {
    numarAutoturism: string
    marcaAutoturism: string
    tipAutoturism: string
    emailClient: string | null
    telefonClient: string | null
    locatie: string | null
    gdpr: boolean
    newsletter: boolean
  }
  servicii: Array<{
    id: number
    serviciiPrestate: string
    dataSpalare: string
    pretServicii: number
    comisionServicii: number
    tipPlata: string
    nrFirma: string | null
    spalator: string | null
  }>
}

export interface DevAccount {
  id: number
  username: string
  rol: 'admin' | 'manager' | 'dev'
  locatie_id: number | null
  locatie: string | null
}

export interface DevAccountsResponse {
  users: DevAccount[]
  locatii: Locatie[]
}

export interface DevSystemResponse {
  counts: Record<string, number>
  backups: string[]
  recentServices: Array<{
    id: number
    serviciiPrestate: string
    dataSpalare: string
    tipPlata: string
    pretServicii: number
    locatie: string | null
    plate: string | null
  }>
  env: { dbType: string; debug: boolean; version: string }
}

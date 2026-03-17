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
  incasari: number
  clientiNoi: number
  spalariTipPlata: { CASH: number; CARD: number; CURS: number }
  incasariTipPlata: { CASH: number; CARD: number; CURS: number }
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

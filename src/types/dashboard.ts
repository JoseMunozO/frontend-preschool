export type DashboardMaterialAlert = {
  materialId: number
  sku?: string
  name: string
  category?: string
  quantityOnHand: number
  minimumQuantity: number
  shortage: number
}

export type DashboardScheduleItem = {
  scheduleSlotId: number
  groupId: number
  groupName?: string
  primaryStaffId?: number
  primaryStaffName?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  activityTitle: string
  roomName?: string
}

export type DashboardBirthday = {
  studentId: number
  studentName: string
  birthDate: string
  nextBirthday: string
  daysUntilBirthday: number
}

export type DashboardAdminSummary = {
  date: string
  totalStudents: number
  activeStudents: number
  totalParents: number
  activeParents: number
  totalMaterials: number
  lowStockMaterials: number
  todayScheduleSlots: number
  lowStockMaterialAlerts: DashboardMaterialAlert[]
  todaySchedule: DashboardScheduleItem[]
  upcomingBirthdays: DashboardBirthday[]
}

export type DashboardFinanceSummary = {
  date: string
  month: string
  pendingCharges: number
  overdueCharges: number
  pendingBalance: number
  overdueBalance: number
  monthPaymentsReceived: number
}

export type DashboardSummary = {
  date: string
  administration: DashboardAdminSummary
  finance: DashboardFinanceSummary
}

export type DashboardAttendanceSummary = {
  presentCount: number
  absentCount: number
  sickCount: number
  lateCount: number
  unmarkedCount: number
}

export type TeacherDashboardSummary = {
  date: string
  activeStudents: number
  todayScheduleSlots: number
  todaySchedule: DashboardScheduleItem[]
  upcomingBirthdays: DashboardBirthday[]
  todayAttendanceSummary: DashboardAttendanceSummary
}

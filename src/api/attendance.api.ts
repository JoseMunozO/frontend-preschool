import { apiRequest } from './client'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'LATE'

export type StudentAttendance = {
  studentAttendanceId: number | null
  studentId: number
  studentName: string
  date: string
  status: AttendanceStatus | null
  notes: string | null
  recordedByUserId: number | null
  recordedByEmail: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AttendanceRecordInput = {
  studentId: number
  status: AttendanceStatus
  notes?: string
}

export type SaveAttendanceRequest = {
  groupId: number
  date: string
  records: AttendanceRecordInput[]
}

type GetAttendanceParams = {
  groupId: number
  date: string
}

export function getAttendance(params: GetAttendanceParams) {
  const searchParams = new URLSearchParams()
  searchParams.set('groupId', String(params.groupId))
  searchParams.set('date', params.date)

  return apiRequest<StudentAttendance[]>(`/api/attendance?${searchParams.toString()}`)
}

export function saveAttendance(request: SaveAttendanceRequest) {
  return apiRequest<StudentAttendance[]>('/api/attendance', {
    method: 'POST',
    body: request,
  })
}

type GetStudentAttendanceHistoryParams = {
  from?: string
  to?: string
}

export function getStudentAttendanceHistory(
  studentId: number,
  params: GetStudentAttendanceHistoryParams = {},
) {
  const searchParams = new URLSearchParams()

  if (params.from) {
    searchParams.set('from', params.from)
  }

  if (params.to) {
    searchParams.set('to', params.to)
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<StudentAttendance[]>(`/api/attendance/students/${studentId}${query}`)
}

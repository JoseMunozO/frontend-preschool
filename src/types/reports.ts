export type TrashEntityType = 'STUDENT' | 'MATERIAL' | 'PARENT' | 'PARENT_ARCHIVED' | 'SCHEDULE_SLOT' | 'STAFF'

export type TrashEntry = {
  entityId: number
  entityType: TrashEntityType
  label: string
  deletedAt: string
  purgeDeadline: string | null
}

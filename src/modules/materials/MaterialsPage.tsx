import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeftRight, Eye, ListFilter, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import {
  createMaterial,
  createMaterialMovement,
  deleteMaterial,
  getMaterials,
  restoreMaterial,
  updateMaterial,
} from '../../api/materials.api'
import type {
  MaterialItem,
  MaterialMovementRequest,
  MaterialMovementType,
  MaterialRequest,
  MaterialStatus,
} from '../../types/materials'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TrashPanel } from '../../components/ui/TrashPanel'
import { UndoToast } from '../../components/ui/UndoToast'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const UNDO_WINDOW_MS = 8000

const emptyMaterials: MaterialItem[] = []

const statusLabels: Record<MaterialStatus, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
}

const movementTypeLabels: Record<MaterialMovementType, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste por conteo',
}

const materialFormSchema = z.object({
  sku: z.string(),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  category: z.string(),
  unit: z.string(),
  quantityOnHand: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) >= 0, 'Indica una cantidad valida (0 o mayor).'),
  minimumQuantity: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) >= 0, 'Indica un minimo valido (0 o mayor).'),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  notes: z.string(),
})

type MaterialFormValues = z.infer<typeof materialFormSchema>

function emptyFormValues(): MaterialFormValues {
  return {
    sku: '',
    name: '',
    category: '',
    unit: '',
    quantityOnHand: '0',
    minimumQuantity: '0',
    status: 'ACTIVE',
    notes: '',
  }
}

function formValuesForMaterial(material: MaterialItem): MaterialFormValues {
  return {
    sku: material.sku ?? '',
    name: material.name,
    category: material.category ?? '',
    unit: material.unit ?? '',
    quantityOnHand: String(material.quantityOnHand),
    minimumQuantity: String(material.minimumQuantity ?? 0),
    status: material.status,
    notes: material.notes ?? '',
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

const movementFormSchema = z.object({
  movementType: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) >= 1, 'Indica una cantidad valida (1 o mayor).'),
  notes: z.string(),
})

type MovementFormValues = z.infer<typeof movementFormSchema>

function emptyMovementValues(): MovementFormValues {
  return {
    movementType: 'IN',
    quantity: '',
    notes: '',
  }
}

export function MaterialsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all')
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [movementMaterial, setMovementMaterial] = useState<MaterialItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deletedMaterial, setDeletedMaterial] = useState<MaterialItem | null>(null)
  const [isTrashOpen, setIsTrashOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: emptyFormValues(),
  })

  const {
    register: registerMovement,
    handleSubmit: handleMovementFormSubmit,
    reset: resetMovement,
    formState: { errors: movementErrors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: emptyMovementValues(),
  })

  const { data, error, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => getMaterials(),
    retry: false,
  })

  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ['materials', 'trash'],
    queryFn: () => getMaterials({ includeDeleted: true }),
    enabled: isTrashOpen,
  })

  useEffect(() => {
    if (!deletedMaterial) {
      return
    }

    const timeoutId = setTimeout(() => setDeletedMaterial(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timeoutId)
  }, [deletedMaterial])

  const saveMaterialMutation = useMutation({
    mutationFn: ({ materialId, request }: { materialId?: number; request: MaterialRequest }) =>
      materialId ? updateMaterial(materialId, request) : createMaterial(request),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
      setSuccessMessage(
        variables.materialId ? 'Material actualizado correctamente.' : 'Material creado correctamente.',
      )
      setIsFormOpen(false)
      setEditingMaterial(null)
    },
  })

  const movementMutation = useMutation({
    mutationFn: ({ materialId, request }: { materialId: number; request: MaterialMovementRequest }) =>
      createMaterialMovement(materialId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
      setSuccessMessage('Movimiento registrado correctamente.')
      setMovementMaterial(null)
      resetMovement(emptyMovementValues())
    },
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: number) => deleteMaterial(materialId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
      setDeletedMaterial(deleteTarget)
      setDeleteTarget(null)
      setDeleteStep(1)
    },
  })

  const restoreMaterialMutation = useMutation({
    mutationFn: (materialId: number) => restoreMaterial(materialId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
      setDeletedMaterial(null)
    },
  })

  const materials = data ?? emptyMaterials
  const trashedMaterials = (trashData ?? emptyMaterials).filter((material) => material.deletedAt)
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          materials.flatMap((material) => (material.category ? [material.category] : [])),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [materials],
  )
  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return materials.filter((material) => {
      const name = material.name.toLowerCase()
      const sku = material.sku?.toLowerCase() ?? ''
      const category = material.category?.toLowerCase() ?? ''
      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        sku.includes(normalizedSearch) ||
        category.includes(normalizedSearch)
      const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter
      const matchesStock = stockFilter === 'all' || material.lowStock

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [categoryFilter, materials, search, stockFilter])

  function openNewMaterialForm() {
    setEditingMaterial(null)
    reset(emptyFormValues())
    saveMaterialMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsFormOpen(true)
  }

  function openEditMaterialForm(material: MaterialItem) {
    setEditingMaterial(material)
    reset(formValuesForMaterial(material))
    saveMaterialMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsFormOpen(true)
  }

  function closeMaterialForm() {
    setIsFormOpen(false)
    setEditingMaterial(null)
    saveMaterialMutation.reset()
  }

  function openDeleteConfirm(material: MaterialItem) {
    setDeleteTarget(material)
    setDeleteStep(1)
    deleteMaterialMutation.reset()
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setDeleteStep(1)
    deleteMaterialMutation.reset()
  }

  function openTrash() {
    setIsFormOpen(false)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  const onSubmit = handleSubmit((values) => {
    const request: MaterialRequest = {
      sku: optionalValue(values.sku),
      name: values.name,
      category: optionalValue(values.category),
      unit: optionalValue(values.unit),
      quantityOnHand: Number(values.quantityOnHand),
      minimumQuantity: Number(values.minimumQuantity),
      status: values.status,
      notes: optionalValue(values.notes),
    }

    saveMaterialMutation.mutate({ materialId: editingMaterial?.materialId, request })
  })

  function openMovementForm(material: MaterialItem) {
    setMovementMaterial(material)
    resetMovement(emptyMovementValues())
    movementMutation.reset()
    setSuccessMessage(null)
  }

  function closeMovementForm() {
    setMovementMaterial(null)
    resetMovement(emptyMovementValues())
    movementMutation.reset()
  }

  const onMovementSubmit = handleMovementFormSubmit((values) => {
    if (!movementMaterial) {
      return
    }

    movementMutation.mutate({
      materialId: movementMaterial.materialId,
      request: {
        movementType: values.movementType,
        quantity: Number(values.quantity),
        notes: optionalValue(values.notes),
      },
    })
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Material Escolar</h2>
          <p>Administra inventario, stock minimo y necesidades de reposicion.</p>
        </div>
        <div className="page-heading-actions">
          <button className="secondary-button" onClick={openTrash} type="button">
            <Trash2 size={17} aria-hidden="true" />
            Papelera
          </button>
          <button className="primary-button inline-button" onClick={openNewMaterialForm} type="button">
            <Plus size={17} aria-hidden="true" />
            Nuevo material
          </button>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error)
            ? 'No tienes permiso para ver la lista de materiales.'
            : 'No se pudo cargar la lista de materiales.'}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="panel entity-form-panel" aria-labelledby="material-form-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="material-form-title">{editingMaterial ? 'Editar material' : 'Nuevo material'}</h3>
              <p>Completa los datos del inventario.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={saveMaterialMutation.isPending}
              onClick={closeMaterialForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                Nombre *
                <input maxLength={150} {...register('name')} />
                {formErrors.name ? <span className="field-error">{formErrors.name.message}</span> : null}
              </label>
              <label>
                SKU
                <input maxLength={50} {...register('sku')} />
              </label>
              <label>
                Categoria
                <input maxLength={100} {...register('category')} />
              </label>
              <label>
                Unidad
                <input maxLength={50} placeholder="unidad, litro, paquete..." {...register('unit')} />
              </label>
              <label>
                Cantidad actual *
                <input min={0} type="number" {...register('quantityOnHand')} />
                {formErrors.quantityOnHand ? (
                  <span className="field-error">{formErrors.quantityOnHand.message}</span>
                ) : null}
              </label>
              <label>
                Cantidad minima *
                <input min={0} type="number" {...register('minimumQuantity')} />
                {formErrors.minimumQuantity ? (
                  <span className="field-error">{formErrors.minimumQuantity.message}</span>
                ) : null}
              </label>
              <label>
                Estado
                <select {...register('status')}>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="entity-form-full">
                Notas
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {saveMaterialMutation.error ? (
              <p className="form-error" role="alert">
                {saveMaterialMutation.error instanceof Error
                  ? saveMaterialMutation.error.message
                  : 'No se pudo guardar el material.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveMaterialMutation.isPending}
                onClick={closeMaterialForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saveMaterialMutation.isPending} type="submit">
                {saveMaterialMutation.isPending
                  ? 'Guardando...'
                  : editingMaterial
                    ? 'Guardar cambios'
                    : 'Crear material'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      {movementMaterial ? (
        <section className="panel entity-form-panel" aria-labelledby="movement-form-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="movement-form-title">Registrar movimiento</h3>
              <p>{translateBackendSeed(movementMaterial.name)} - existencia actual: {movementMaterial.quantityOnHand}</p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={movementMutation.isPending}
              onClick={closeMovementForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onMovementSubmit}>
            <div className="entity-form-grid">
              <label>
                Tipo de movimiento
                <select {...registerMovement('movementType')}>
                  {Object.entries(movementTypeLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad *
                <input min={1} type="number" {...registerMovement('quantity')} />
                {movementErrors.quantity ? (
                  <span className="field-error">{movementErrors.quantity.message}</span>
                ) : null}
              </label>
              <label className="entity-form-full">
                Comentario
                <textarea rows={2} {...registerMovement('notes')} />
              </label>
            </div>
            {movementMutation.error ? (
              <p className="form-error" role="alert">
                {movementMutation.error instanceof Error
                  ? movementMutation.error.message
                  : 'No se pudo registrar el movimiento.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={movementMutation.isPending}
                onClick={closeMovementForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={movementMutation.isPending} type="submit">
                {movementMutation.isPending ? 'Guardando...' : 'Registrar movimiento'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage="No hay materiales eliminados recientemente."
          getDeletedAt={(material) => material.deletedAt}
          getId={(material) => material.materialId}
          getLabel={(material) => translateBackendSeed(material.name) ?? material.name}
          isLoading={isTrashLoading}
          items={trashedMaterials}
          onClose={closeTrash}
          onRestore={(material) => restoreMaterialMutation.mutate(material.materialId)}
          restoringId={restoreMaterialMutation.isPending ? restoreMaterialMutation.variables : null}
          title="Materiales eliminados"
        />
      ) : null}

      <section className="filters-row filters-row-materials" aria-label="Filtros de materiales">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar material..."
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Categoria"
          onChange={(event) => setCategoryFilter(event.target.value)}
          value={categoryFilter}
        >
          <option value="all">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {translateBackendSeed(category)}
            </option>
          ))}
        </select>
        <select
          aria-label="Stock"
          onChange={(event) => setStockFilter(event.target.value as 'all' | 'low')}
          value={stockFilter}
        >
          <option value="all">Todo el inventario</option>
          <option value="low">Stock bajo</option>
        </select>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          Filtros
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Cantidad</th>
              <th>Minimo</th>
              <th>Unidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((material) => (
              <tr key={material.materialId}>
                <td>
                  <span className="name-cell">
                    <span className="student-avatar">
                      <PackagePlus size={24} aria-hidden="true" />
                    </span>
                    {translateBackendSeed(material.name)}
                  </span>
                </td>
                <td>{material.sku ?? '-'}</td>
                <td>{material.category ? translateBackendSeed(material.category) : '-'}</td>
                <td>{material.quantityOnHand}</td>
                <td>{material.minimumQuantity ?? '-'}</td>
                <td>{material.unit ? translateBackendSeed(material.unit) : '-'}</td>
                <td>
                  <span
                    className={
                      material.lowStock
                        ? 'status-badge status-warning'
                        : material.status === 'ARCHIVED'
                          ? 'status-badge status-neutral'
                          : 'status-badge'
                    }
                  >
                    {material.lowStock ? 'Stock bajo' : statusLabels[material.status]}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button title="Ver" type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => openEditMaterialForm(material)} title="Editar" type="button">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => openMovementForm(material)} title="Registrar movimiento" type="button">
                      <ArrowLeftRight size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => openDeleteConfirm(material)} title="Eliminar" type="button">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8}>Sin materiales para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredMaterials.length} de {materials.length} materiales
          </span>
          <div className="pagination">
            <button aria-label="Pagina anterior" type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button aria-label="Pagina siguiente" type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={deleteStep === 1 ? 'Continuar' : 'Si, eliminar'}
        description={
          deleteTarget
            ? deleteStep === 1
              ? `Se eliminara ${translateBackendSeed(deleteTarget.name) ?? deleteTarget.name}. Vas a tener unos segundos para deshacerlo justo despues, y se puede restaurar manualmente hasta 7 dias.`
              : `Confirma que quieres eliminar ${translateBackendSeed(deleteTarget.name) ?? deleteTarget.name} ahora.`
            : ''
        }
        isConfirming={deleteMaterialMutation.isPending}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          if (deleteStep === 1) {
            setDeleteStep(2)
            return
          }

          if (deleteTarget) {
            deleteMaterialMutation.mutate(deleteTarget.materialId)
          }
        }}
        open={deleteTarget !== null}
        title={deleteStep === 1 ? 'Eliminar este material?' : 'Confirmar eliminacion'}
        variant="danger"
      />

      {deletedMaterial ? (
        <UndoToast
          isActing={restoreMaterialMutation.isPending}
          message={`${translateBackendSeed(deletedMaterial.name) ?? deletedMaterial.name} fue eliminado.`}
          onAction={() => restoreMaterialMutation.mutate(deletedMaterial.materialId)}
          onDismiss={() => setDeletedMaterial(null)}
        />
      ) : null}
    </main>
  )
}
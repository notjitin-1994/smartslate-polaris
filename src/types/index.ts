/**
 * Common types and interfaces used throughout the application
 */

// Re-export database types
export * from './database.types'

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// Common response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Form types
export interface FormField<T = string> {
  value: T
  error?: string
  touched?: boolean
  required?: boolean
}

export interface FormState<T extends Record<string, any>> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Component prop types
export interface WithClassName {
  className?: string
}

export interface WithChildren {
  children?: React.ReactNode
}

export interface WithStyle {
  style?: React.CSSProperties
}

// Event handler types
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void

// Status types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingStatus {
  state: LoadingState
  message?: string
  error?: Error
}

// User types
export interface UserProfile {
  id: string
  email: string
  username?: string
  fullName?: string
  avatarUrl?: string
  bio?: string
  createdAt: string
  updatedAt?: string
}

// Navigation types
export interface NavigationItem {
  id: string
  label: string
  path?: string
  icon?: React.ReactNode
  badge?: string | number
  children?: NavigationItem[]
  disabled?: boolean
}

// Filter and sort types
export interface FilterOption<T = string> {
  value: T
  label: string
  count?: number
}

export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
  label?: string
}

export interface SearchParams {
  query?: string
  filters?: Record<string, any>
  sort?: SortOption
  page?: number
  pageSize?: number
}

// Theme types
export interface Theme {
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    error: string
    warning: string
    success: string
    info: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  breakpoints: {
    mobile: string
    tablet: string
    desktop: string
    wide: string
  }
}

// Action types for reducers
export interface Action<T = any> {
  type: string
  payload?: T
  error?: boolean
  meta?: any
}

// Async action types
export interface AsyncAction<T = any> extends Action<T> {
  loading?: boolean
  success?: boolean
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

// Table types
export interface TableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T, index: number) => React.ReactNode
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (column: TableColumn<T>) => void
  onRowClick?: (row: T, index: number) => void
  rowKey?: keyof T | ((row: T) => string | number)
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// File types
export interface FileUpload {
  file: File
  progress?: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  url?: string
}

// Date range types
export interface DateRange {
  start: Date | string
  end: Date | string
}

// Geo types
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  coordinates?: Coordinates
}

// Permission types
export interface Permission {
  resource: string
  action: string
  granted: boolean
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

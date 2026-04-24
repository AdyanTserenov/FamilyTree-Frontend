// Auth types
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response wrappers
//
// Two different shapes exist in the backend:
//
// 1. auth-service (auth-service/dto/CustomApiResponse.java):
//      { status: "success"|"error", data: T, error: string|null, details: {...}|null }
//
// 2. tree-service (family-tree-auth-starter/dto/CustomApiResponse.java):
//      { success: boolean, message: string|null, data: T }
//
// Use AuthApiResponse for authApi calls, ApiResponse for treeApi calls.
// ─────────────────────────────────────────────────────────────────────────────

/** Used for auth-service responses (authApi + /api/profile via treeApi) */
export interface AuthApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  error: string | null;
  details?: Record<string, unknown> | null;
}

/** Used for tree-service responses (treeApi) */
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

// Tree types
export type TreeRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Tree {
  id: number;
  name: string;
  role: TreeRole;
  createdAt: string;
  updatedAt?: string;
  memberCount?: number;
  personCount?: number;
  publicLinkToken?: string;
}

export interface TreeMember {
  userId: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  role: TreeRole;
  joinedAt: string;
}

// Person types
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Person {
  id: number;
  treeId: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  occupation?: string;
  biography?: string;
  gender: Gender;
  avatarUrl?: string;
  relationships?: Relationship[];
  fullName?: string;
  createdAt?: string;
  updatedAt?: string;
  mediaCount?: number;
}

export interface PersonRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  occupation?: string;
  biography?: string;
  gender: Gender;
}

// Relationship types
export type RelationshipType = 'PARENT_CHILD' | 'PARTNERSHIP';

/** Краткое представление персоны, возвращаемое внутри связи */
export interface PersonSummary {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Relationship {
  id: number;
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
  person1?: PersonSummary;
  person2?: PersonSummary;
  startDate?: string;
  endDate?: string;
}

export interface RelationshipRequest {
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
  startDate?: string;
  endDate?: string;
}

// Comment types
export interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  personId: number;
  parentCommentId?: number;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface CommentRequest {
  content: string;
  parentCommentId?: number;
}

// Media types
export type MediaFileType = 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO';

export interface MediaFile {
  id: number;
  personId?: number;
  treeId: number;
  fileName: string;
  fileType: MediaFileType;
  description?: string;
  fileSize: number;
  uploadedAt: string;
  uploadedById: number;
  /** Presigned URL для временного доступа к файлу (60 мин) */
  url: string;
}

// Notification types — must match backend NotificationType enum exactly
export type NotificationType =
  | 'COMMENT_ADDED'
  | 'PERSON_ADDED'
  | 'PERSON_UPDATED'
  | 'MEMBER_JOINED'
  | 'INVITATION_SENT';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// AI types
export interface AiRequest {
  biography: string;
  personId?: number;
}

export interface AiResponse {
  dates: string[];
  places: string[];
  professions: string[];
  events: string[];
  summary: string;
  success: boolean;
  errorMessage?: string;
}

// Invite types
export interface InviteRequest {
  email: string;
  role: TreeRole;
}

export interface InviteLinkResponse {
  inviteLink: string;
  token: string;
}

// History types (п.6.5 ТЗ)
export interface PersonHistoryEntry {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userName: string;
  createdAt: string;
}

// Pagination response types
export interface PagedCommentsResponse {
  data: Comment[];
  totalCount: number;
  hasMore: boolean;
}

export interface PagedNotificationsResponse {
  data: Notification[];
  totalCount: number;
  hasMore: boolean;
}

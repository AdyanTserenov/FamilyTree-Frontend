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

// API Response wrapper
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
  memberCount?: number;
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
  biography?: string;
  gender: Gender;
  avatarUrl?: string;
  relationships?: Relationship[];
  fullName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  biography?: string;
  gender: Gender;
}

// Relationship types
export type RelationshipType = 'PARENT_CHILD' | 'PARTNERSHIP';

export interface Relationship {
  id: number;
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
  person1?: Person;
  person2?: Person;
}

export interface RelationshipRequest {
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
}

// Graph types
export interface GraphData {
  persons: Person[];
  relationships: Relationship[];
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

// Notification types
export type NotificationType = 'INVITE' | 'COMMENT' | 'SYSTEM';

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

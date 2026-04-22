import { treeApi } from './axiosConfig';
import type {
  ApiResponse,
  Tree,
  TreeMember,
  InviteRequest,
  InviteLinkResponse,
  Person,
  PersonRequest,
  Relationship,
  RelationshipRequest,
  Comment,
  CommentRequest,
  MediaFile,
  Notification,
  AiRequest,
  AiResponse,
  PersonHistoryEntry,
} from '../types';

// Trees
export const treeService = {
  getTrees: async (): Promise<ApiResponse<Tree[]>> => {
    const response = await treeApi.get<ApiResponse<Tree[]>>('/trees');
    return response.data;
  },

  createTree: async (name: string, description?: string): Promise<ApiResponse<Tree>> => {
    const response = await treeApi.post<ApiResponse<Tree>>('/trees', { name, description });
    return response.data;
  },

  updateTree: async (treeId: number, name: string): Promise<ApiResponse<Tree>> => {
    const response = await treeApi.put<ApiResponse<Tree>>(`/trees/${treeId}`, { name });
    return response.data;
  },

  deleteTree: async (treeId: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/trees/${treeId}`);
    return response.data;
  },

  getTreeMembers: async (treeId: number): Promise<ApiResponse<TreeMember[]>> => {
    const response = await treeApi.get<ApiResponse<TreeMember[]>>(`/trees/${treeId}/members`);
    return response.data;
  },

  inviteMember: async (treeId: number, data: InviteRequest): Promise<ApiResponse<null>> => {
    const response = await treeApi.post<ApiResponse<null>>(`/trees/${treeId}/invite`, data);
    return response.data;
  },

  getInviteLink: async (treeId: number, email: string, role: string): Promise<ApiResponse<InviteLinkResponse>> => {
    const response = await treeApi.post<ApiResponse<InviteLinkResponse>>(`/trees/${treeId}/invite-link`, { email, role });
    return response.data;
  },

  acceptInvite: async (token: string): Promise<ApiResponse<null>> => {
    const response = await treeApi.get<ApiResponse<null>>(`/trees/invite/${token}`);
    return response.data;
  },

  generatePublicLink: async (treeId: number): Promise<ApiResponse<string>> => {
    const response = await treeApi.post<ApiResponse<string>>(`/trees/${treeId}/public-link`);
    return response.data;
  },

  revokePublicLink: async (treeId: number): Promise<ApiResponse<string>> => {
    const response = await treeApi.delete<ApiResponse<string>>(`/trees/${treeId}/public-link`);
    return response.data;
  },

  getPublicTree: async (token: string): Promise<ApiResponse<Person[]>> => {
    const response = await treeApi.get<ApiResponse<Person[]>>(`/trees/public/${token}`);
    return response.data;
  },

  getMyRole: async (treeId: number): Promise<ApiResponse<string>> => {
    const res = await treeApi.get(`/trees/${treeId}/my-role`);
    return res.data;
  },
};

// Persons
export const personService = {
  getPersons: async (treeId: number): Promise<ApiResponse<Person[]>> => {
    const response = await treeApi.get<ApiResponse<Person[]>>(`/trees/${treeId}/persons`);
    return response.data;
  },

  createPerson: async (treeId: number, data: PersonRequest): Promise<ApiResponse<Person>> => {
    const response = await treeApi.post<ApiResponse<Person>>(`/trees/${treeId}/persons`, data);
    return response.data;
  },

  getPerson: async (treeId: number, personId: number): Promise<ApiResponse<Person>> => {
    const response = await treeApi.get<ApiResponse<Person>>(`/trees/${treeId}/persons/${personId}`);
    return response.data;
  },

  updatePerson: async (treeId: number, personId: number, data: PersonRequest): Promise<ApiResponse<Person>> => {
    const response = await treeApi.put<ApiResponse<Person>>(`/trees/${treeId}/persons/${personId}`, data);
    return response.data;
  },

  deletePerson: async (treeId: number, personId: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/trees/${treeId}/persons/${personId}`);
    return response.data;
  },

  searchPersons: async (treeId: number, query: string): Promise<ApiResponse<Person[]>> => {
    const response = await treeApi.get<ApiResponse<Person[]>>(`/trees/${treeId}/persons/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getGraph: async (treeId: number): Promise<ApiResponse<Person[]>> => {
    const response = await treeApi.get<ApiResponse<Person[]>>(`/trees/${treeId}/persons/graph`);
    return response.data;
  },

  uploadAvatar: async (treeId: number, personId: number, file: File): Promise<ApiResponse<Person>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await treeApi.post<ApiResponse<Person>>(
      `/trees/${treeId}/persons/${personId}/avatar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  addRelationship: async (treeId: number, data: RelationshipRequest): Promise<ApiResponse<Relationship>> => {
    const response = await treeApi.post<ApiResponse<Relationship>>(`/trees/${treeId}/persons/relationships`, data);
    return response.data;
  },

  deleteRelationship: async (treeId: number, data: RelationshipRequest): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/trees/${treeId}/persons/relationships`, { data });
    return response.data;
  },
  getPersonHistory: async (treeId: number, personId: number): Promise<ApiResponse<PersonHistoryEntry[]>> => {
    const response = await treeApi.get<ApiResponse<PersonHistoryEntry[]>>(
      `/trees/${treeId}/persons/${personId}/history`
    );
    return response.data;
  },
};

// Comments
export const commentService = {
  getComments: async (treeId: number, personId: number): Promise<ApiResponse<Comment[]>> => {
    const response = await treeApi.get<ApiResponse<Comment[]>>(`/trees/${treeId}/persons/${personId}/comments`);
    return response.data;
  },

  addComment: async (treeId: number, personId: number, data: CommentRequest): Promise<ApiResponse<Comment>> => {
    const response = await treeApi.post<ApiResponse<Comment>>(`/trees/${treeId}/persons/${personId}/comments`, data);
    return response.data;
  },

  updateComment: async (treeId: number, personId: number, commentId: number, content: string): Promise<ApiResponse<Comment>> => {
    const response = await treeApi.put<ApiResponse<Comment>>(`/trees/${treeId}/persons/${personId}/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (treeId: number, personId: number, commentId: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/trees/${treeId}/persons/${personId}/comments/${commentId}`);
    return response.data;
  },
};

// Media
export const mediaService = {
  getMedia: async (treeId: number, personId: number): Promise<ApiResponse<MediaFile[]>> => {
    const response = await treeApi.get<ApiResponse<MediaFile[]>>(`/trees/${treeId}/persons/${personId}/media`);
    return response.data;
  },

  uploadMedia: async (treeId: number, personId: number, file: File, type: string, description?: string): Promise<ApiResponse<MediaFile>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', type);
    if (description) formData.append('description', description);
    const response = await treeApi.post<ApiResponse<MediaFile>>(
      `/trees/${treeId}/persons/${personId}/media`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  downloadMedia: async (treeId: number, personId: number, fileId: number): Promise<Blob> => {
    const response = await treeApi.get(`/trees/${treeId}/persons/${personId}/media/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteMedia: async (treeId: number, personId: number, fileId: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/trees/${treeId}/persons/${personId}/media/${fileId}`);
    return response.data;
  },
};

// Notifications
export const notificationService = {
  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    const response = await treeApi.get<ApiResponse<Notification[]>>('/notifications');
    return response.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const response = await treeApi.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.put<ApiResponse<null>>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    const response = await treeApi.put<ApiResponse<null>>('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id: number): Promise<ApiResponse<null>> => {
    const response = await treeApi.delete<ApiResponse<null>>(`/notifications/${id}`);
    return response.data;
  },
};

// AI
export const aiService = {
  extractFacts: async (data: AiRequest): Promise<ApiResponse<AiResponse>> => {
    const response = await treeApi.post<ApiResponse<AiResponse>>('/ai/extract-facts', data);
    return response.data;
  },
};

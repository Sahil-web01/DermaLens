const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'PATIENT' | 'CLINICIAN'
  image?: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface Episode {
  id: string
  patientId: string
  procedureLabel: string
  surgeryDate: string
  woundSite?: string
  notes?: string
  status: string
  createdAt: string
  updatedAt: string
  checkIns?: CheckIn[]
}

export interface CheckIn {
  id: string
  episodeId: string
  patientId: string
  capturedAt: string
  imageUrl: string | null
  imageStorageKey?: string
  imageQualityStatus: string
  imageQualityScore?: number
  painScore: number
  redness: boolean
  rednessSpreading?: boolean
  swelling: boolean
  drainage: boolean
  cloudyDrainage?: boolean
  fever: boolean
  temperature?: number
  notes?: string
  aiConcernLevel?: string
  aiScore?: number
  modelVersion?: string
  status: string
  createdAt: string
  updatedAt: string
  clinicianReview?: ClinicalReview
}

export interface ClinicalReview {
  id: string
  checkInId: string
  clinicianId: string
  note?: string
  action: string
  nextCheckInDate?: string
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  relatedEntityType: string
  relatedEntityId: string
  metadata?: Record<string, unknown>
  readAt?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface StatsResponse {
  total: number
  pending: number
  flagged: number
  underReview: number
  reviewed: number
}

export interface EpisodesResponse {
  episodes: Episode[]
}

export interface CheckInResponse {
  checkIn: CheckIn
}

export interface TimelineResponse {
  timeline: CheckIn[]
}

export interface ReviewQueueResponse {
  checkIns: CheckIn[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CheckInDetailResponse {
  checkIn: CheckIn
}

export interface ReviewResponse {
  checkIn: CheckIn
  review: ClinicalReview
}

export interface PatientsResponse {
  patients: (User & { episodes: Episode[] })[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface PatientDetailResponse {
  patient: User
  episodes: (Episode & { checkIns: CheckIn[] })[]
}

export interface ReviewStatsResponse {
  total: number
  pending: number
  flagged: number
  underReview: number
  reviewed: number
}

export interface NotificationsResponse {
  notifications: Notification[]
}

export interface UnreadCountResponse {
  count: number
}

export interface ImageUploadResponse {
  image: {
    key: string
    url: string
    bucket: string
    size: number
    mimetype: string
  }
}

export interface ImageListResponse {
  images: Array<{
    key: string
    size: number
    lastModified: string
    url: string
  }>
}

export interface ImageUrlResponse {
  url: string
  metadata: {
    size: number
    mimetype: string
    lastModified: string
    metadata?: Record<string, unknown>
  }
}

export interface ReportResponse {
  patient: User
  episodes: Episode[]
  checkIns: CheckIn[]
}

class ApiClient {
  private token: string | null = null;
  
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }
  
  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    if (response.status === 204) {
      return undefined as T;
    }
    
    return response.json();
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
}

export const api = new ApiClient();

export const authApi = {
  register: (data: { name: string; email: string; password: string; role?: 'PATIENT' | 'CLINICIAN' }) =>
    api.post<LoginResponse>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<LoginResponse>('/auth/login', data),
  
  logout: () =>
    api.post('/auth/logout', {}),
  
  me: () =>
    api.get<User>('/auth/me'),
  
  updateProfile: (data: { name?: string }) =>
    api.put<User>('/auth/me', data),
  
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/me/password', data),
};

export const patientApi = {
  getEpisodes: () =>
    api.get<EpisodesResponse>('/patient/episodes'),
  
  createEpisode: (data: { procedureLabel: string; surgeryDate: string; woundSite?: string; notes?: string }) =>
    api.post<{ episode: Episode }>('/patient/episodes', data),
  
  getEpisode: (id: string) =>
    api.get<{ episode: Episode }>(`/patient/episodes/${id}`),
  
  createCheckIn: (formData: FormData) =>
    api.upload<CheckInResponse>('/patient/checkins', formData),
  
  getCheckIn: (id: string) =>
    api.get<CheckInDetailResponse>(`/patient/checkins/${id}`),
  
  getTimeline: (episodeId: string) =>
    api.get<TimelineResponse>(`/patient/episodes/${episodeId}/timeline`),
};

export const clinicianApi = {
  getReviewQueue: (params: { status?: string; quality?: string; aiConcern?: string; search?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    return api.get<ReviewQueueResponse>(`/clinician/review-queue?${searchParams}`);
  },
  
  getStats: () =>
    api.get<StatsResponse>('/clinician/stats'),
  
  getCheckIn: (id: string) =>
    api.get<CheckInDetailResponse>(`/clinician/checkins/${id}`),
  
  reviewCheckIn: (id: string, data: { note?: string; action: string; nextCheckInDate?: string }) =>
    api.post<ReviewResponse>(`/clinician/checkins/${id}/review`, data),
  
  getPatients: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    return api.get<PatientsResponse>(`/clinician/patients?${searchParams}`);
  },
  
  getPatient: (id: string) =>
    api.get<PatientDetailResponse>(`/clinician/patients/${id}`),
  
  getReport: (patientId: string) =>
    api.get<ReportResponse>(`/reports/patient/${patientId}`),
};

export const notificationsApi = {
  get: (params: { unreadOnly?: boolean; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    return api.get<NotificationsResponse>(`/notifications?${searchParams}`);
  },
  
  getUnreadCount: () =>
    api.get<UnreadCountResponse>('/notifications/unread-count'),
  
  markRead: (notificationIds: string[]) =>
    api.post('/notifications/read', { notificationIds }),
  
  markAllRead: () =>
    api.post('/notifications/read-all', {}),
  
  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};

export const imagesApi = {
  upload: (file: File, metadata?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('image', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return api.upload<ImageUploadResponse>('/images/upload', formData);
  },
  
  list: (prefix?: string) => {
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    return api.get<ImageListResponse>(`/images/list?${params}`);
  },
  
  get: (key: string) =>
    api.get<ImageUrlResponse>(`/images/${encodeURIComponent(key)}`),
  
  delete: (key: string) =>
    api.delete(`/images/${encodeURIComponent(key)}`),
};

export const reportsApi = {
  getPatientReport: (patientId: string) =>
    api.get<ReportResponse>(`/reports/patient/${patientId}`),
};

// Note: LoginResponse is defined at the top of this file
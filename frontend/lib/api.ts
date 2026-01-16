import type { JobFileCategory } from "@/types/shared/job-file";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export interface Template {
  id: string;
  fileName: string | null;
  displayName: string;
  fileKey: string;
  schemaJson: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunPromptPayload {
  jobId: string;
  fieldName: string;
  prompt: string;
  note?: string;
  fileKeys: string[];
}

export interface RunPromptResponse {
  fieldName: string;
  prompt: string;
  note: string;
  files: string[];
  result: string;
}

export interface RunJobResponse {
  message?: string;
}

export const api = {
  login: async (userName: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ userName, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Logout failed');
    }

    return data;
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to get profile');
    }

    return data;
  },

  getTemplates: async (): Promise<Template[]> => {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch templates');
    }

    return data.data;
  },

  getTemplate: async (id: string): Promise<Template> => {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch template');
    }

    return data.data;
  },

  createJob: async (jobData: {
    userId: string;
    templateId: string;
    title: string;
    templateJson: any;
    files: Array<{
      fileName: string;
      fileKey?: string;
      assistantFileId?: string;
      category: JobFileCategory;
    }>;
  }) => {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create job');
    }

    return data.data;
  },

  updateJob: async (jobId: string, jobData: {
    title?: string;
    templateJson?: any;
    files?: Array<{
      fileName: string;
      fileKey?: string;
      assistantFileId?: string;
      category: JobFileCategory;
    }>;
  }) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update job');
    }

    return data.data;
  },

  deleteJobFiles: async (jobId: string, fileKeys: string[]) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/files`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKeys }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete files');
    }

    return data.data;
  },

  getJob: async (jobId: string) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch job');
    }

    return data.data;
  },

  getJobsByUserId: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/jobs/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch jobs');
    }

    return data.data;
  },

  getFileDownloadUrl: async (fileKey: string) => {
    const response = await fetch(
      `${API_BASE_URL}/jobs/download-url?fileKey=${encodeURIComponent(
        fileKey,
      )}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Failed to get download URL');
    }

    return data;
  },

  getPresignedUrl: (
    jobId: string,
    data: {
      fileName: string;
      category: JobFileCategory;
      contentType: string;
    },
  ) => {
    return fetch(`${API_BASE_URL}/jobs/${jobId}/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        jobId,
      }),
    })
      .then((response) => response.json())
      .then((payload) => {
        return payload;
      });
  },

  copyJob: async (jobId: string) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to copy job');
    }

    return data.data;
  },

  downloadJobExcel: async (jobId: string) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/download-excel`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to download Excel file');
    }

    // Get the blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `job_${jobId}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
        // Decode URI component if needed
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // If decoding fails, use as is
        }
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },  
  runPrompt: async (payload: RunPromptPayload): Promise<RunPromptResponse> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(payload.jobId)}/run-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        fieldName: payload.fieldName,
        prompt: payload.prompt,
        note: payload.note,
        fileKeys: payload.fileKeys,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to run prompt');
    }

    return data.data;
  },
  runJob: async (jobId: string): Promise<RunJobResponse> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to start job');
    }

    return data.data;
  },
};


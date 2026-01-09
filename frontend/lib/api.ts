import type { JobFileCategory } from "@/types/shared/job-file";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


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

export const api = {
  login: async (userName: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  },

  getTemplates: async (): Promise<Template[]> => {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
      category: JobFileCategory;
    }>;
  }) => {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      category: JobFileCategory;
    }>;
  }) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update job');
    }

    return data.data;
  },

  getJob: async (jobId: string) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch jobs');
    }

    return data.data;
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
  }
};


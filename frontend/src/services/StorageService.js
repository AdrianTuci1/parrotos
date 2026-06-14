import { apiClient } from "./ApiClient";

class StorageService {
  async listVolumes(orgId, projectId) {
    return apiClient.get(`/organizations/${orgId}/projects/${projectId}/storage/volumes`);
  }

  async listFiles(orgId, projectId, volumeName, path = "") {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    return apiClient.get(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}/files${query}`);
  }

  async deleteVolume(orgId, projectId, volumeName) {
    return apiClient.delete(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}`);
  }

  async deleteFile(orgId, projectId, volumeName, filePath) {
    const query = `?path=${encodeURIComponent(filePath)}`;
    return apiClient.delete(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}/files${query}`);
  }

  async createFolder(orgId, projectId, volumeName, folderPath) {
    return apiClient.post(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}/folders`, { folderPath });
  }

  async getUploadUrl(orgId, projectId, volumeName, filePath) {
    return apiClient.post(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}/upload-url`, { filePath });
  }

  async getDownloadUrl(orgId, projectId, volumeName, filePath) {
    return apiClient.post(`/organizations/${orgId}/projects/${projectId}/storage/volumes/${volumeName}/download-url`, { filePath });
  }
}

export const storageService = new StorageService();

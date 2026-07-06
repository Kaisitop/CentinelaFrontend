import { api } from "./api";

export type MediaUploadKind = "reporte" | "evidencia";

export interface MediaUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export const mediaService = {
  async uploadImage(
    file: File,
    tipo: MediaUploadKind = "reporte",
  ): Promise<MediaUploadResult> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<MediaUploadResult>(
      `/media/upload?tipo=${tipo}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },
};

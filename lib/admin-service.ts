import { api } from "./api";

export interface PurgeDemoDataResult {
  message: string;
  app?: {
    message: string;
    deleted: Record<string, number>;
  };
  users?: {
    message: string;
    deleted: {
      usuariosEliminados: number;
      usuariosConservados: number;
      auditLogsEliminados: number;
    };
    seedEmails: string[];
  };
}

export const adminService = {
  async purgeDemoData(confirmPhrase: string): Promise<PurgeDemoDataResult> {
    const { data } = await api.post<PurgeDemoDataResult>("/admin/purge-demo-data", {
      confirmPhrase,
    });
    return data;
  },
};

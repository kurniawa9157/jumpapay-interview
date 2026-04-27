export interface FileData {
  name: string;
  size: number;
  type: string;
  dataUrl?: string | ArrayBuffer | null;
}

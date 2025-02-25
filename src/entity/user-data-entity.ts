export interface UserDataReq {
  id: string;
  bod: string;
  iis: string;
  userid: number;
}

export interface UserDataReplay {
  imageCaptcha?: string;
  screenshot?: string;
  excelData?: { [key: string]: any[] } | null;
}

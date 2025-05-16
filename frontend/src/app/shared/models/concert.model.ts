export interface Concert {
  _id: string;
  tit: string;
  sdt: string[];
  prc: number[];
  pdt: string[];
  loc: string[];
  cit: string;
  int?: string;
  web?: string;
  url?: string;
  pin?: string;
  tim: Date | string;
}

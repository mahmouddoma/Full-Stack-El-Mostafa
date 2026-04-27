export interface OriginApi {
  id: string;
  flag: string;
  country: string;
  country_ar?: string;
  focus: string;
  featuredItems: number;
  status: string;
}

export interface OriginPayload {
  flag: string;
  country: string;
  country_ar?: string;
  focus: string;
  featuredItems: number;
  status: string;
}

export interface OriginCreatePayload extends OriginPayload {
  id: string;
}

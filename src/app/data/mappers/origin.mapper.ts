import { Origin } from '../../domain/models/origin.model';

export class OriginMapper {
  static fromJson(json: any): Origin {
    return {
      id: json.id,
      flag: json.flag,
      country: json.country,
      country_ar: json.country_ar,
      products: (json.products ?? []) as string[],
      focus: json.focus,
      featuredItems: json.featuredItems,
      status: json.status,
    };
  }
}

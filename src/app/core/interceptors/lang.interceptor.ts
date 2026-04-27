import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { API_ROOT_URL } from '../config/api.config';

export const langInterceptor: HttpInterceptorFn = (request, next) => {
  const langService = inject(LanguageService);
  const currentLang = langService.currentLang();
  const isApiRequest = request.url.startsWith(API_ROOT_URL);

  if (!isApiRequest) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'Accept-Language': currentLang,
      },
    }),
  );
};

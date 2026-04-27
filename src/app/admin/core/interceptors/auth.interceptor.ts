import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL, API_ROOT_URL } from '../../../core/config/api.config';
import { AdminAuthService } from '../services/admin-auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AdminAuthService);
  const accessToken = auth.session()?.accessToken;
  const isApiRequest = request.url.startsWith(API_ROOT_URL);
  const isPublicAuthRequest = [
    `${API_BASE_URL}/auth/request-code`,
    `${API_BASE_URL}/auth/verify-code`,
    `${API_BASE_URL}/auth/login`,
    `${API_BASE_URL}/auth/refresh`,
  ].some((url) => request.url.startsWith(url));

  if (!accessToken || !isApiRequest || isPublicAuthRequest) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};

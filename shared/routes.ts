import { z } from 'zod';
import { insertPlayerSchema, players, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    }
  },
  players: {
    list: {
      method: 'GET' as const,
      path: '/api/players' as const,
      responses: {
        200: z.array(z.custom<typeof players.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/players/:id' as const,
      responses: {
        200: z.custom<typeof players.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/players' as const,
      input: insertPlayerSchema,
      responses: {
        201: z.custom<typeof players.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/players/:id' as const,
      input: insertPlayerSchema.partial(),
      responses: {
        200: z.custom<typeof players.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/players/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  upload: {
    create: {
      method: 'POST' as const,
      path: '/api/upload' as const,
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

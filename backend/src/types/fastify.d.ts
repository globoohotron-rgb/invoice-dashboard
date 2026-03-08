export {} // must be a module so declare module blocks are augmentations, not replacements

// Augment the main fastify module (for module-level imports)
declare module 'fastify' {
  interface FastifyRequest {
    user: { userId: string; role: string }
  }
}

// Augment sub-path modules used in route files
declare module 'fastify/types/instance' {
  interface FastifyInstance {
    jwt: {
      sign(payload: object, options?: object): string
      verify(token: string): object
    }
  }
}

declare module 'fastify/types/request' {
  interface FastifyRequest {
    user: { userId: string; role: string }
    cookies: Record<string, string | undefined>
  }
}

declare module 'fastify/types/reply' {
  interface FastifyReply {
    setCookie(name: string, value: string, options?: object): this
    clearCookie(name: string, options?: object): this
  }
}

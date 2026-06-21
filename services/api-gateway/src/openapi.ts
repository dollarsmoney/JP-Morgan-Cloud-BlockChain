/** Hand-authored OpenAPI 3 spec for the public REST surface (served at /docs). */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BlockChain Fintech Platform API',
    version: '1.0.0',
    description:
      'Public REST gateway. Authenticate via /auth/login to obtain a Bearer access token; ' +
      'the refresh token is stored in an httpOnly cookie.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              traceId: { type: 'string' },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { type: 'object' },
          accessToken: { type: 'string' },
          expiresIn: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'firstName', 'lastName'], properties: { email: { type: 'string' }, password: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' } } } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } } },
      },
    },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate access token using refresh cookie', security: [], responses: { '200': { description: 'OK' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout (revoke refresh token)', security: [], responses: { '200': { description: 'OK' } } } },
    '/users/me': {
      get: { tags: ['Users'], summary: 'Get my profile', responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Users'], summary: 'Update my profile', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, phone: { type: 'string' } } } } } }, responses: { '200': { description: 'OK' } } },
    },
    '/users/me/avatar': { post: { tags: ['Users'], summary: 'Upload avatar', requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } }, responses: { '200': { description: 'OK' } } } },
    '/wallets': {
      get: { tags: ['Wallets'], summary: 'List my wallets', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Wallets'], summary: 'Create a wallet', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string' }, currency: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/wallets/{id}': { get: { tags: ['Wallets'], summary: 'Get wallet', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/wallets/{id}/balance': { get: { tags: ['Wallets'], summary: 'Get wallet balance', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/transactions': {
      get: { tags: ['Transactions'], summary: 'Transaction history', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'pageSize', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      post: { tags: ['Transactions'], summary: 'Send a transaction', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fromAddress', 'toAddress', 'amount'], properties: { fromAddress: { type: 'string' }, toAddress: { type: 'string' }, amount: { type: 'string' }, fee: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/transactions/{id}': { get: { tags: ['Transactions'], summary: 'Get transaction', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/transactions/{id}/status': { get: { tags: ['Transactions'], summary: 'Get transaction status', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/blockchain/chain': { get: { tags: ['Blockchain'], summary: 'Get the chain', responses: { '200': { description: 'OK' } } } },
    '/blockchain/validate': { get: { tags: ['Blockchain'], summary: 'Validate the chain', responses: { '200': { description: 'OK' } } } },
    '/blockchain/mine': { post: { tags: ['Blockchain'], summary: 'Mine a block (ADMIN)', responses: { '200': { description: 'OK' } } } },
    '/notifications': { get: { tags: ['Notifications'], summary: 'List notifications', responses: { '200': { description: 'OK' } } } },
    '/notifications/unread-count': { get: { tags: ['Notifications'], summary: 'Unread count', responses: { '200': { description: 'OK' } } } },
    '/notifications/{id}/read': { post: { tags: ['Notifications'], summary: 'Mark read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/analytics/summary': { get: { tags: ['Analytics'], summary: 'Dashboard summary', responses: { '200': { description: 'OK' } } } },
    '/audit/logs': { get: { tags: ['Audit'], summary: 'Query audit logs (ADMIN)', responses: { '200': { description: 'OK' } } } },
  },
};

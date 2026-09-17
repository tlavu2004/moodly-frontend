export default {
  // The backend OpenAPI document is the source of truth for generated files.
  input: '../moodly-backend/docs/api/moodly-openapi.json',
  output: {
    fileName: {
      name: '{{name}}.api',
      suffix: '',
    },
    path: 'src/api/openapi',
  },
  plugins: [
    '@hey-api/client-fetch',
    {
      name: '@hey-api/sdk',
      auth: true,
    },
  ],
}

# Skland Proxy

Local proxy service for Skland wiki requests.

## Endpoints

- `GET /health`
- `GET /proxy-request` with headers:
  - `x-method`: `GET|POST|PUT|DELETE`
  - `x-url`: full target URL
  - `x-token` (optional)
  - `x-data` (optional JSON string)

Response format:

```json
{
  "success": true,
  "data": { "code": 0, "message": "OK", "data": {} }
}
```

## Run

```bash
npm install
npm run server
```

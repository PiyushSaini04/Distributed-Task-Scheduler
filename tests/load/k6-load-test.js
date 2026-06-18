import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.post(
    'http://localhost:3000/api/jobs',
    JSON.stringify({
      type: 'email',
      payload: { to: 'test@example.com' },
      idempotencyKey: `${__VU}-${__ITER}-${Date.now()}`,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has jobId': (r) => JSON.parse(r.body as string).jobId !== undefined,
  });

  sleep(0.1);
}

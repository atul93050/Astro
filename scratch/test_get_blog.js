import http from 'http';

const options = {
  hostname: 'localhost',
  port: 4322,
  path: '/api/blog-crud?action=get&slug=atul-2026',
  method: 'GET',
  headers: {
    'Cookie': 'cms_session=authenticated-admin-session-2026'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();

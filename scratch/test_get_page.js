import http from 'http';

const options = {
  hostname: 'localhost',
  port: 4321,
  path: '/api/pages-crud?action=get&slug=home',
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
    console.log('BODY LENGTH:', body.length);
    if (body.length < 500) {
      console.log('BODY:', body);
    } else {
      console.log('BODY SAMPLE:', body.slice(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();

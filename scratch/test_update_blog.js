import http from 'http';

const payload = {
  action: 'update',
  originalSlug: 'atul-2026',
  title: 'atul 2026 Updated Test',
  slug: 'atul-2026',
  excerpt: 'this is a test excerpt updated',
  author: 'author-admin',
  category: 'uncategorized',
  tags: ['web-development'],
  featuredImage: '',
  status: 'draft',
  publishDate: '',
  scheduledDate: '',
  body: '<p>Lorem 3000 Updated</p>',
  headerScripts: '',
  footerScripts: '',
  customCss: '',
  customJs: '',
  seo: {
    metaTitle: 'Hello Atul Updated',
    metaDescription: 'Helo des Updated',
    focusKeyword: '',
    canonicalUrl: '',
    robots: 'noindex, nofollow',
    ogImage: '',
    schemaMarkup: '',
    schemaType: 'custom'
  }
};

const payloadStr = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 4322,
  path: '/api/blog-crud',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadStr),
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

req.write(payloadStr);
req.end();

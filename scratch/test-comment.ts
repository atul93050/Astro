import { POST } from "../src/pages/api/blog-crud";

async function run() {
  console.log("Starting test...");
  const mockRequest = new Request("http://localhost/api/blog-crud", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "comment",
      postSlug: "test-post",
      authorName: "Test User",
      authorEmail: "test@example.com",
      body: "This is a test comment from script"
    })
  });

  const mockCookies = {
    get: () => ({ value: "" })
  };

  try {
    const response = await POST({
      request: mockRequest,
      cookies: mockCookies,
      params: {},
      url: new URL("http://localhost/api/blog-crud"),
      clientAddress: "127.0.0.1",
      locals: {},
      redirect: () => {},
      site: undefined,
      generator: "",
      response: new Response(),
      self: () => {},
      resolve: () => {},
      props: {}
    } as any);

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

run();


exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  if (!process.env.RAPIDAPI_KEY) {
    return json(503, { error: "Downloader is not configured on this site." });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!url || !/^https?:\/\//i.test(url)) {
      return json(400, { error: "Please enter a valid http/https URL." });
    }

    const response = await fetch(
      "https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        },
        body: JSON.stringify({ url }),
      }
    );

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return json(response.ok ? 200 : response.status || 502, data);
  } catch {
    return json(502, { error: "Downloader service could not be reached." });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

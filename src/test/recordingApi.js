/* A stand-in for createApiClient() (db/apiClient.js) in unit tests of a
   feature's HTTP client. It records every request instead of sending it,
   and answers from `responses`, keyed "METHOD /path":

     const { api, calls } = recordingApi({ "GET /me/notes": [note] });
     await createHttpNotesClient(api).listMine();
     expect(calls).toEqual([{ method: "GET", path: "/me/notes" }]);

   An answer may be a value, a function of the request body, or an
   ApiError to reject with. A request with no answer resolves undefined. */
export function recordingApi(responses = {}) {
  const calls = [];
  const send = (method) => async (path, body) => {
    calls.push(body === undefined ? { method, path } : { method, path, body });
    const answer = responses[`${method} ${path}`];
    if (answer instanceof Error) throw answer;
    return typeof answer === "function" ? answer(body) : answer;
  };
  return {
    calls,
    api: { get: send("GET"), post: send("POST"), put: send("PUT"), patch: send("PATCH"), delete: send("DELETE") },
  };
}

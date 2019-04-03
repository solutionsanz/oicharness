## Refresh token demonstration for IDCS

This is a demo designed to showcase the use and revocation of refresh tokens in IDCS.

This has a protected index.html which requires a 3-legged flow for login. This login obtains an access token and a refresh token. As part of the demo, it is intended that the application has a very short access token expiry, say 1 minute.

The index provides an option to invoke an API which validates the access token. This flow is as follows:
1. Client invokes a local API (i.e. on a relative path)
2. Local API invokes an API running on a different port, passing the JWT as Authorisation
3. Other API validates the JWT - and returns 401 if it has expired
4. Local API, on a 401, attempts to exchange the refresh token for a new access token, then retries the API call
5. Local API returns the remote result (plus debug information on the refresh cycle if that was performed) (and new JWT token in Set-Cookie header)

Additional option to revoke the refresh token, which makes the call to IDCS, but keeps the stored local copy - to demonstrate the failure to cycle the access token.

Has the following:

/index.html - UI for demonstrating flows
/callback - callback endpoint for Auth Code flow
/test-api - test API invocation which rotates tokens using the refresh token
/revoke-refresh - revokes the refresh token

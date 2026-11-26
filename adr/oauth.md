# Oauth

## Decision

Vanilla JS, client-side oauth. Refer to [oauth-client-browser](https://www.npmjs.com/package/@atproto/oauth-client-browser?activeTab=readme) for guide on decision we made.

## Context

OAuth is commonly used in AT Protocol for security over username/password. This is heavily document [here](https://atproto.com/specs/oauth). The summary version is that AT Protocol can adapt numerous different app views, and OAuth allows a secure mechanism to give an app view access without giving away the user's credentials. This is a common security pattern, for obvious reasons that giving an application access to user's username and password is highly unsecure.

## Alternatives

Refer to [about-oauth](https://atproto.com/guides/about-oauth) for different alternatives. Ultimately, we chose client-side because our application is primarily client-side when starting off. It is HIGHLY recommended if a backend is introduced to the project to conver to a BFF (Backend for front-end) authentication mechanism, instead of Web SPA (single page application).




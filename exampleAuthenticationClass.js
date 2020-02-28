import auth0 from 'auth0-js';
import jwt_decode from 'jwt-decode';

import { CALLBACK_URL } from '../config/callback-config';

////////////////////////////////////////////////////////
// Lots of action takes place during authentication. Not only to do we use
// Auth0 to actually authenticate our users, but we also need to build the user
// profile that we place on the Redux store for use by the client. To do this we
// combine parameters from both the Auth0 token AND data from our internal USERS
// table. This give us access to params from Auth0 to control API access and our
// internal role, location, department settings that we use everywhere when
// sending performedBy, assigned information to the backend and to filter
// various views and dropdowns on the client. It's important to understand that
// the base RootScene view is where the isAuthenticated check actually occurs,
// so if you start there you should be able to reason about the process by
// reading the code. Lots of action takes place on the Nav componentDidMount
// because this a global component that loads immediatly after a user auths.
////////////////////////////////////////////////////////

export default class Auth {

  // This code block sets the authentication request parameters that are sent
  // to Auth0. The redirectUri needs to be changed for your environment type as
  // this is where the callback URL will go. The SCOPE parameter is also
  // important. This is where you request the parameters from Auth0 that you
  // want encode in the returned JWT token. See:
  // https://auth0.com/docs/tokens
  
  auth0 = new auth0.WebAuth({
    domain: 'xxxxxxxxx.auth0.com',
    clientID: 'xxxxxxxxx',
    // redirectUri: `${CALLBACK_URL}/authentication/auth0/callback`,
    redirectUri: `${CALLBACK_URL}/xxxxxxxxx/callback`,
    audience: 'https://xxxxxxxxx.xxxxxxxxx/private/api',
    responseType: 'token id_token',
    // All necessary scope must be requested here on token request
    scope: 'email read:all write:all'
  });

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getProfile = this.getProfile.bind(this);
  }


  // This is the function that executes on the callback from auth0. It looks to
  // the callback URL, parses it and sets the decoded token in the URL into
  // local storage. The token includes an expiration time and all user data from
  // the Auth0 side of things.
  handleAuthentication() {
    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
        // history.replace('/');
        // window.location = '/';
      } else if (err) {
        window.location = '/crm';
        console.log(err);
      }
    });
  }

  // This is executed during the authentication callback process. You can see
  // what is set to localStorage here. Once localStorage is set we tell the
  // program to nav back to home at '/'
  setSession(authResult) {
    // Set the time that the access token will expire at
    let expiresAt = JSON.stringify((authResult.expiresIn * 1000) + new Date().getTime());
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', expiresAt);
    // navigate to the home route
    window.location = '/crm';
  }

  logout() {
    // Clear access token and ID token from local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('roles_groups_token');
    // navigate to the home route
    window.location = '/crm/';
  }

  // This function is called by the RootScene component to check if a users has
  // a valid token in localStorage. The token must be both valid AND not expired
  isAuthenticated() {
    // Check whether the current time is past the
    // access token's expiry time
    let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    return new Date().getTime() < expiresAt;
  }

  // Helper function that uses the Auth0 library to bring up the hosted auth
  // page
  login() {
    this.auth0.authorize();
  }

  // Called on the RootScene... we use the email parameter of the
  // id_token(requested in scope of initial auth0 service params) to make calls
  // to both the Auth0 management API (https://auth0.com/docs/api/management/v2)
  // and our backend user API. Email is the common key we use to search both
  // APIs. Profile data is combined on the backend into a profile object that is
  // returned to the Redux store.
  
  getUserEmail() {
    const idToken = localStorage.getItem('id_token');
    if (!idToken) {
      throw new Error('No access token found');
    }
    const decoded = jwt_decode(idToken);
    return decoded.email;
  }

  getAccessToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('No access token found');
    }
    return accessToken;
  }

  getProfile(cb) {
    let accessToken = this.getAccessToken();
    this.auth0.client.userInfo(accessToken, (err, profile) => {
      if (profile) {
        this.userProfile = profile;
      }
      cb(err, profile);
    });
  }

  setRolesAndGroupsToken(token) {
    localStorage.setItem('roles_groups_token', token);
  }


}

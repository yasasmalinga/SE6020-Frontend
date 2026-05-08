# How to Set Up AWS Cognito for HireSphere

## 1. Open AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/) and sign in.
2. Set the **region** (e.g. **us-east-1** or **eu-west-1**) in the top-right. Remember it for step 5.

## 2. Create a User Pool

1. In the search bar, type **Cognito** and open **Amazon Cognito**.
2. Click **Create user pool**.
3. **Sign-in experience**
   - Choose **Cognito user pool** (not federated).
   - **User name sign-in option**: choose **Email** or **Username** (or “Allow email and username”). For HireSphere, **Username** is fine so users can pick a username and add email as an attribute.
   - Click **Next**.
4. **Security requirements**
   - **Password policy**: leave default or choose “Cognito defaults”.
   - **Multi-factor authentication**: **No MFA** (or enable if you want).
   - Click **Next**.
5. **Sign-up experience**
   - Leave **Self-registration** enabled so users can sign up from your app.
   - **Required attributes**: add **email** (and **name** if you want).
   - Click **Next**.
6. **Message delivery**
   - **Send email with Cognito** (or use SES later).
   - Click **Next**.
7. **Integrate your app**
   - **User pool name**: e.g. `hiresphere-users`.
   - **Domain**: choose **Use a Cognito domain** and type something like `hiresphere-auth` (must be unique). You’ll get: `https://hiresphere-auth.auth.<region>.amazoncognito.com`.
   - **Initial app client**:
     - **App type**: **Public client** (SPA / React).
     - **App client name**: e.g. `hiresphere-web`.
     - **Don’t** create a client secret (public clients don’t use it).
     - Under **Authentication flows**: enable **ALLOW_USER_PASSWORD_AUTH** and **ALLOW_REFRESH_TOKEN_AUTH** (and **ALLOW_USER_SRP_AUTH** if you use SRP).
     - Under **OpenID Connect scopes**: keep **openid** and **email** (and add **profile** if needed).
   - Click **Next**.
8. **Review and create** → **Create user pool**.

## 3. Get the IDs

After the pool is created:

1. Open your **user pool** (click its name).
2. On the pool’s main page you’ll see:
   - **User pool ID** (e.g. `us-east-1_AbCdEfGhI`). Copy it.
3. Go to **App integration** tab → **App clients and analytics** → click your app client (e.g. `hiresphere-web`).
4. Copy the **Client ID** (long string).

## 4. Enable username/password auth (if you use signIn with username + password)

1. In **App integration** → **App clients** → your client → **Edit**.
2. Under **Authentication flows**, enable:
   - **ALLOW_USER_PASSWORD_AUTH**
   - **ALLOW_REFRESH_TOKEN_AUTH**
3. Save.

## 5. Configure the frontend

1. In the **frontend** folder, create a file named **`.env`** (same folder as `package.json`).
2. Add (use your real values and region):

```env
VITE_USER_POOL_ID=us-east-1_AbCdEfGhI
VITE_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
VITE_COGNITO_REGION=us-east-1
VITE_API_URL=
```

- **VITE_USER_POOL_ID**: from step 3.
- **VITE_USER_POOL_CLIENT_ID**: from step 3.
- **VITE_COGNITO_REGION**: the region where you created the pool (e.g. `us-east-1`, `eu-west-1`).
- **VITE_API_URL**: leave empty when using Vite proxy to Laravel; in production set to your API URL.

3. Restart the dev server:

```bash
cd frontend
npm run dev
```

## 6. Add region to Amplify config (if needed)

If your app still can’t connect, make sure Amplify is configured with the **region**. In `src/main.jsx`, the config should include the region. I’ll add it in the code so Cognito knows which region to use.

## 7. Test

1. Open http://localhost:3000/signup.
2. Sign up with a username, email, and password (min 8 characters by default).
3. Sign in at http://localhost:3000/login with that username and password.

---

## Summary of values you need

| Value                 | Where to get it                          |
|----------------------|-------------------------------------------|
| User pool ID         | Cognito → Your pool → Pool ID            |
| Client ID            | App integration → App clients → Client ID|
| Region               | Same as the region of your user pool     |

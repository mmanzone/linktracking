# Link Tracking Application

A simple, file-based link tracking application for campaigns and analytics.

## How to Run Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Server:**
    ```bash
    node server.js
    ```
-   The application will be available at `http://localhost:3000`.
-   The admin panel is at `http://localhost:3000/admin.html`.
-   The default password is `password`.

## How to Host / Deploy

This application is designed to be hosted on a platform that supports Node.js and persistent storage for file-based data. It will **not** work on static hosting providers like GitHub Pages.

We recommend a service like [Render](https://render.com/) which offers a free tier for Node.js applications and persistent disks.

### Deploying on Vercel with Upstash Redis

This project is configured to deploy seamlessly on Vercel using Upstash Redis for persistent, serverless data storage.

#### Step-by-Step Deployment Guide

1.  **Create a Free Upstash Redis Database:**
    *   Go to [upstash.com](https://upstash.com/) and sign up for a free account.
    *   From your Upstash dashboard, click **"Create Database"**.
    *   **Database Name:** `upstash-kv-linktracking`
    *   Select a primary region and click **"Create"**.
    *   Once the database is created, click the **"Connect"** button. You will see the connection details. Keep this page open.

2.  **Deploy to Vercel:**
    *   Push your project code to a GitHub repository.
    *   Log in to Vercel and import the project from your GitHub repository.
    *   Vercel will automatically detect the project settings.

3.  **Add Environment Variables to Vercel:**
    *   In your Vercel project's dashboard, go to the **"Settings"** tab and then **"Environment Variables"**.
    *   You will need to add two environment variables from your Upstash database's "Connect" page:
        *   `UPSTASH_REDIS_REST_URL`: Copy the `UPSTASH_REDIS_REST_URL` value from Upstash.
        *   `UPSTASH_REDIS_REST_TOKEN`: Copy the `UPSTASH_REDIS_REST_TOKEN` value from Upstash.
    *   Add both variables to your Vercel project.

4.  **Deploy:**
    *   Trigger a new deployment in Vercel to apply the environment variables.
    *   Go to the **"Deployments"** tab, find the latest deployment, and select **"Redeploy"** from the menu.

Your application is now live and will use your Upstash Redis database to store all its data.

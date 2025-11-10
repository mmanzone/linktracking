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

### Deploying on Render

1.  **Fork this repository** to your own GitHub account.
2.  **Create a new "Web Service"** on Render and connect it to your forked repository.
3.  **Configure the service:**
    -   **Environment:** `Node`
    -   **Build Command:** `npm install`
    -   **Start Command:** `node server.js`
4.  **Add a Persistent Disk:**
    -   Go to the "Disks" section for your new service.
    -   Click "New Disk".
    -   **Name:** `data-disk` (or any name)
    -   **Mount Path:** `/data`
    -   **Size:** `1` GB (the smallest size is sufficient)
5.  **Add an Environment Variable:**
    -   Go to the "Environment" section for your service.
    -   Click "New Environment Variable".
    -   **Key:** `DATA_DIR`
    -   **Value:** `/data` (this must match the Mount Path of your disk).
6.  **Deploy:** The application will build and deploy. Your data will be safely stored on the persistent disk.

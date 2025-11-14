# Deployment Instructions

This document provides instructions on how to build and deploy this Next.js application to Firebase App Hosting.

## Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js and npm installed on your local machine. You can download them from [https://nodejs.org/](https://nodejs.org/).
2.  **Firebase CLI:** You need to have the Firebase CLI installed. If you don't have it, you can install it globally using npm:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Account:** You must have a Firebase account and be logged in. To log in, run the following command and follow the prompts:
    ```bash
    firebase login
    ```
4.  **Project Access:** Your Firebase account must have access to the Firebase project this application is a part of.

## Deployment Steps

1.  **Install Dependencies:**
    Make sure all the project dependencies are installed by running:
    ```bash
    npm install
    ```

2.  **Build the Application:**
    Before deploying, you need to create a production build of the application. Run the following command:
    ```bash
    npm run build
    ```
    This will create an optimized build in the `.next` directory.

3.  **Deploy to Firebase:**
    Once the build is complete, you can deploy the application to Firebase App Hosting using the following command:
    ```bash
    firebase deploy
    ```
    The Firebase CLI will read the `apphosting.yaml` file and deploy the application accordingly.

After the deployment is complete, the changes you've made should be live on your published website.

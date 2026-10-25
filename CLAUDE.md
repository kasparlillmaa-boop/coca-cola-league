# Project instructions

## Hosting and deployment

- This is a web app that runs on **Railway**, not on the local computer.
- Railway deploys automatically from the `main` branch of this GitHub repository.
- Do not set up a local server or try to run the app locally.

## Database

- The app uses a **Railway PostgreSQL** database.
- Connect to it through the `DATABASE_URL` environment variable, which Railway provides.
- Do not set up a local database.

## Workflow

- Before every push, run `npm run build` and fix any build errors.
- After each finished task, commit the changes and push them to GitHub (`main`).

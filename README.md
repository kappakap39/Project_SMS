# Node Express & Typescript Starter for 2022
# 
*"A minimally opinionated typescript & express starter for 2022"*

## Usage:

# ติดตั้ง date ในการ settime
*"npm install date-fns or yarn add date-fns"*

You should copy `.env.sample` to `.env` and then:

`yarn install` - Install package.json

`npx prisma generate` - Generate Prisma Client

`npx prisma migrate dev --name init` - Set up Prisma with the init. (This creates a new prisma directory with your Prisma schema file and configures SQLite as your database. You're now ready to model your data and create your database with some tables.)

`yarn dev` - Run the development server.

`yarn test` - Run tests.

`yarn test:watch` - Run tests when files update.

`build:task` - Builds the server.

`build:export` - Export the server docker to node-server.tar file.

## Default endpoints:

A `GET` request to `/` will respond with a description of the application.

A `POST` request to `/` will echo any json sent in the request body.

## Help out

Feedback and contributions are very welcome."# BackEndTest-CPF" 

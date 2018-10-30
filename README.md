# beanpong

CLI-app to generate round robin tournament spread sheets for ping-pong (or other) tournaments.

## Getting started

To use this app, you need to create a Service Account in the Google API console that has
access to the spreadsheet API.

### General

- Rename the `credentials.example.ts` to `credentials.ts`

### Creating the Google Application and the Service Account Credentials

For this application to be able to write data to a spreadsheet, we need to create an application in the Google API Console and create a Service Account. To do so, follow these steps:

1. Create an application in the Google Developer Console.
2. Enable the Google Sheets API
3. When prompted, click the "Create Credentials"-button
4. Select "Google Sheets API" when asked "Which API are you using"
5. Select "Web Server(eg. NodeJS)" when asked "Where will you be calling the API from"
6. Select "Application Data" when asked what data you will be accessing
7. Select "No" when asked "Are you planning to use this API with App Engine or Compute Engine?"
8. Press the "What credentials do i need"-button and Fill out the form. 
9. Stay on this page, since this is where you create the Service account that will be used to access the spreadsheet. Do this by selecting "Project -> Editor" when asked about account role.
10. Download the credentials file
11. Open the file, copy the value of `client_email` into `clientEmail` variable of `credentials.example.ts`
12. Copy the value of `private_key` into the `privateKey` variable of `credentials.example.ts`
13. Rename `credentials.example.ts` to `credentials.ts`
14. Done!

### Creating a spreadsheet

We have to create a spread sheet and make our service account

1. Create a new spreadsheet on your Google Drive
2. Add the service account email as a collaborator for the document. The email is found in the credentials file you downloaded.
3. Add the id of the spreadsheet (found in the last part of the URL) to the `spreadsheetId` variable

### Installing

1. Install the dependencies with `yarn` or `npm install`
2. Compile ts -> js with `yarn compile` or `npm compile` 

### Running

The application is a CLI that accepts one argument, a comma separated list of string representing the different players.

```bash
yarn start jane,alex,sophie,jasmine
```

This will generate a new sheet(tab) in the spreadsheet you created earlier that looks like this

![Image of Sheet](https://raw.githubusercontent.com/alexdriaguine/beanpong/master/example.png)
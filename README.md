# LM Pro - Library Management Software

![Animated Demo](assets/logo/animated-demo.gif)

## Overview
LM Pro is a simple library management system built with Node.js and HTML. It allows administrators to manage books, users, and borrowings efficiently.

## Features
- User authentication (admin login)
- Manage books (add, edit, delete)
- Manage users
- Borrow and return books
- View reports and dashboard

## Project Structure
```
admin.json           # Admin user data
books.json           # Books data
borrowings.json      # Borrowing records
users.json           # User data
main.js              # Main server logic
package.json         # Node.js dependencies
src/                 # HTML frontend files
assets/logo/         # Logo and animated demo
build/               # Build output (if any)
```

## How to Run
1. **Install Node.js** (if not already installed):
   - Download from https://nodejs.org/

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Start the application:**
   ```
   node main.js
   ```
   The server will start, usually on `http://localhost:3000` (check your `main.js` for the exact port).

4. **Open the app:**
   - Open your browser and go to `http://localhost:3000`

## How to Build
This project does not require a build step for basic usage. If you want to bundle or minify assets, you can use tools like Webpack or Parcel (not included by default).

## How It Works
- The backend (`main.js`) serves the HTML files from the `src/` directory and handles API requests for managing books, users, and borrowings.
- Data is stored in JSON files (`books.json`, `users.json`, etc.) for simplicity.
- The frontend (HTML files in `src/`) interacts with the backend via forms and AJAX requests.

## Animated Demo
![Demo Animation](assets/logo/animated-demo.gif)

*If you don't see the animation, make sure `assets/logo/animated-demo.gif` exists. Replace it with your own demo if needed.*

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)

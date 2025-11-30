const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;
let dataPath;
let booksData = [];
let usersData = [];
let borrowingsData = [];
let adminData = [];

// Library ID configuration - Change this to your library's unique ID
const LIBRARY_ID = "LIB001"; // You can change this ID as needed
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
let syncTimer = null;

// Function to get data file path
function getDataPath(filename) {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), filename);
  } else {
    return path.join(__dirname, filename);
  }
}

// Function to load data from JSON files
function loadData() {
  try {
    console.log('Loading data from JSON files...');
    
    // Set data path
    dataPath = app.isPackaged ? app.getPath('userData') : __dirname;
    console.log('Data path:', dataPath);
    
    // Load books data
    const booksPath = getDataPath('books.json');
    if (fs.existsSync(booksPath)) {
      booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    } else {
      booksData = [];
      // Add sample books for testing
      const sampleBooks = [
        {
          id: 1,
          title: 'Sample Book 1',
          author: 'Sample Author 1',
          type: 'novel',
          language: 'English',
          availability: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Sample Book 2',
          author: 'Sample Author 2',
          type: 'story',
          language: 'English',
          availability: 1,
          created_at: new Date().toISOString()
        }
      ];
      booksData = sampleBooks;
      fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
    }
    
    // Load users data
    const usersPath = getDataPath('users.json');
    if (fs.existsSync(usersPath)) {
      usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } else {
      usersData = [];
      // Add sample user for testing
      const sampleUsers = [
        {
          id: 1,
          name: 'Sample User',
          email: 'sample@example.com',
          phone: '123-456-7890',
          address: 'Sample Address',
          created_at: new Date().toISOString()
        }
      ];
      usersData = sampleUsers;
      fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    }
    
    // Load borrowings data
    const borrowingsPath = getDataPath('borrowings.json');
    if (fs.existsSync(borrowingsPath)) {
      borrowingsData = JSON.parse(fs.readFileSync(borrowingsPath, 'utf8'));
    } else {
      borrowingsData = [];
      fs.writeFileSync(borrowingsPath, JSON.stringify(borrowingsData, null, 2));
    }
    
    // Load admin data
    const adminPath = getDataPath('admin.json');
    if (fs.existsSync(adminPath)) {
      adminData = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    } else {
      // Create default admin if not exists
      adminData = [{
        id: 1,
        username: 'admin',
        password: 'admin123', // In production, this should be hashed
        created_at: new Date().toISOString()
      }];
      fs.writeFileSync(adminPath, JSON.stringify(adminData, null, 2));
    }
    
    console.log('Data loaded successfully');
    console.log('Books count:', booksData.length);
    console.log('Users count:', usersData.length);
    console.log('Borrowings count:', borrowingsData.length);
    console.log('Admin count:', adminData.length);
    
  } catch (error) {
    console.error('Failed to load data:', error);
    throw new Error(`Failed to load data: ${error.message}`);
  }
}

// Function to save data to JSON files
function saveData(type) {
  try {
    switch (type) {
      case 'books':
        fs.writeFileSync(getDataPath('books.json'), JSON.stringify(booksData, null, 2));
        break;
      case 'users':
        fs.writeFileSync(getDataPath('users.json'), JSON.stringify(usersData, null, 2));
        break;
      case 'borrowings':
        fs.writeFileSync(getDataPath('borrowings.json'), JSON.stringify(borrowingsData, null, 2));
        break;
      case 'admin':
        fs.writeFileSync(getDataPath('admin.json'), JSON.stringify(adminData, null, 2));
        break;
    }
    console.log(`${type} data saved successfully`);
  } catch (error) {
    console.error(`Failed to save ${type} data:`, error);
    throw error;
  }
}

// Function to sync data with server
function syncDataWithServer() {
  console.log('Syncing data with server...');
  
  try {
    // Prepare data to be sent to server
    const syncData = {
      libraryId: LIBRARY_ID,
      timestamp: new Date().toISOString(),
      books: booksData,
      users: usersData,
      borrowings: borrowingsData
    };
    
    // Convert data to JSON
    const jsonData = JSON.stringify(syncData);
    
    // Configure the HTTP request options
    // Replace with your actual server URL
    const options = {
      hostname: 'your-server-domain.com',
      port: 443,
      path: '/api/sync',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
      }
    };
    
    // Create the request
    const req = https.request(options, (res) => {
      let responseData = '';
      
      // Collect response data
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      // Process the complete response
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Data synced successfully with server');
          console.log('Server response:', responseData);
          
          // You can process the server response here if needed
          try {
            const parsedResponse = JSON.parse(responseData);
            console.log('Sync status:', parsedResponse.status);
          } catch (e) {
            console.error('Error parsing server response:', e);
          }
        } else {
          console.error('Failed to sync data with server. Status code:', res.statusCode);
          console.error('Server response:', responseData);
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      console.error('Error syncing data with server:', error.message);
      // Don't throw error to prevent app crash, just log it
    });
    
    // Send the data
    req.write(jsonData);
    req.end();
    
    console.log('Sync request sent to server');
  } catch (error) {
    console.error('Error preparing data for sync:', error);
    // Don't throw error to prevent app crash, just log it
  }
}

// Add error logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Application Error', `An unhandled promise rejection occurred: ${reason}`);
});

// Initialize database
function initDatabase() {
  try {
    console.log('Initializing database...');
    // Use proper path for packaged app - store in user data directory
    const dbPath = app.isPackaged 
      ? path.join(app.getPath('userData'), 'library.db')
      : path.join(__dirname, 'library.db');
    
    console.log('Database path:', dbPath);
    
    // For packaged app, copy initial database if it doesn't exist
    if (app.isPackaged) {
      const fs = require('fs');
      if (!fs.existsSync(dbPath)) {
        console.log('Copying initial database...');
        const sourcePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'library.db');
        console.log('Source database path:', sourcePath);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, dbPath);
          console.log('Database copied successfully');
        } else {
          console.error('Source database not found at:', sourcePath);
          throw new Error('Initial database not found in resources');
        }
      }
    }
    
    console.log('Opening database...');
    db = new Database(dbPath);
    console.log('Database opened successfully');
    
    // Create tables
    console.log('Creating tables...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('comics', 'story', 'novel', 'high-content')),
        language TEXT NOT NULL,
        availability INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS borrowings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        borrowed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        return_date DATETIME,
        status TEXT DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (book_id) REFERENCES books (id)
      )
    `);
    
    // Create default admin if not exists
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin').get();
    
    if (adminCount.count === 0) {
       console.log('Creating default admin user...');
       const hashedPassword = bcrypt.hashSync('admin123', 10);
       db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', hashedPassword);
       console.log('Default admin user created');
     }
     
     console.log('Database initialization completed successfully');
     return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${error.message}`);
    throw error;
  }
}

function createWindow() {
  try {
    console.log('Creating main window...');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, 'assets', 'logo', 'lg_main.png'),
      show: false
    });

    console.log('Main window created successfully');

    // Hide the menu bar by setting an empty menu
    Menu.setApplicationMenu(null);

    console.log('Loading login page...');
    mainWindow.loadFile('src/login.html');
    
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
      
      // Developer mode disabled - only open DevTools manually if needed
      // if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      //   console.log('Opening DevTools for debugging...');
      //   mainWindow.webContents.openDevTools();
      // }
    });

    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

    // Add error handling for page load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Page load failed:', errorCode, errorDescription);
      dialog.showErrorBox('Page Load Error', `Failed to load page: ${errorDescription}`);
    });

    console.log('Window creation completed successfully');
  } catch (error) {
    console.error('Error creating window:', error);
    dialog.showErrorBox('Window Creation Error', `Failed to create window: ${error.message}`);
    throw error;
  }
}

app.whenReady().then(() => {
  try {
    console.log('App is ready, initializing...');
    loadData(); // Load data from JSON files
    console.log('Data loaded, creating window...');
    createWindow();
    
    // Start the sync timer to sync data with server every 30 minutes
    console.log(`Starting sync timer with interval of ${SYNC_INTERVAL/60000} minutes...`);
    // Perform initial sync after 1 minute to ensure app is fully loaded
    setTimeout(() => {
      syncDataWithServer();
      // Then start regular sync every 30 minutes
      syncTimer = setInterval(syncDataWithServer, SYNC_INTERVAL);
    }, 60000);
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    dialog.showErrorBox('Initialization Error', `Failed to initialize application: ${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('App activated, creating new window...');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  // Clear the sync timer when app is closing
  if (syncTimer) {
    console.log('Clearing sync timer...');
    clearInterval(syncTimer);
    syncTimer = null;
    
    // Perform one final sync before closing
    console.log('Performing final sync before closing...');
    syncDataWithServer();
  }
  
  if (process.platform !== 'darwin') {
    console.log('Quitting application...');
    app.quit();
  }
});

// Add app error handling
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render process gone:', details);
  dialog.showErrorBox('Process Error', `Render process crashed: ${details.reason}`);
});

app.on('child-process-gone', (event, details) => {
  console.error('Child process gone:', details);
  dialog.showErrorBox('Process Error', `Child process crashed: ${details.type}`);
});

// IPC handlers for data operations
ipcMain.handle('login', (event, { username, password }) => {
  try {
    const admin = adminData.find(a => a.username === username);
    
    if (admin && admin.password === password) {
      return { success: true, message: 'Login successful' };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  } catch (error) {
    return { success: false, message: 'Login error: ' + error.message };
  }
});

ipcMain.handle('getDashboardStats', () => {
  try {
    const totalBooks = booksData.length;
    const availableBooks = booksData.filter(book => book.availability === 1).length;
    const borrowedBooks = borrowingsData.filter(borrowing => borrowing.status === 'borrowed').length;
    const totalUsers = usersData.length;
    
    return {
      totalBooks,
      availableBooks,
      borrowedBooks,
      totalUsers
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return null;
  }
});

// Books operations
ipcMain.handle('getBooks', async (event, searchTerm = '') => {
  try {
    if (!searchTerm) {
      return booksData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    const filteredBooks = booksData.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.language.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filteredBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Get books error:', error);
    return [];
  }
});

ipcMain.handle('addBook', async (event, book) => {
  try {
    const newBook = {
      id: booksData.length > 0 ? Math.max(...booksData.map(b => b.id)) + 1 : 1,
      ...book,
      availability: book.availability || 1,
      created_at: new Date().toISOString()
    };
    
    booksData.push(newBook);
    saveData('books');
    
    return { success: true, id: newBook.id };
  } catch (error) {
    console.error('Add book error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('updateBook', async (event, { id, ...book }) => {
  try {
    const bookIndex = booksData.findIndex(b => b.id === id);
    if (bookIndex === -1) {
      return { success: false, message: 'Book not found' };
    }
    
    booksData[bookIndex] = { ...booksData[bookIndex], ...book };
    saveData('books');
    
    return { success: true };
  } catch (error) {
    console.error('Update book error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('deleteBook', async (event, id) => {
  try {
    const bookIndex = booksData.findIndex(b => b.id === id);
    if (bookIndex === -1) {
      return { success: false, message: 'Book not found' };
    }
    
    booksData.splice(bookIndex, 1);
    saveData('books');
    
    return { success: true };
  } catch (error) {
    console.error('Delete book error:', error);
    return { success: false, message: error.message };
  }
});

// Users operations
ipcMain.handle('getUsers', async (event, searchTerm = '') => {
  try {
    if (!searchTerm) {
      return usersData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    const filteredUsers = usersData.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm))
    );
    
    return filteredUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
});

ipcMain.handle('addUser', async (event, user) => {
  try {
    const newUser = {
      id: usersData.length > 0 ? Math.max(...usersData.map(u => u.id)) + 1 : 1,
      ...user,
      created_at: new Date().toISOString()
    };
    
    usersData.push(newUser);
    saveData('users');
    
    return { success: true, id: newUser.id };
  } catch (error) {
    console.error('Add user error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('updateUser', async (event, { id, ...user }) => {
  try {
    const userIndex = usersData.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }
    
    usersData[userIndex] = { ...usersData[userIndex], ...user };
    saveData('users');
    
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, message: error.message };
  }
});

// Delete user
ipcMain.handle('deleteUser', async (event, id) => {
  try {
    const userIndex = usersData.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }
    usersData.splice(userIndex, 1);
    saveData('users');
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, message: error.message };
  }
});

// Borrowing operations
ipcMain.handle('borrowBook', async (event, { userId, bookId }) => {
  try {
    console.log('=== BORROW BOOK PROCESS START ===');
    console.log('Received request:', { userId, bookId, types: { userId: typeof userId, bookId: typeof bookId } });
    
    // Refresh data to ensure we have the latest information
    console.log('Refreshing data...');
    refreshData();
    
    console.log('=== CURRENT DATA STATE ===');
    console.log('Total books:', booksData.length);
    console.log('Total borrowings:', borrowingsData.length);
    console.log('Books data:', booksData.map(b => ({ id: b.id, title: b.title, availability: b.availability, copies: b.copies, idType: typeof b.id })));
    console.log('Borrowings data:', borrowingsData.map(b => ({ id: b.id, user_id: b.user_id, book_id: b.book_id, status: b.status, userType: typeof b.user_id, bookType: typeof b.book_id })));
    
    // Convert bookId to number and check if book is available
    const numericBookId = parseInt(bookId);
    const numericUserId = parseInt(userId);
    console.log('Converted IDs:', { numericBookId, numericUserId, types: { numericBookId: typeof numericBookId, numericUserId: typeof numericUserId } });
    
    const book = booksData.find(b => b.id === numericBookId);
    console.log('Found book:', book);
    
    if (!book) {
      console.error('❌ Book not found!');
      console.error('All books:', booksData.map(b => ({ id: b.id, idType: typeof b.id, title: b.title })));
      return { success: false, message: 'Book not found' };
    }
    
    console.log('=== BOOK DETAILS ===');
    console.log('Book ID:', book.id, 'Type:', typeof book.id);
    console.log('Book Title:', book.title);
    console.log('Book Copies:', book.copies, 'Type:', typeof book.copies);
    console.log('Book Availability:', book.availability, 'Type:', typeof book.availability);
    
    // Check if book has multiple copies
    const totalCopies = parseInt(book.copies) || 1;
    console.log('Total copies (parsed):', totalCopies);
    
    // Count current borrowings for this book
    const currentBorrowings = borrowingsData.filter(b => 
      b.book_id === numericBookId && b.status === 'borrowed'
    );
    console.log('Current borrowings for this book:', currentBorrowings);
    console.log('Currently borrowed copies:', currentBorrowings.length);
    
    // Calculate actual availability
    const actualAvailability = Math.max(0, totalCopies - currentBorrowings.length);
    console.log('Calculated actual availability:', actualAvailability);
    
    // Check if book can be borrowed
    if (actualAvailability <= 0) {
      console.error('❌ Book cannot be borrowed - no copies available');
      console.error('Total copies:', totalCopies);
      console.error('Currently borrowed:', currentBorrowings.length);
      console.error('Calculated availability:', actualAvailability);
      return { success: false, message: 'Book is not available - all copies are borrowed' };
    }
    
    console.log('✅ Book can be borrowed!');
    console.log('Proceeding with borrow...');
    
    // Add borrowing record
    const newBorrowing = {
      id: borrowingsData.length > 0 ? Math.max(...borrowingsData.map(b => b.id)) + 1 : 1,
      user_id: numericUserId,
      book_id: numericBookId,
      status: 'borrowed',
      borrowed_date: new Date().toISOString()
    };
    
    console.log('New borrowing record:', newBorrowing);
    borrowingsData.push(newBorrowing);
    saveData('borrowings');
    console.log('Borrowing record saved');
    
    // Update book availability in the data
    const bookIndex = booksData.findIndex(b => b.id === numericBookId);
    if (bookIndex !== -1) {
      // Don't change the stored availability - let the frontend calculate it
      console.log('Book availability in database remains unchanged (frontend will calculate)');
    }
    
    console.log('=== BORROW PROCESS COMPLETE ===');
    console.log('Book borrowed successfully');
    console.log('Updated borrowings count:', borrowingsData.length);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Borrow book error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('returnBook', async (event, { userId, bookId }) => {
  try {
    console.log('=== RETURN BOOK PROCESS START ===');
    console.log('Received request:', { userId, bookId, types: { userId: typeof userId, bookId: typeof bookId } });
    
    // Convert IDs to numbers
    const numericUserId = parseInt(userId);
    const numericBookId = parseInt(bookId);
    console.log('Converted IDs:', { numericUserId, numericBookId, types: { numericUserId: typeof numericUserId, numericBookId: typeof numericBookId } });
    
    console.log('=== CURRENT DATA STATE ===');
    console.log('Total books:', booksData.length);
    console.log('Total borrowings:', borrowingsData.length);
    
    // Find the borrowing record
    const borrowing = borrowingsData.find(b => b.user_id === numericUserId && b.book_id === numericBookId && b.status === 'borrowed');
    console.log('Found borrowing record:', borrowing);
    
    if (borrowing) {
      console.log('✅ Active borrowing found, updating status...');
      borrowing.status = 'returned';
      borrowing.return_date = new Date().toISOString();
      saveData('borrowings');
      console.log('Borrowing record updated to returned');
    } else {
      console.log('⚠️ No active borrowing found for this user and book');
      console.log('All borrowings:', borrowingsData);
    }
    
    // Find the book
    const book = booksData.find(b => b.id === numericBookId);
    console.log('Book found:', book);
    
    if (book) {
      console.log('=== BOOK DETAILS ===');
      console.log('Book ID:', book.id);
      console.log('Book Title:', book.title);
      console.log('Book Copies:', book.copies);
      console.log('Book Availability (stored):', book.availability);
      
      // Count current borrowings for this book
      const currentBorrowings = borrowingsData.filter(b => 
        b.book_id === numericBookId && b.status === 'borrowed'
      );
      console.log('Current borrowings after return:', currentBorrowings);
      console.log('Currently borrowed copies:', currentBorrowings.length);
      
      // Calculate new availability
      const totalCopies = parseInt(book.copies) || 1;
      const newAvailability = Math.max(0, totalCopies - currentBorrowings.length);
      console.log('Calculated new availability:', newAvailability);
      
      // Don't update stored availability - let frontend calculate
      console.log('Book availability in database remains unchanged (frontend will calculate)');
    } else {
      console.log('⚠️ Book not found for return');
    }
    
    console.log('=== RETURN PROCESS COMPLETE ===');
    console.log('Book returned successfully');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Return book error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getBorrowings', async () => {
  try {
    return borrowingsData.map(borrowing => {
      const user = usersData.find(u => u.id === borrowing.user_id);
      const book = booksData.find(b => b.id === borrowing.book_id);
      
      return {
        id: borrowing.id,
        user_name: user ? user.name : 'Unknown User',
        user_email: user ? user.email : 'Unknown Email',
        book_title: book ? book.title : 'Unknown Book',
        book_author: book ? book.author : 'Unknown Author',
        borrowed_date: borrowing.borrowed_date,
        return_date: borrowing.return_date,
        status: borrowing.status,
        user_id: borrowing.user_id,
        book_id: borrowing.book_id
      };
    }).sort((a, b) => new Date(b.borrowed_date) - new Date(a.borrowed_date));
  } catch (error) {
    console.error('Get borrowings error:', error);
    return [];
  }
});

// Reports operations
ipcMain.handle('getReportsData', async () => {
  try {
    // Get basic statistics
    const totalBooks = booksData.length;
    const totalUsers = usersData.length;
    const totalBorrowings = borrowingsData.length;
    const activeBorrowings = borrowingsData.filter(b => b.status === 'borrowed').length;
    
    // Get books by type
    const booksByType = {};
    booksData.forEach(book => {
      booksByType[book.type] = (booksByType[book.type] || 0) + 1;
    });
    
    // Get books by language
    const booksByLanguage = {};
    booksData.forEach(book => {
      booksByLanguage[book.language] = (booksByLanguage[book.language] || 0) + 1;
    });
    
    // Get borrowings by type
    const borrowingsByType = {};
    borrowingsData.forEach(borrowing => {
      const book = booksData.find(b => b.id === borrowing.book_id);
      if (book) {
        borrowingsByType[book.type] = (borrowingsByType[book.type] || 0) + 1;
      }
    });
    
    // Get borrowings by language
    const borrowingsByLanguage = {};
    borrowingsData.forEach(borrowing => {
      const book = booksData.find(b => b.id === borrowing.book_id);
      if (book) {
        borrowingsByLanguage[book.language] = (borrowingsByLanguage[book.language] || 0) + 1;
      }
    });
    
    // Get top users
    const userStats = {};
    borrowingsData.forEach(borrowing => {
      if (!userStats[borrowing.user_id]) {
        userStats[borrowing.user_id] = { total: 0, currently: 0, types: {} };
      }
      userStats[borrowing.user_id].total++;
      
      if (borrowing.status === 'borrowed') {
        userStats[borrowing.user_id].currently++;
      }
      
      const book = booksData.find(b => b.id === borrowing.book_id);
      if (book) {
        userStats[borrowing.user_id].types[book.type] = (userStats[borrowing.user_id].types[book.type] || 0) + 1;
      }
    });
    
    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => {
        const user = usersData.find(u => u.id === parseInt(userId));
        if (!user) return null;
        
        const mostReadType = Object.entries(stats.types)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          total_borrowed: stats.total,
          currently_borrowed: stats.currently,
          most_read_type: mostReadType
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total_borrowed - a.total_borrowed)
      .slice(0, 10);
    
    return {
      totalBooks,
      totalUsers,
      totalBorrowings,
      activeBorrowings,
      booksByType: Object.entries(booksByType).map(([type, count]) => ({ type, count })),
      booksByLanguage: Object.entries(booksByLanguage).map(([language, count]) => ({ language, count })),
      borrowingsByType: Object.entries(borrowingsByType).map(([type, count]) => ({ type, count })),
      borrowingsByLanguage: Object.entries(borrowingsByLanguage).map(([language, count]) => ({ language, count })),
      topUsers,
      users: usersData // Add users array for single user report
    };
  } catch (error) {
    console.error('Get reports data error:', error);
    return null;
  }
});

// CSV Export operations
ipcMain.handle('exportCSV', async (event, type) => {
  try {
    let data = [];
    let filename = '';
    let headers = [];
    
    switch (type) {
      case 'books':
        data = booksData;
        headers = ['ID', 'Title', 'Author', 'Type', 'Language', 'Availability', 'Created At'];
        filename = `books_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'users':
        data = usersData;
        headers = ['ID', 'Name', 'Email', 'Phone', 'Address', 'Created At'];
        filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'borrowings':
        data = borrowingsData.map(borrowing => {
          const user = usersData.find(u => u.id === borrowing.user_id);
          const book = booksData.find(b => b.id === borrowing.book_id);
          
          return {
            id: borrowing.id,
            user_name: user ? user.name : 'Unknown User',
            user_email: user ? user.email : 'Unknown Email',
            book_title: book ? book.title : 'Unknown Book',
            book_author: book ? book.author : 'Unknown Author',
            borrowed_date: borrowing.borrowed_date,
            return_date: borrowing.return_date,
            status: borrowing.status
          };
        });
        headers = ['ID', 'User Name', 'User Email', 'Book Title', 'Book Author', 'Borrowed Date', 'Return Date', 'Status'];
        filename = `borrowings_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      default:
        return { success: false, message: 'Invalid export type' };
    }
    
    // Convert data to CSV
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      const values = Object.values(row).map(value => {
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Write to file
    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, csvContent);
    
    return { success: true, filename, path: filePath };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getAvailableBooks', async () => {
  try {
    console.log('Getting available books...');
    const availableBooks = booksData.filter(book => parseInt(book.availability) === 1);
    console.log('Available books count:', availableBooks.length);
    console.log('Available books:', availableBooks.map(b => ({ id: b.id, title: b.title, author: b.author, availability: b.availability })));
    return availableBooks;
  } catch (error) {
    console.error('Get available books error:', error);
    return [];
  }
});

ipcMain.handle('getBorrowedBooks', async (event, userId) => {
  try {
    console.log('Getting borrowed books for user:', userId, 'Type:', typeof userId);
    const numericUserId = parseInt(userId);
    console.log('Numeric userId:', numericUserId);
    
    const userBorrowings = borrowingsData.filter(b => b.user_id === numericUserId && b.status === 'borrowed');
    console.log('User borrowings:', userBorrowings);
    
    return userBorrowings.map(borrowing => {
      const book = booksData.find(b => b.id === borrowing.book_id);
      return {
        id: borrowing.id,
        book_id: borrowing.book_id,
        book_title: book ? book.title : 'Unknown Book',
        book_author: book ? book.author : 'Unknown Author',
        borrowed_date: borrowing.borrowed_date
      };
    });
  } catch (error) {
    console.error('Get borrowed books error:', error);
    return [];
  }
});

// Function to refresh data from JSON files
function refreshData() {
  try {
    console.log('Refreshing data from JSON files...');
    
    // Reload books data
    const booksPath = getDataPath('books.json');
    if (fs.existsSync(booksPath)) {
      booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
      console.log('Books refreshed, count:', booksData.length);
    }
    
    // Reload users data
    const usersPath = getDataPath('users.json');
    if (fs.existsSync(usersPath)) {
      usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      console.log('Users refreshed, count:', usersData.length);
    }
    
    // Reload borrowings data
    const borrowingsPath = getDataPath('borrowings.json');
    if (fs.existsSync(borrowingsPath)) {
      borrowingsData = JSON.parse(fs.readFileSync(borrowingsPath, 'utf8'));
      console.log('Borrowings refreshed, count:', borrowingsData.length);
    }
    
    console.log('Data refresh completed');
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

// Function to force refresh and recalculate all availability
ipcMain.handle('forceRefreshAndRecalculate', async () => {
  try {
    console.log('=== FORCE REFRESH AND RECALCULATE ===');
    
    // Refresh all data from files
    refreshData();
    console.log('Data refreshed from files');
    
    // Recalculate availability for all books
    let updatedBooks = 0;
    booksData.forEach(book => {
      const totalCopies = parseInt(book.copies) || 1;
      const currentBorrowings = borrowingsData.filter(b => 
        b.book_id === book.id && b.status === 'borrowed'
      );
      const calculatedAvailability = Math.max(0, totalCopies - currentBorrowings.length);
      
      if (book.availability !== calculatedAvailability) {
        console.log(`Updating ${book.title}: ${book.availability} → ${calculatedAvailability}`);
        book.availability = calculatedAvailability;
        updatedBooks++;
      }
    });
    
    // Save updated books
    if (updatedBooks > 0) {
      saveData('books');
      console.log(`Updated ${updatedBooks} books availability`);
    } else {
      console.log('No books needed updating');
    }
    
    // Run debug report
    const debugResult = await ipcMain.handlers['debugBookAvailability'](null);
    
    return {
      success: true,
      updatedBooks,
      debugResult
    };
  } catch (error) {
    console.error('Force refresh and recalculate error:', error);
    return { success: false, message: error.message };
  }
});

// Debug function to check current book availability state
ipcMain.handle('debugBookAvailability', async () => {
  try {
    console.log('=== DEBUG BOOK AVAILABILITY ===');
    
    const availabilityReport = booksData.map(book => {
      const totalCopies = parseInt(book.copies) || 1;
      const currentBorrowings = borrowingsData.filter(b => 
        b.book_id === book.id && b.status === 'borrowed'
      );
      const actualAvailable = Math.max(0, totalCopies - currentBorrowings.length);
      const storedAvailability = parseInt(book.availability) || 0;
      
      return {
        id: book.id,
        title: book.title,
        totalCopies,
        storedAvailability,
        actualAvailable,
        currentlyBorrowed: currentBorrowings.length,
        borrowings: currentBorrowings,
        isConsistent: storedAvailability === actualAvailable,
        canBorrow: actualAvailable > 0
      };
    });
    
    console.log('=== AVAILABILITY REPORT ===');
    availabilityReport.forEach(book => {
      if (book.isConsistent) {
        console.log(`✅ ${book.title}: ${book.actualAvailable}/${book.totalCopies} available (consistent)`);
      } else {
        console.error(`❌ ${book.title}: Stored=${book.storedAvailability}, Actual=${book.actualAvailable}/${book.totalCopies} (INCONSISTENT)`);
      }
      
      if (book.currentlyBorrowed > 0) {
        console.log(`   Currently borrowed: ${book.currentlyBorrowed} copies`);
        book.borrowings.forEach(b => {
          const user = usersData.find(u => u.id === b.user_id);
          console.log(`     - User: ${user ? user.name : 'Unknown'} (ID: ${b.user_id})`);
        });
      }
    });
    
    // Summary
    const totalBooks = availabilityReport.length;
    const consistentBooks = availabilityReport.filter(b => b.isConsistent).length;
    const inconsistentBooks = totalBooks - consistentBooks;
    const availableBooks = availabilityReport.filter(b => b.canBorrow).length;
    
    console.log('=== SUMMARY ===');
    console.log(`Total books: ${totalBooks}`);
    console.log(`Consistent: ${consistentBooks}`);
    console.log(`Inconsistent: ${inconsistentBooks}`);
    console.log(`Can borrow: ${availableBooks}`);
    
    if (inconsistentBooks > 0) {
      console.warn(`⚠️ ${inconsistentBooks} books have inconsistent availability data!`);
    }
    
    return {
      success: true,
      report: availabilityReport,
      summary: {
        totalBooks,
        consistentBooks,
        inconsistentBooks,
        availableBooks
      }
    };
  } catch (error) {
    console.error('Debug book availability error:', error);
    return { success: false, message: error.message };
  }
});

// Debug function to add test book
ipcMain.handle('addTestBook', async () => {
  try {
    console.log('Adding test book...');
    
    const testBook = {
      id: booksData.length > 0 ? Math.max(...booksData.map(b => b.id)) + 1 : 1,
      title: 'Test Book',
      author: 'Test Author',
      type: 'novel',
      language: 'English',
      availability: 1,
      created_at: new Date().toISOString()
    };
    
    booksData.push(testBook);
    saveData('books');
    
    console.log('Test book added:', testBook);
    return { success: true, book: testBook };
  } catch (error) {
    console.error('Add test book error:', error);
    return { success: false, message: error.message };
  }
});

// Debug function to list all books
ipcMain.handle('listAllBooks', async () => {
  try {
    console.log('Listing all books...');
    console.log('Books in memory:', booksData);
    
    // Also check what's in the JSON file
    const booksPath = getDataPath('books.json');
    if (fs.existsSync(booksPath)) {
      const fileContent = fs.readFileSync(booksPath, 'utf8');
      console.log('Books in JSON file:', fileContent);
      const parsedBooks = JSON.parse(fileContent);
      console.log('Parsed books from file:', parsedBooks);
    }
    
    return { success: true, books: booksData, count: booksData.length };
  } catch (error) {
    console.error('List all books error:', error);
    return { success: false, message: error.message };
  }
});

// Debug function to check data types
ipcMain.handle('debugDataTypes', async (event, data) => {
  try {
    console.log('=== DEBUG DATA TYPES ===');
    console.log('Received data:', data);
    console.log('Data types:', {
      userId: { value: data.userId, type: typeof data.userId },
      bookId: { value: data.bookId, type: typeof data.bookId }
    });
    
    console.log('Current booksData:', booksData.map(b => ({ id: b.id, idType: typeof b.id, title: b.title })));
    console.log('Current usersData:', usersData.map(u => ({ id: u.id, idType: typeof u.id, name: u.name })));
    
    // Test the exact comparison that's failing
    const testBookId = parseInt(data.bookId);
    const testUserId = parseInt(data.userId);
    
    console.log('Test conversions:', {
      originalBookId: data.bookId,
      convertedBookId: testBookId,
      originalUserId: data.userId,
      convertedUserId: testUserId
    });
    
    const foundBook = booksData.find(b => b.id === testBookId);
    const foundUser = usersData.find(u => u.id === testUserId);
    
    console.log('Search results:', {
      foundBook: foundBook ? { id: foundBook.id, title: foundBook.title } : null,
      foundUser: foundUser ? { id: foundUser.id, name: foundUser.name } : null
    });
    
    return { 
      success: true, 
      dataTypes: {
        userId: { value: data.userId, type: typeof data.userId, converted: testUserId },
        bookId: { value: data.bookId, type: typeof data.bookId, converted: testBookId }
      },
      foundBook: !!foundBook,
      foundUser: !!foundUser
    };
  } catch (error) {
    console.error('Debug data types error:', error);
    return { success: false, message: error.message };
  }
});

    // Get single user report
    ipcMain.handle('getSingleUserReport', async (event, userId) => {
        try {
            console.log('Generating single user report for userId:', userId);
            
            // Use global data variables (already loaded)
            if (!booksData || !usersData || !borrowingsData) {
                console.error('Global data not available:', { booksData, usersData, borrowingsData });
                return { success: false, message: 'Library data not loaded. Please restart the application.' };
            }
            
            // Validate data arrays
            if (!Array.isArray(booksData)) {
                console.error('Books data is not an array:', booksData);
                return { success: false, message: 'Invalid books data format' };
            }
            
            if (!Array.isArray(usersData)) {
                console.error('Users data is not an array:', usersData);
                return { success: false, message: 'Invalid users data format' };
            }
            
            if (!Array.isArray(borrowingsData)) {
                console.error('Borrowings data is not an array:', borrowingsData);
                return { success: false, message: 'Invalid borrowings data format' };
            }
            
            console.log('Data loaded:', {
                booksCount: booksData.length,
                usersCount: usersData.length,
                borrowingsCount: borrowingsData.length
            });
            
            // Find the user
            const user = usersData.find(u => u.id === parseInt(userId));
            if (!user) {
                console.error('User not found for ID:', userId);
                return { success: false, message: 'User not found' };
            }
            
            console.log('Found user:', user);
            
            // Get all borrowings for this user
            const userBorrowings = borrowingsData.filter(b => b.user_id === parseInt(userId));
            console.log('User borrowings:', userBorrowings);
            
            // Calculate statistics
            const totalBooksBorrowed = userBorrowings.length;
            const borrowingSessions = userBorrowings.length; // Each borrowing is a session
            
            // Get language preferences
            const languageCounts = {};
            const typeCounts = {};
            
            userBorrowings.forEach(borrowing => {
                const book = booksData.find(b => b.id === borrowing.book_id);
                if (book) {
                    // Count languages
                    if (book.language) {
                        languageCounts[book.language] = (languageCounts[book.language] || 0) + 1;
                    }
                    
                    // Count types
                    if (book.type) {
                        typeCounts[book.type] = (typeCounts[book.type] || 0) + 1;
                    }
                }
            });
            
            // Find preferred language and type
            const preferredLanguage = Object.keys(languageCounts).length > 0 
                ? Object.keys(languageCounts).reduce((a, b) => languageCounts[a] > languageCounts[b] ? a : b)
                : null;
                
            const preferredType = Object.keys(typeCounts).length > 0
                ? Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b)
                : null;
            
            // Prepare language and type statistics for charts
            const languageStats = Object.entries(languageCounts).map(([language, count]) => ({
                language,
                count
            }));
            
            const typeStats = Object.entries(typeCounts).map(([type, count]) => ({
                type,
                count
            }));
            
            // Prepare borrowing history
            const borrowingHistory = userBorrowings.map(borrowing => {
                const book = booksData.find(b => b.id === borrowing.book_id);
                return {
                    bookTitle: book ? book.title : 'Unknown Book',
                    author: book ? book.author : 'Unknown Author',
                    type: book ? book.type : 'Unknown Type',
                    language: book ? book.language : 'Unknown Language',
                    borrowDate: borrowing.borrowed_date,
                    returnDate: borrowing.return_date || null
                };
            }).sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate)); // Sort by most recent first
            
            const reportData = {
                userId: user.id,
                userName: user.name,
                totalBooksBorrowed,
                borrowingSessions,
                preferredLanguage,
                preferredType,
                languageStats,
                typeStats,
                borrowingHistory
            };
            
            console.log('Single user report generated:', reportData);
            return { success: true, data: reportData };
            
        } catch (error) {
            console.error('Error generating single user report:', error);
            return { success: false, message: `Error generating user report: ${error.message}` };
        }
    });
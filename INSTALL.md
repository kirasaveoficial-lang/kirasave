# Installation Instructions

## Quick Start

### Option 1: Using the setup script (Windows)
1. Double-click `setup.bat` to install dependencies and start the server
2. Open your browser and go to `http://localhost:3000`

### Option 2: Manual Installation

#### Prerequisites
- Node.js (v14 or higher) installed
- npm or yarn package manager

#### Steps

1. **Install Dependencies**
   Open a terminal/command prompt in the project directory and run:
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Access the Site**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Troubleshooting

### PowerShell Execution Policy Error
If you get an error about PowerShell execution policy when running npm commands:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Try running npm install again

### Port Already in Use
If port 3000 is already in use:
1. Stop the process using port 3000, or
2. Change the port in `.env` file: `PORT=3001`

### Database Errors
The database will be created automatically on first run. If you encounter database errors:
1. Delete `kira-save.db` file
2. Restart the server

## First Time Setup

1. Register a new account at `/register`
2. The first registered user will NOT be admin by default
3. To make a user admin, you need to manually update the database:
   ```sql
   UPDATE users SET is_admin = 1 WHERE username = 'your_username';
   ```

## Default Configuration

- Port: 3000
- Database: SQLite (kira-save.db)
- Upload directory: public/uploads/
- Max file size: 100MB for saves, 5MB for images

## Production Deployment

For production deployment:
1. Change `NODE_ENV` to `production` in `.env`
2. Update `JWT_SECRET` to a secure random string
3. Use a production database (PostgreSQL recommended)
4. Enable HTTPS
5. Set up proper file storage (S3, etc.)
6. Configure CORS for your domain

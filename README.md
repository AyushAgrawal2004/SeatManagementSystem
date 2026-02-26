# Seat Management System

A full-stack web application designed to help organizations manage office seating arrangements efficiently. It features a beautifully designed modern UI with smooth animations, user authentication via email OTPs, automated seat release mechanisms, and a flexible system for booking floater seats.

## 🌟 Key Features

*   **Secure Authentication**: Two-step registration process using automated Email OTP verification.
*   **Dynamic Dashboard**: A real-time visual representation of the office layout and squad tables.
*   **Office & Home Days**: Clear visualization of assigned office days based on user batches (Batch 1 vs Batch 2).
*   **Automated Seat Releasing**: Users can release their allotted seats if they cannot make it to the office. Released seats become available for others to book.
*   **Floater Seat Booking**: Users working from home can book available floater seats (or released fixed seats) to work from the office on demand.
*   **Email Notifications**: Automated emails are triggered via `nodemailer` for registration success, OTPs, seat releases, and floater bookings.
*   **Interactive 14-Day Calendar**: Users can manage their upcoming schedule and release/claim seats up to 14 days in advance directly from the calendar modal.
*   **Sleek UI/UX**: Minimalist aesthetic with subtle animated gradient backgrounds, glassmorphism cards, interactive SVG chair icons, and crisp typography using the Manrope font.

## 🛠️ Technology Stack

**Frontend**
*   Vite + React
*   React Router DOM (for navigation)
*   Lucide React (for icons)
*   React Hot Toast (for interactive notifications)
*   Axios (for API calls)
*   Vanilla CSS (for custom styling and animations)

**Backend**
*   Node.js & Express.js
*   MongoDB & Mongoose (for the database)
*   JSON Web Tokens (JWT) (for authentication)
*   Nodemailer (for email communication)
*   OTP-Generator (for 2FA)
*   BCrypt.js (for password hashing)
*   Date-fns (for scheduling and date logic)

## 🚀 Getting Started

To run this project locally, you will need Node.js and MongoDB installed on your system.

### 1. Clone the repository

```bash
git clone https://github.com/AyushAgrawal2004/SeatManagementSystem.git
cd SeatManagementSystem
```

### 2. Setup the Backend Server

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_SERVICE=gmail
```
*Note: You must use an App Password from your Google Account settings, not your actual email password.*

Start the backend development server:
```bash
npm run dev
```

### 3. Setup the Frontend Client

Open a new terminal window:
```bash
cd client
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The application will now be running at `http://localhost:5173`.

## 📸 Screenshots & Design

The application utilizes a specific color palette defined in the CSS `:root`:
*   `--primary`: Navy (`#1A2D58`)
*   `--secondary`: Maroon (`#A4133C`)
*   `--accent`: Orange (`#FF7E3E`)

The UI prominently features animated gradients, custom interactive seat map layouts, hover effects, and distinct branding colors for different seat states (Your seat, Booked seat, Released seat, and Available seat).

## 📄 License
This project is open-source and available under the terms of the MIT license.

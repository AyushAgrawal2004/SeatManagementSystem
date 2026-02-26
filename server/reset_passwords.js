const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/seatbooking');
        const users = await User.find({});

        for (const user of users) {
            user.password = 'password123';
            // Also ensure ayush has a seatNumber if missing
            if (user.email === 'ayush@example.com' && !user.seatNumber) {
                user.seatNumber = 3; // Give him next available in squad 1
            }
            await user.save();
            console.log(`Reset password for: ${user.email}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetPasswords();

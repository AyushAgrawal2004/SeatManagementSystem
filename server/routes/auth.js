const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');

// Send OTP for Registration
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Generate a 6-digit OTP
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false
        });

        // Save OTP to database (upsert if an older one exists for this email)
        await OTP.findOneAndDelete({ email }); // Remove old OTP if exists
        const otpDoc = new OTP({ email, otp });
        await otpDoc.save();

        // Send OTP via email
        const message = `
            <h1>Seat Booking Registration</h1>
            <p>Your OTP for registration is: <strong>${otp}</strong></p>
            <p>This OTP is valid for 5 minutes.</p>
        `;

        await sendEmail({
            email,
            subject: 'Seat Management System - Verification OTP',
            message
        });

        res.status(200).json({ message: 'OTP sent successfully to email' });
    } catch (err) {
        console.error('Send OTP Error:', err);
        res.status(500).json({ message: 'Failed to send OTP', error: err.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, squadId, batch } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Logic: 10 squads, each batch has 40 people. So each squad has 4 seats in each batch.
        // Seat range for Squad 1: 1-4, Squad 2: 5-8, ..., Squad 10: 37-40
        const squadUsersInBatch = await User.countDocuments({ squadId, batch });
        if (squadUsersInBatch >= 4) {
            return res.status(400).json({ message: `Squad ${squadId} already has 4 members in Batch ${batch}. No more seats available for this batch.` });
        }

        const seatNumber = (squadId - 1) * 4 + squadUsersInBatch + 1;
        console.log(`Registering user: ${email}, Squad: ${squadId}, Batch: ${batch}, Assigned Seat: ${seatNumber}`);

        user = new User({ name, email, password, squadId, batch, seatNumber });
        await user.save();
        console.log('User saved successfully');

        // Delete the OTP record as it's been used
        await OTP.findOneAndDelete({ email });

        // Send Welcome Email
        const welcomeMessage = `
            <h1>Welcome to Seat Management System, ${name}!</h1>
            <p>You have been successfully registered.</p>
            <ul>
                <li><strong>Squad:</strong> ${squadId}</li>
                <li><strong>Batch:</strong> ${batch}</li>
                <li><strong>Assigned Fixed Seat:</strong> ${seatNumber}</li>
            </ul>
            <p>You can now log in and manage your seat bookings.</p>
        `;

        try {
            await sendEmail({
                email,
                subject: 'Welcome to Seat Management System - Registration Successful',
                message: welcomeMessage
            });
        } catch (emailErr) {
            console.error('Welcome email failed to send, but user is registered:', emailErr);
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name, email, squadId, batch, seatNumber } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        console.log(`Password match: ${isMatch}`);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.json({
            token, user: {
                id: user._id,
                name: user.name,
                email: user.email,
                squadId: user.squadId,
                batch: user.batch,
                seatNumber: user.seatNumber
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

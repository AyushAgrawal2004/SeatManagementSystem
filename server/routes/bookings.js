const express = require('express');
const { addDays } = require('date-fns');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const { getBatchForDate, canReleaseSeat, canBookFloater } = require('../utils/scheduler');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Get seat status for a date
router.get('/status', auth, async (req, res) => {
    try {
        const { date } = req.query; // Expects YYYY-MM-DD
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        targetDate.setHours(0, 0, 0, 0);

        const assignedBatch = getBatchForDate(targetDate);

        // Find all bookings/releases for this date
        const bookings = await Booking.find({ date: targetDate })
            .populate('userId', 'name squadId batch seatNumber');

        // Calculate availability
        const releasedSeats = bookings.filter(b => b.status === 'released').length;
        const floaterBookings = bookings.filter(b => b.type === 'floater' && b.status === 'booked').length;

        const availableFloaters = 10 + releasedSeats - floaterBookings;

        // Fetch all users assigned to this batch for name mapping on hover
        const assignedUsers = await User.find({ batch: assignedBatch }, 'name seatNumber');

        res.json({
            assignedBatch,
            bookings,
            availableFloaters,
            assignedUsers,
            currentTime: new Date()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Release a seat
router.post('/release', auth, async (req, res) => {
    try {
        const { date } = req.body;
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        targetDate.setHours(0, 0, 0, 0);

        const user = await User.findById(req.user.id);
        const assignedBatch = getBatchForDate(targetDate);

        if (user.batch !== assignedBatch) {
            return res.status(400).json({ message: 'You are not assigned to office on this day' });
        }

        if (!canReleaseSeat(targetDate)) {
            return res.status(400).json({ message: 'Release deadline (8 PM previous day) has passed' });
        }

        let booking = await Booking.findOne({ userId: req.user.id, date: targetDate });
        if (booking) {
            booking.status = 'released';
        } else {
            booking = new Booking({
                userId: req.user.id,
                date: targetDate,
                status: 'released',
                type: 'fixed'
            });
        }
        await booking.save();

        // Send email notification for seat release
        const formattedDate = targetDate.toLocaleDateString();
        try {
            await sendEmail({
                email: user.email,
                subject: 'Seat Management System - Seat Released',
                message: `
                    <h1>Seat Released</h1>
                    <p>Hi ${user.name}, you have successfully released your seat (${user.seatNumber}) for <strong>${formattedDate}</strong>.</p>
                `
            });
        } catch (emailErr) {
            console.error('Email failed to send for seat release:', emailErr);
        }

        res.json({ message: 'Seat released successfully', booking });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'You have already released/booked a seat for this day' });
        }
        res.status(500).json({ message: err.message });
    }
});

// Book a floater seat
router.post('/book-floater', auth, async (req, res) => {
    try {
        const { date } = req.body;
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        targetDate.setHours(0, 0, 0, 0);

        if (!canBookFloater(targetDate)) {
            return res.status(400).json({ message: 'Floater booking starts after 3 PM from a day before' });
        }

        // Check if user is already assigned (fixed seat)
        const user = await User.findById(req.user.id);
        const assignedBatch = getBatchForDate(targetDate);
        if (user.batch === assignedBatch) {
            return res.status(400).json({ message: 'You already have a fixed seat for this day' });
        }

        // Check availability
        const bookings = await Booking.find({ date: targetDate });
        const releasedCount = bookings.filter(b => b.status === 'released').length;
        const floaterCount = bookings.filter(b => b.type === 'floater' && b.status === 'booked').length;

        if (10 + releasedCount - floaterCount <= 0) {
            return res.status(400).json({ message: 'No floater seats available' });
        }

        // Find available floater seat number
        const activeBookings = await Booking.find({ date: targetDate, status: 'booked' });
        const occupiedSeats = activeBookings.map(b => b.seatNumber);

        // Priority 1: Standard Floaters (41-50)
        let assignedFloaterSeat = null;
        for (let i = 41; i <= 50; i++) {
            if (!occupiedSeats.includes(i)) {
                assignedFloaterSeat = i;
                break;
            }
        }

        // Priority 2: Released Seats (1-40)
        if (!assignedFloaterSeat) {
            const releasedRecords = await Booking.find({ date: targetDate, status: 'released', type: 'fixed' })
                .populate('userId', 'seatNumber');

            for (const record of releasedRecords) {
                const sNum = record.userId.seatNumber;
                if (!occupiedSeats.includes(sNum)) {
                    assignedFloaterSeat = sNum;
                    break;
                }
            }
        }

        if (!assignedFloaterSeat) {
            return res.status(400).json({ message: 'No seats available' });
        }

        const booking = new Booking({
            userId: req.user.id,
            date: targetDate,
            status: 'booked',
            type: 'floater',
            seatNumber: assignedFloaterSeat
        });
        await booking.save();

        // Send Email Notification for Floater Booking
        const formattedDate = targetDate.toLocaleDateString();
        try {
            await sendEmail({
                email: user.email,
                subject: 'Seat Management System - Floater Seat Booked',
                message: `
                    <h1>Floater Seat Booked successfully!</h1>
                    <p>Hi ${user.name}, you have successfully booked Floater Seat <strong>${assignedFloaterSeat}</strong> for <strong>${formattedDate}</strong>.</p>
                `
            });
        } catch (emailErr) {
            console.error('Email failed to send for floater booking:', emailErr);
        }

        res.json({ message: 'Floater seat booked successfully', seatNumber: assignedFloaterSeat });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'You have already booked/released a seat for this day' });
        }
        res.status(500).json({ message: err.message });
    }
});

// Claim back a released seat
router.post('/claim-back', auth, async (req, res) => {
    try {
        const { date } = req.body;
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        targetDate.setHours(0, 0, 0, 0);

        const user = await User.findById(req.user.id);
        const assignedBatch = getBatchForDate(targetDate);

        if (user.batch !== assignedBatch) {
            return res.status(400).json({ message: 'This was not your allotted seat' });
        }

        // Check if seat is already booked by someone as a floater
        const floaterBooking = await Booking.findOne({
            date: targetDate,
            type: 'floater',
            status: 'booked',
            seatNumber: user.seatNumber
        });

        if (floaterBooking) {
            return res.status(400).json({ message: 'Your seat has already been booked by someone else' });
        }

        // Delete the release record
        const result = await Booking.findOneAndDelete({
            userId: req.user.id,
            date: targetDate,
            status: 'released',
            type: 'fixed'
        });

        if (!result) {
            return res.status(404).json({ message: 'No release record found for this seat' });
        }

        res.json({ message: 'Seat reclaimed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user's upcoming schedule
router.get('/my-schedule', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const schedule = [];
        const now = new Date();
        const bookings = await Booking.find({ userId: req.user.id });

        for (let i = 0; i < 14; i++) {
            const date = addDays(new Date(), i);
            date.setHours(0, 0, 0, 0);

            const assignedBatch = getBatchForDate(date);
            const isAssigned = user.batch === assignedBatch;

            const booking = bookings.find(b => new Date(b.date).getTime() === date.getTime());

            schedule.push({
                date,
                isAssigned,
                status: booking ? booking.status : (isAssigned ? 'assigned' : 'none'),
                type: booking ? booking.type : (isAssigned ? 'fixed' : null),
                canRelease: isAssigned && canReleaseSeat(date) && (!booking || booking.status !== 'released')
            });
        }

        res.json(schedule);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

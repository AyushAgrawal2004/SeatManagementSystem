const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['booked', 'released'], default: 'booked' },
    type: { type: String, enum: ['fixed', 'floater'], required: true },
    seatNumber: { type: Number }, // Use for floater mapping
}, { timestamps: true });

// Ensure a user has only one primary booking/release record per day
bookingSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);

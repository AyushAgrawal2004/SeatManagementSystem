import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    sendOtp: (data) => api.post('/auth/send-otp', data),
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
};

export const bookingService = {
    getStatus: (date) => api.get(`/bookings/status?date=${date}`),
    releaseSeat: (date) => api.post('/bookings/release', { date }),
    claimBackSeat: (date) => api.post('/bookings/claim-back', { date }),
    bookFloater: (date) => api.post('/bookings/book-floater', { date }),
    getMySchedule: () => api.get('/bookings/my-schedule'),
};

export default api;

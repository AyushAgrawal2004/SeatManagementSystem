import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', squadId: 1, batch: 1, otp: ''
    });
    const [otpSent, setOtpSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await authService.sendOtp({ email: formData.email });
            toast.success('OTP sent to your email!');
            setOtpSent(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await authService.register(formData);
            login(res.data.user, res.data.token);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Seat Management System</h1>
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: '2rem' }}>Create an account</p>
                {!otpSent ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Squad (1-10)</label>
                            <input type="number" min="1" max="10" value={formData.squadId} onChange={(e) => setFormData({ ...formData, squadId: parseInt(e.target.value) })} required />
                        </div>
                        <div className="form-group">
                            <label>Batch</label>
                            <select value={formData.batch} onChange={(e) => setFormData({ ...formData, batch: parseInt(e.target.value) })}>
                                <option value={1}>Batch 1</option>
                                <option value={2}>Batch 2</option>
                            </select>
                        </div>
                        <button type="submit" className="btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>Enter OTP</label>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                                An OTP was sent to {formData.email}
                            </p>
                            <input
                                type="text"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                placeholder="Enter 6-digit OTP"
                                required
                                maxLength={6}
                            />
                        </div>
                        <button type="submit" className="btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Registering...' : 'Register Account'}
                        </button>
                    </form>
                )}
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/api';
import { format, addDays, isToday, isTomorrow, isWeekend } from 'date-fns';
import { LogOut, Calendar, Users, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const ChairSVG = ({ status, isYours }) => {
    let color = '#E9ECEF'; // Default Light Gray
    if (isYours || status === 'yours') color = '#A4133C'; // Wissen Maroon
    else if (status === 'booked') color = '#1A2D58'; // Wissen Navy
    else if (status === 'released') color = '#059669'; // Success Green
    else if (status === 'available') color = '#ADB5BD'; // Medium Gray

    return (
        <svg viewBox="0 0 24 24" className={`chair-icon ${status} ${isYours ? 'yours' : ''}`} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M18.37,9.18a2,2,0,0,0-1.59,2h0A2.76,2.76,0,0,1,14,13.93H10a2.76,2.76,0,0,1-2.76-2.76h0a2,2,0,0,0-1.59-2,1.91,1.91,0,0,0-2.24,1.89h0a6.7,6.7,0,0,0,6.7,6.69h3.82a6.7,6.7,0,0,0,6.7-6.69h0A1.91,1.91,0,0,0,18.37,9.18Z" />
            <path stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6.26,9.42V7.24a5.74,5.74,0,1,1,11.48,0V9.42" />
            <line stroke={color} strokeWidth="1.5" strokeLinecap="round" x1="6.26" y1="23.5" x2="7.22" y2="16.8" />
            <line stroke={color} strokeWidth="1.5" strokeLinecap="round" x1="16.78" y1="16.8" x2="17.74" y2="23.5" />
        </svg>
    );
};

const Seat = ({ seatNum, data, user }) => {
    const isYourAllottedSeat = user.seatNumber === seatNum && data?.assignedBatch === user.batch;
    const seatRecord = data?.bookings?.find(b =>
        (!b.type || b.type === 'fixed') ? (b.userId?.seatNumber === seatNum && b.userId?.batch === data?.assignedBatch) : (b.type === 'floater' && b.seatNumber === seatNum)
    );
    const assignedUser = data?.assignedUsers?.find(u => u.seatNumber === seatNum);
    const yourRecord = data?.bookings?.find(b => (b.userId?._id || b.userId) === user.id);

    const isReleased = seatRecord && seatRecord.status === 'released';
    const isYours = (isYourAllottedSeat && (!yourRecord || yourRecord.status !== 'released')) ||
        (yourRecord && yourRecord.type === 'floater' && yourRecord.seatNumber === seatNum && yourRecord.status === 'booked');

    let isBooked = false;
    if (seatNum <= 40) {
        // For allotted seats, it's "booked" if it's the assigned batch day and not released
        isBooked = data?.assignedBatch && !isReleased;
    } else {
        // For floater seats, it's explicitly booked if there's a booking record with status 'booked'
        isBooked = seatRecord && seatRecord.status === 'booked';
    }

    let status = 'available';
    if (isYours) status = 'yours';
    else if (status === 'available' && seatNum <= 40 && isReleased) status = 'released';
    else if (isBooked) status = 'booked';
    else if (seatNum <= 40 && !data?.assignedBatch) status = 'available'; // Default available if no batch assigned

    // Refine status logic for clearer visualization
    if (isYours) status = 'yours';
    else if (isReleased) status = 'released';
    else if (isBooked) status = 'booked';
    else status = 'available';

    let tooltip = '';
    if (isYours) tooltip = 'You';
    else if (seatRecord?.userId?.name) tooltip = seatRecord.userId.name;
    else if (assignedUser?.name && !isReleased) tooltip = assignedUser.name;
    else if (isReleased) tooltip = 'Released - Available';
    else tooltip = seatNum <= 40 ? 'Allotted Seat' : 'Floater Seat';

    return (
        <div className={`seat-wrapper ${status}`} data-tooltip={tooltip}>
            <ChairSVG status={status} isYours={isYours} />
            <span className="seat-label">{seatNum}</span>
        </div>
    );
};

const OfficeTable = ({ title, seats, data, user, isFloater }) => {
    return (
        <div className={`office-table-container ${isFloater ? 'floater' : ''}`}>
            <h4 className="table-title">{title}</h4>
            <div className="table-layout">
                <div className="seats-top">
                    {seats.slice(0, Math.ceil(seats.length / 2)).map(sNum => (
                        <Seat key={sNum} seatNum={sNum} data={data} user={user} />
                    ))}
                </div>
                <div className="table-surface">
                    <div className="table-inner"></div>
                </div>
                <div className="seats-bottom">
                    {seats.slice(Math.ceil(seats.length / 2)).map(sNum => (
                        <Seat key={sNum} seatNum={sNum} data={data} user={user} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [date, setDate] = useState(new Date());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSchedule, setShowSchedule] = useState(false);
    const [schedule, setSchedule] = useState([]);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await bookingService.getStatus(format(date, 'yyyy-MM-dd'));
            setData(res.data);
        } catch (err) {
            toast.error('Failed to fetch seat status');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedule = async () => {
        try {
            const res = await bookingService.getMySchedule();
            setSchedule(res.data);
        } catch (err) {
            toast.error('Failed to fetch schedule');
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [date]);

    useEffect(() => {
        if (showSchedule) fetchSchedule();
    }, [showSchedule]);

    const handleRelease = async () => {
        try {
            await bookingService.releaseSeat(format(date, 'yyyy-MM-dd'));
            fetchStatus();
            if (showSchedule) fetchSchedule();
            toast.success('Seat released successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to release seat');
        }
    };

    const handleClaimBack = async () => {
        try {
            await bookingService.claimBackSeat(format(date, 'yyyy-MM-dd'));
            fetchStatus();
            if (showSchedule) fetchSchedule();
            toast.success('Seat reclaimed successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reclaim seat');
        }
    };

    const handleReleaseSchedule = async (selectedDate) => {
        try {
            await bookingService.releaseSeat(format(new Date(selectedDate), 'yyyy-MM-dd'));
            fetchSchedule();
            if (format(new Date(selectedDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
                fetchStatus();
            }
            toast.success('Seat released successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to release seat');
        }
    };

    const handleBookFloater = async () => {
        try {
            await bookingService.bookFloater(format(date, 'yyyy-MM-dd'));
            fetchStatus();
            toast.success('Floater seat booked successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to book floater');
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <h1>Seat Management System</h1>
                    {data?.assignedBatch && (
                        <div className="batch-badge">
                            <Users size={16} />
                            <span>Batch {data.assignedBatch} in Office</span>
                        </div>
                    )}
                </div>
                <div className="user-info">
                    <div style={{ textAlign: 'right' }}>
                        <div className="user-name">{user.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Squad {user.squadId} • Batch {user.batch}</div>
                    </div>
                    <button onClick={logout} className="btn-logout" title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                <main>
                    <div className="calendar-control">
                        <div className="date-display">
                            <Calendar size={20} className="calendar-icon" />
                            <span className="current-date">
                                {isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEEE')}, {format(date, 'MMMM do')}
                            </span>
                            <input
                                type="date"
                                min={format(new Date(), 'yyyy-MM-dd')}
                                max={format(addDays(new Date(), 13), 'yyyy-MM-dd')}
                                value={format(date, 'yyyy-MM-dd')}
                                onChange={(e) => setDate(new Date(e.target.value))}
                                className="hidden-date-input"
                            />
                        </div>
                        <div className="calendar-nav">
                            <button
                                onClick={() => setDate(addDays(date, -1))}
                                className="nav-btn"
                                disabled={isToday(date)}
                                title="Previous Day"
                            >
                                &larr;
                            </button>
                            <button onClick={() => setDate(new Date())} className="today-btn" disabled={isToday(date)}>Today</button>
                            <button
                                onClick={() => setDate(addDays(date, 1))}
                                className="nav-btn"
                                disabled={format(date, 'yyyy-MM-dd') === format(addDays(new Date(), 13), 'yyyy-MM-dd')}
                                title="Next Day"
                            >
                                &rarr;
                            </button>
                        </div>
                    </div>

                    {(() => {
                        if (loading) return (
                            <div className="status-card" style={{ opacity: 0.6, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                                <Info size={18} />
                                <span>Updating status...</span>
                            </div>
                        );

                        if (isWeekend(date)) return (
                            <div className="status-card info">
                                <Calendar size={18} />
                                <span>It's a weekend! <strong>No Office Assigned.</strong> Enjoy your break!</span>
                            </div>
                        );

                        const yourRecord = data?.bookings?.find(b => (b.userId?._id || b.userId) === user.id);
                        const isAssignedToday = data?.assignedBatch === user.batch;
                        const hasSeatToday = (isAssignedToday && (!yourRecord || yourRecord.status !== 'released')) ||
                            (yourRecord && yourRecord.type === 'floater' && yourRecord.status === 'booked');

                        if (!hasSeatToday) {
                            return (
                                <div className="status-card warning">
                                    <Info size={18} />
                                    <span>No seat allotted for today. <strong style={{ color: 'var(--text)' }}>Book a floater seat now!</strong></span>
                                </div>
                            );
                        }

                        // Determine the positive status message
                        let statusType = '';
                        let seatDetail = '';
                        if (isAssignedToday && (!yourRecord || yourRecord.status !== 'released')) {
                            statusType = 'Allotted Workspace';
                            seatDetail = `Fixed Seat ${user.seatNumber}`;
                        } else if (yourRecord && yourRecord.type === 'floater' && yourRecord.status === 'booked') {
                            statusType = 'Floater Booking';
                            seatDetail = `Floater Seat ${yourRecord.seatNumber}`;
                        }
                        return (
                            <div className={`day-status-card ${hasSeatToday ? 'office-day' : 'home-day'}`}>
                                <div className="day-icon-wrap">
                                    {hasSeatToday ? <Users size={24} /> : <Info size={24} />}
                                </div>
                                <div className="day-content">
                                    <div className="day-label">{hasSeatToday ? 'OFFICE DAY' : 'HOME DAY'}</div>
                                    <div className="day-title">
                                        {hasSeatToday
                                            ? `You are at ${statusType} — ${seatDetail}`
                                            : 'No seat allotted for today. You are working from home.'
                                        }
                                    </div>
                                    {!hasSeatToday && !isWeekend(date) && (
                                        <div className="day-action-hint">Need to come in? Book a floater seat below.</div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {!isWeekend(date) && (
                        <div className="office-layout">
                            <div className="squad-tables">
                                <OfficeTable title="Squad 1" seats={[1, 2, 3, 4, 5, 6, 7, 8]} data={data} user={user} />
                                <OfficeTable title="Squad 2" seats={[9, 10, 11, 12, 13, 14, 15, 16]} data={data} user={user} />
                                <OfficeTable title="Squad 3" seats={[17, 18, 19, 20, 21, 22, 23, 24]} data={data} user={user} />
                                <OfficeTable title="Squad 4" seats={[25, 26, 27, 28, 29, 30, 31, 32]} data={data} user={user} />
                                <OfficeTable title="Squad 5" seats={[33, 34, 35, 36, 37, 38, 39, 40]} data={data} user={user} />
                            </div>

                            <div className="floater-zone-layout">
                                <OfficeTable
                                    title="Floater Zone"
                                    isFloater={true}
                                    seats={[
                                        ...[41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
                                        ...(data?.bookings || [])
                                            .filter(b => (!b.type || b.type === 'fixed') && b.status === 'released')
                                            .map(b => b.userId?.seatNumber || b.seatNumber)
                                            .filter((val, index, self) => self.indexOf(val) === index) // Unique
                                    ]}
                                    data={data}
                                    user={user}
                                />
                            </div>

                            <div className="seat-legend">
                                <div className="legend-item"><ChairSVG status="available" /> Available</div>
                                <div className="legend-item"><ChairSVG status="booked" /> Booked</div>
                                <div className="legend-item"><ChairSVG status="released" /> Released</div>
                                <div className="legend-item"><ChairSVG status="yours" /> Your Seat</div>
                            </div>
                        </div>
                    )}
                </main>

                <aside style={{ background: 'var(--card)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', height: 'fit-content' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', fontWeight: '800', letterSpacing: '-0.02em' }}>Daily Info</h3>
                    <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                        <p style={{ margin: '0.75rem 0' }}><strong style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Assigned Batch:</strong> <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{data?.assignedBatch || 'N/A'}</span></p>
                        <p style={{ margin: '0.75rem 0' }}><strong style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Available Floaters:</strong> <span style={{ color: 'var(--success)', fontWeight: '800' }}>{data?.availableFloaters ?? '...'}</span></p>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {!isWeekend(date) && (
                            data?.assignedBatch === user.batch ? (
                                data?.bookings?.find(b => (b.userId?._id || b.userId) === user.id && b.status === 'released') ? (
                                    <button onClick={handleClaimBack} className="btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                        Claim Back Seat
                                    </button>
                                ) : (
                                    <button onClick={handleRelease} className="btn" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                        Release My Seat
                                    </button>
                                )
                            ) : (
                                <button onClick={handleBookFloater} className="btn">
                                    Book Floater Seat
                                </button>
                            )
                        )}
                        <button onClick={() => setShowSchedule(true)} className="btn" style={{ background: '#F1F3F5', border: '1px solid var(--border)', color: 'var(--text)' }}>
                            View My Schedule
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-dim)', background: '#F8F9FA', padding: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)' }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0', color: 'var(--primary)', fontWeight: '700' }}>
                            <Info size={16} /> <strong>Deadlines:</strong>
                        </p>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, listStyleType: 'circle', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <li>Release: Before 8 PM yesterday</li>
                            <li>Floater: After 3 PM yesterday</li>
                        </ul>
                    </div>
                </aside>
            </div>

            {showSchedule && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="auth-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '800' }}>My 14-Day Schedule</h2>
                            <button onClick={() => setShowSchedule(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {schedule.map((item, idx) => {
                                let statusLabel = '';
                                let statusColor = 'var(--text-dim)';
                                let hasSeat = false;

                                if (item.isAssigned) {
                                    if (item.status === 'released') {
                                        statusLabel = 'Office (Released)';
                                    } else {
                                        statusLabel = 'Office (Allotted)';
                                        statusColor = 'var(--primary-glow)';
                                        hasSeat = true;
                                    }
                                } else {
                                    if (item.status === 'booked' && item.type === 'floater') {
                                        statusLabel = 'Home (Floater Booked)';
                                        statusColor = 'var(--success)';
                                        hasSeat = true;
                                    } else {
                                        statusLabel = 'Home';
                                    }
                                }

                                return (
                                    <div key={idx} style={{ background: '#F8F9FA', padding: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {format(new Date(item.date), 'EEE, MMM d')}
                                                {hasSeat && (
                                                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', border: '1px solid var(--success)', fontWeight: '500' }}>
                                                        Seat Secured
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: statusColor, marginTop: '0.2rem' }}>
                                                {statusLabel}
                                            </div>
                                        </div>
                                        {item.canRelease && (
                                            <button
                                                onClick={() => handleReleaseSchedule(item.date)}
                                                className="btn"
                                                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#ef4444' }}
                                            >
                                                Release
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

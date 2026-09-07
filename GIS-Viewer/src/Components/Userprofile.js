import React from 'react';
import './Userprofie.css'

const UserProfile = () => {
    return (
        <div className="page-wrapper">
            <div className="header">
                <h1>User Dashboard</h1>
            </div>

            <div className="content">
                <div className="container">
                    {/* Left side - User Profile */}
                    <div className="profile-sidebar">
                        <img src="../Images/blank-profile-picture-973460_1280.png" alt="User Profile" className="profile-image" />

                        <div className="profile-info">
                            <h1>John Doe</h1>

                            <div className="profile-detail">
                                <span>EMAIL</span>
                                <p>johndoe@example.com</p>
                            </div>

                            <div className="profile-detail">
                                <span>USERNAME</span>
                                <p>johndoe123</p>
                            </div>
                        </div>
                    </div>

                    {/* Right side - User History Grid */}
                    <div className="history-section">
                        <h2>Activity History</h2>

                        <div className="history-grid">
                            <div className="history-item">
                                <div className="history-date">March 1, 2025</div>
                                <div className="history-title">Completed Project Alpha</div>
                                <div className="history-description">Successfully delivered all requirements ahead of schedule.</div>
                            </div>

                            <div className="history-item">
                                <div className="history-date">February 24, 2025</div>
                                <div className="history-title">Updated Profile Information</div>
                                <div className="history-description">Changed personal information and security settings.</div>
                            </div>

                            <div className="history-item">
                                <div className="history-date">February 18, 2025</div>
                                <div className="history-title">Joined Team Innovate</div>
                                <div className="history-description">Became a member of the innovation department.</div>
                            </div>

                            <div className="history-item">
                                <div className="history-date">February 10, 2025</div>
                                <div className="history-title">Achieved Gold Status</div>
                                <div className="history-description">Reached 1000 contribution points in the platform.</div>
                            </div>

                            <div className="history-item">
                                <div className="history-date">January 25, 2025</div>
                                <div className="history-title">Completed Training Course</div>
                                <div className="history-description">Finished Advanced User Experience Design certification.</div>
                            </div>

                            <div className="history-item">
                                <div className="history-date">January 15, 2025</div>
                                <div className="history-title">Account Created</div>
                                <div className="history-description">Joined the platform and completed initial setup.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;

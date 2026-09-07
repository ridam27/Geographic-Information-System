import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="bg-dark text-white text-center p-3">
      <section id="contact" className="wow fadeInUp">
        <div className="container">
          <div className="section-header">
            <h4>Contact Us</h4>
          </div>

          <div className="row contact-info">
            <div className="col-md-4">
              <div className="contact-address">
                <i className="ion-ios-location-outline"></i>
                <h3>Address</h3>
                <address>
                  Plot number 45, Fulmati Layout, BabulKheda, Badil Kheda, near
                  Ramteke Nagar Hanuman Mandir, Nagpur, Maharashtra 440027
                </address>
              </div>
            </div>

            <div className="col-md-4">
              <div className="contact-phone">
                <i className="ion-ios-telephone-outline"></i>
                <h3>Phone Number</h3>
                <p>
                  <a href="tel:7410747036">74107 47036</a>
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="contact-email">
                <i className="ion-ios-email-outline"></i>
                <h3>Email</h3>
                <p>
                  <a href="mailto:info@cojagtech.com">info@cojagtech.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <p>© Copyright 2024 COJAG. All Rights Reserved</p>
      <p>An ISO 9001:2015, ISO 45001:2018, ISO 27001:2022, MSME, Startup India Certified company</p>
    </footer>
  );
};

export default Footer;

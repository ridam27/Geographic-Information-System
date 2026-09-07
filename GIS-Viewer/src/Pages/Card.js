import React from 'react';

const Card = ({ title, description ,image }) => {
  return (
    <div className="card text-center shadow-sm" style={{ width: '18rem' }}>
      <div className="card-body">
        <img
          src= {image}
          alt="Placeholder"
          className="card-img-top"
          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
        />
        <h5 className="card-title mt-3">{title}</h5>
        <p className="card-text">{description}</p>
      </div>
    </div>
  );
};

export default Card;
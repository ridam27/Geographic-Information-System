import React from 'react';
import Card from './Card';
import './Card.css';

const CardContainer = () => {
  const cardData = [
    {
      title: 'Location',
      description: 'Interactive and real-time map visualizations to understand spatial patterns.',
      image: "https://images.unsplash.com/photo-1503503330041-4cd943d2b61f?q=80&w=1862&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      title: 'Shape File Extractor',
      description: 'Advanced tools for analyzing geographical data to make informed decisions.',
      image: "https://plus.unsplash.com/premium_photo-1713364681552-a18fbcc5d262?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Placeholder image
    },
    {
      title: 'KML KMZ Extractor',
      description: 'Premium features for professional mapping and data integration with multiple features.',
      image: "https://www.imapbuilder.net/images/guide/import-kml-file-google-map-sample.jpg", // Placeholder image
    },
  ];

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        {cardData.map((card, index) => (
          <div className="col-md-4 mb-4" key={index}>
            <Card title={card.title} description={card.description} image={card.image} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardContainer;

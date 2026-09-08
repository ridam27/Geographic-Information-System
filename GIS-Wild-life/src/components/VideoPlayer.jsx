import React from 'react';
import { VideoOff } from 'lucide-react';

const VideoPlayer = ({ videos }) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="video-container">
        <div className="no-media" style={{ height: '250px', justifyContent: 'center' }}>
          <VideoOff size={48} />
          <p>No video available for this location.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-container">
      <video 
        controls 
        autoPlay 
        muted 
        loop
        src={videos[0]} 
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;

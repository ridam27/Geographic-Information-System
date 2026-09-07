import React, { useState } from 'react';
import TopLoadingBar from 'react-top-loading-bar';

const App = () => {
  const [progress, setProgress] = useState(0);

  const increaseProgress = () => {
    if (progress < 100) {
      setProgress(progress + 10);
    }
  };

  const decreaseProgress = () => {
    if (progress > 0) {
      setProgress(progress - 10);
    }
  };

  return (
    <div>
      <TopLoadingBar
        progress={progress}
        color="#4caf50"
        height={3}
        onLoaderFinished={() => setProgress(0)} // reset when finished
      />
      <button onClick={increaseProgress}>Increase Progress</button>
      <button onClick={decreaseProgress}>Decrease Progress</button>
    </div>
  );
};

export default App;

# GIS Dashboard

This project is a full-stack web-based Geographic Information System (GIS) platform developed using the MERN stack (MongoDB, Express.js, React, Node.js). It offers interactive 2D and 3D data visualization capabilities, user authentication, and robust data management.

## Technologies Used

*   **MERN Stack:**
    *   **MongoDB:** Database for storing spatial and user data.
    *   **Express.js:** Backend framework for handling API requests and server logic.
    *   **React:** Frontend library for building the user interface.
    *   **Node.js:** Runtime environment for the server.
*   **UI Design:**  Focus on user-friendly and intuitive interface for GIS functionalities.
*   **Mapping Libraries:**
    *   **Leaflet:**  For 2D map visualization and interaction.
    *   **Cesium ion:** Platform for 3D globe visualization and access to geospatial data.
    *   **Three.js:** JavaScript 3D library used for advanced 3D model rendering and integration with Cesium.
*   **GIS Functionality:** Core features for working with geospatial data.
*   **2D/3D Visualization:**  Support for displaying and interacting with 2D (KML/KMZ) and 3D data (3D models).

## Features

*   **Interactive 2D/3D Data Visualization:**  Display KML/KMZ files and 3D models on interactive maps and globes.
*   **User Authentication:** Secure user registration, login, and authorization.
*   **Data Management:**  Robust system for uploading, storing, and managing geospatial data.
*   **Collaborative Development:**  Designed and built with collaboration in mind for scalability and maintainability.
*   [Add other features as needed, e.g., search functionality, data analysis tools, custom layer creation, etc.]

## Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Yalarp/GIS_dashboard.git](https://github.com/Yalarp/GIS_dashboard.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
   
    cd GIS_dashboard
    npm install
    npm run start
    ```

3.  **Install server dependencies:**
    ```bash
    cd GIS_dashboard
    cd backend
    npm install
    nodemon server.js
   
    ```



5.  **Configure Environment Variables:** Create `.env` files in both the `server` and `client` directories and add the necessary environment variables (e.g., database connection string, API keys).  See `.env.example` files if provided for the structure.

6.  **Run the application:**
    ```bash
    # In the server directory
    cd server
    nodemon server.js  # Runs the server using nodemon

    # In a separate terminal, in the client directory
    cd client
    npm run start  # or yarn start - Runs the React app
    ```


## Contributing

Contributions are welcome!  This project was developed by Pralay Tembhurne and Harsh Meshram.  Please feel free to submit pull requests or bug reports.  


## Contact

Pralay Tembhurne
2706pralay@gmail.com

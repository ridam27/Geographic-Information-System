import axios from 'axios';

const FileUploader = ({ onFileUpload }) => {
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.kml')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const fileData = e.target.result;
                    console.log("KML File Data:", fileData);

                    // Send file to backend
                    await axios.post('/api/dashboard/files/upload', {
                        name: file.name,
                        data: fileData,
                    });
                    alert('File uploaded successfully.');
                    onFileUpload(fileData);
                };
                reader.readAsText(file);
            } else {
                alert('Please upload a valid KML file.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error processing file. Please check the console for details.');
        }
    };

    return {
        handleFileChange
    };
};

export default FileUploader;

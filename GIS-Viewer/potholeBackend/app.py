from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
import os
import cv2
import csv
import re
from ultralytics import YOLO

# ------------------------------------------------------------
#  FLASK APP INITIALIZATION
# ------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY') or 'dev-secret-key'
db = SQLAlchemy()

# Configure the database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///pothole.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Directory paths
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
IMAGE_FOLDER = os.path.join('static', 'images')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['IMAGE_FOLDER'] = IMAGE_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs(IMAGE_FOLDER, exist_ok=True)

# Initialize SQLAlchemy
db.init_app(app)

# Load Model once globally.
MODEL_WEIGHTS = os.environ.get("MODEL_WEIGHTS", "swagyyyyy.pt")
model = None
try:
    model = YOLO(MODEL_WEIGHTS)
    app.logger.info(f"Loaded YOLO model from {MODEL_WEIGHTS}")
except Exception as e:
    app.logger.warning(f"Could not load YOLO model at startup: {e}. Detection will be skipped.")


# ------------------------------------------------------------
#  DB MODEL & UTILITIES
# ------------------------------------------------------------
class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_folder_name = db.Column(db.String(255), nullable=False)
    video_file = db.Column(db.String(255))
    track_csv = db.Column(db.String(255)) # Full track CSV
    pothole_csv = db.Column(db.String(255)) # Pothole detection CSV
    image_folder = db.Column(db.String(255))

    def __repr__(self):
        return f'<Video {self.video_folder_name}>'

with app.app_context():
    db.create_all()

def parse_srt_file(path):
    """Parses DJI SRT-like file for frame number and GPS data."""
    frame_data = []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return frame_data

    # Adjusted regex to be robust
    matches = re.findall(
        r"SrtCnt\s*:\s*(\d+).*?\[latitude:\s*([+-]?\d+(?:\.\d+)?)\]\s*\[longitude:\s*([+-]?\d+(?:\.\d+)?)\]\s*\[altitude:\s*([+-]?\d+(?:\.\d+)?)\]",
        content,
        re.DOTALL | re.IGNORECASE
    )

    for m in matches:
        try:
            frame_data.append({
                "frame": int(m[0]), "latitude": float(m[1]), "longitude": float(m[2]), "altitude": float(m[3])
            })
        except Exception:
            continue
    return frame_data


def generate_track_and_pothole_csvs(video_path, srt_path, output_folder, model_obj, pothole_class_id=0, skip_seconds=3):
    """Processes video, runs detection, and generates output video and CSVs."""
    
    os.makedirs(output_folder, exist_ok=True)
    images_folder = os.path.join(output_folder, "images")
    os.makedirs(images_folder, exist_ok=True)
    
    srt_data = parse_srt_file(srt_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    fps_int = int(round(fps))
    fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    base_name = os.path.splitext(os.path.basename(video_path))[0]
    output_video_path = os.path.join(output_folder, f"output_{base_name}.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps_int, (fw, fh))

    full_track = []
    pothole_track = []
    frame_number = 0
    skip_frames = int(skip_seconds * fps_int)
    skip_until = -1
    
    # Processing Loop
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        geo = next((d for d in srt_data if d["frame"] == frame_number), None)
        pothole_detected = False
        annotated = frame.copy()

        if geo:
            full_track.append({"frame": frame_number, "latitude": geo["latitude"], "longitude": geo["longitude"], "altitude": geo["altitude"]})

        # Check if detection/logging should occur
        if frame_number >= skip_until:
            if model_obj is not None:
                try:
                    results = model_obj(frame)
                    annotated = results[0].plot() # YOLO's plot utility draws boxes
                        
                    for res in results:
                        for box in getattr(res, "boxes", []):
                            if int(box.cls) == pothole_class_id:
                                pothole_detected = True
                                break
                        if pothole_detected: break
                            
                except Exception:
                    app.logger.exception("YOLO inference error.")
            
            # Pothole Logging and Skipping
            if pothole_detected and geo:
                pothole_track.append({"frame": frame_number, "latitude": geo["latitude"], "longitude": geo["longitude"], "altitude": geo["altitude"]})
                
                # Save annotated image
                try:
                    img_path = os.path.join(images_folder, f"frame_{frame_number:04d}.jpg")
                    cv2.imwrite(img_path, annotated)
                except Exception:
                    pass

                skip_until = frame_number + skip_frames
        
        # Write GPS info on the annotated frame
        if geo:
            text = (f"Lat: {geo['latitude']:.6f}, Lon: {geo['longitude']:.6f}, Alt: {geo['altitude']:.2f}m")
            cv2.putText(annotated, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        out.write(annotated)
        frame_number += 1

    cap.release()
    out.release()
    
    # Write CSVs
    track_csv = os.path.join(output_folder, "track.csv")
    pothole_csv = os.path.join(output_folder, "pothole_data.csv")
    fieldnames = ["frame", "latitude", "longitude", "altitude"]

    with open(track_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(full_track) 

    with open(pothole_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pothole_track)

    return {
        'video_file': os.path.basename(output_video_path),
        'track_csv': os.path.basename(track_csv),
        'pothole_csv': os.path.basename(pothole_csv),
        'image_folder': os.path.basename(images_folder)
    }

# ------------------------------------------------------------
#  API ENDPOINTS
# ------------------------------------------------------------

@app.route('/', methods=['GET'])
def api_root():
    """Simple root endpoint to confirm API server is running."""
    return jsonify({"status": "API Server is running", "service": "Pothole Detection"}), 200

@app.route('/process', methods=['POST'])
def process_video_api():
    """Endpoint for React app to upload video/SRT and start detection."""
    if 'video' not in request.files or 'srt' not in request.files:
        return jsonify({"error": "Video or SRT file not uploaded"}), 400

    video_file = request.files['video']
    srt_file = request.files['srt']

    video_name = os.path.splitext(video_file.filename)[0]
    folder_path = os.path.join(app.config['PROCESSED_FOLDER'], video_name)
    os.makedirs(folder_path, exist_ok=True)

    # Use temporary paths in UPLOAD_FOLDER
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    srt_path = os.path.join(app.config['UPLOAD_FOLDER'], srt_file.filename)

    video_file.save(video_path)
    srt_file.save(srt_path)

    try:
        result_paths = generate_track_and_pothole_csvs(
            video_path=video_path, srt_path=srt_path, output_folder=folder_path, model_obj=model, skip_seconds=3
        )
    except Exception as e:
        app.logger.exception("Video Processing Error")
        return jsonify({"error": f"Error processing video: {e}"}), 500

    # Save DB Entry
    new_video = Video(
        video_folder_name=video_name, video_file=result_paths['video_file'], 
        track_csv=result_paths['track_csv'], pothole_csv=result_paths['pothole_csv'], image_folder=result_paths['image_folder']
    )
    try:
        db.session.add(new_video)
        db.session.commit()
    except Exception:
        app.logger.exception("DB save error")

    # Clean up temp uploaded files
    os.remove(video_path)
    os.remove(srt_path)

    # Return success status to React, which will trigger track loading
    return jsonify({"message": "Processing complete", "folder": video_name}), 200


@app.route('/api/get_track', methods=['GET'])
@app.route('/api/track', methods=['GET'])
def api_get_track():
    """Returns GPS track data (from track.csv) for video synchronization."""
    folder = request.args.get("folder")
    if not folder: return jsonify({"error": "folder=? required"}), 400
    
    folder_path = os.path.join(app.config['PROCESSED_FOLDER'], folder)
    csv_path = os.path.join(folder_path, "track.csv") 
    video_file = f"output_{folder}.mp4"
    mp4_path = os.path.join(folder_path, video_file)

    if not os.path.exists(csv_path):
        return jsonify({"error": "Track CSV not found"}), 404

    # Get FPS from video
    fps = 30.0
    try:
        cap = cv2.VideoCapture(mp4_path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            cap.release()
    except Exception: pass 

    # Read GPS Track Data
    track = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                frame = int(row["frame"])
                lat = float(row["latitude"])
                lng = float(row["longitude"])
                alt = float(row.get("altitude") or float("nan"))
                time_sec = frame / fps 
                track.append({
                    "time": time_sec, "lat": lat, "lng": lng, "altitude": alt, "frame": frame
                })
            except Exception: continue
    
    return jsonify({
        "fps": fps,
        "video": f"/processed/{folder}/{video_file}",
        "track": track
    })


@app.route('/api/save_csv', methods=['POST'])
def api_save_csv():
    """Saves client-generated CSV to the server (e.g., manually cleaned or filtered track)."""
    try:
        data = request.get_json()
        folder = data.get('folder')
        filename = data.get('filename')
        csv_text = data.get('csvText')

        if not folder or not filename or csv_text is None: return jsonify({"error": "Missing fields"}), 400
        if '..' in folder or '/' in filename or '\\' in filename: return jsonify({"error": "Invalid path"}), 400

        target_folder = os.path.join(app.config['PROCESSED_FOLDER'], folder)
        os.makedirs(target_folder, exist_ok=True)

        file_path = os.path.join(target_folder, filename)
        with open(file_path, 'w', encoding='utf-8', newline='') as f: f.write(csv_text)

        return jsonify({"message": "saved", "url": f"/processed/{folder}/{filename}"}), 201

    except Exception as e:
        app.logger.exception("save_csv error")
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------
#  MEDIA SERVING ROUTES (Required for React to load Vidoes/Images)
# ------------------------------------------------------------
PROCESSED_FOLDER_ABS = os.path.join(os.getcwd(), PROCESSED_FOLDER)

@app.route('/processed/<folder>/<filename>')
def serve_processed_root(folder, filename):
    return send_from_directory(os.path.join(PROCESSED_FOLDER_ABS, folder), filename)

@app.route('/processed/<folder>/images/<filename>')
def serve_processed_images(folder, filename):
    return send_from_directory(os.path.join(PROCESSED_FOLDER_ABS, folder, 'images'), filename)


# ------------------------------------------------------------
#  BLUEPRINTS (Registered but not used via HTML routes)
# ------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG') == '1')

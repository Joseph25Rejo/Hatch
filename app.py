import os
import jwt
import uuid
import logging
import re
import sqlite3
from flask import Flask, request, jsonify, render_template_string, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from google.cloud import firestore
from google.cloud.firestore import ArrayUnion, ArrayRemove, SERVER_TIMESTAMP, Transaction
import json
from email.message import EmailMessage
import ssl
import smtplib
from datetime import datetime, timezone
from plagiarism_checker import PlagiarismChecker, Config as PlagiarismConfig

# --- Logging setup ---
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://thecodeworks.in/hatch", "http://localhost:8000"]}})

# --- Config ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")

# Firestore connection - Hybrid approach for local/cloud compatibility
try:
    # Try Firebase Admin SDK first (better for Cloud Run/App Engine)
    import firebase_admin
    from firebase_admin import credentials, firestore as admin_firestore
    
    cred = credentials.Certificate("firestore_credentials.json")
    if not firebase_admin._apps:  # Prevent reinitialization
        firebase_admin.initialize_app(cred)
    db = admin_firestore.client()
    
    # Collections
    hackathons_collection = db.collection("hackathons")
    users_collection = db.collection("users")
    logger.info("✅ Using Firebase Admin SDK")
    
except Exception as e:
    # Fallback to client SDK (for local development)
    logger.warning(f"⚠️ Falling back to client SDK: {e}")
    from google.cloud import firestore
    db = firestore.Client.from_service_account_json("firestore_credentials.json")
    hackathons_collection = db.collection("hackathons")
    users_collection = db.collection("users")

# Email credentials (use env vars ideally)
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "adi.profile1@gmail.com")  # Replace with your Gmail address
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "gwaryitmlyzygepr")   # Use app password (not your login password)

# --- DB helpers ---
# --- SQLite setup for user authentication ---
DB_PATH = os.getenv("SQLITE_DB_PATH", "users.db")

def init_sqlite_db():
    """Initialize SQLite database with users table"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_sqlite_db()

def get_db_connection():
    """Get SQLite database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

# --- Auth helpers ---
def create_token(user_id, email):
    payload = {"user_id": user_id, "email": email}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token):
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user = decode_token(token)
            g.user = user
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return wrapper

# --- Email functionality ---
def send_added_to_team_email(email_to, creator_name="Your team leader"):
    subject = "You're part of a team on Hatch!"
    body = f"""
    <html>
    <body style="background-color: #ffffff; color: #2ecc71; font-family: Arial, sans-serif; text-align: center;">
        <h1>🎉 Welcome to Hatch!</h1>
        <p>You've been added to a team by <strong>{creator_name}</strong> for a Hackathon.</p>
        <p style="font-size: 18px;">Get ready to innovate!</p>
        <br><br>
        <footer style="color: gray; font-size: 12px;">This is an automated message from Hatch.</footer>
    </body>
    </html>
    """

    em = EmailMessage()
    em["From"] = EMAIL_ADDRESS
    em["To"] = email_to
    em["Subject"] = subject
    em.set_content(body, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.sendmail(EMAIL_ADDRESS, email_to, em.as_string())

# --- YouTube utility functions ---
def extract_youtube_video_id(url):
    """
    Extract YouTube video ID from various YouTube URL formats
    """
    if not url:
        return None
    
    # Common YouTube URL patterns
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/v\/([a-zA-Z0-9_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def validate_youtube_url(url):
    """
    Validate if URL is a proper YouTube URL and extract video ID
    """
    if not url:
        return False, None, "URL is required"
    
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return False, None, "Invalid YouTube URL format"
    
    # Check if it's a valid YouTube domain
    if not any(domain in url.lower() for domain in ['youtube.com', 'youtu.be']):
        return False, None, "URL must be from YouTube"
    
    return True, video_id, None

# --- Routes ---
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if "@" not in email:
        return jsonify({"error": "Invalid email"}), 400

    hashed = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            conn.close()
            return jsonify({"error": "User already exists"}), 409

        cur.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed))
        user_id = cur.lastrowid
        conn.commit()
        conn.close()

        token = create_token(user_id, email)
        return jsonify({"message": "Signup successful", "token": token, "user": {"id": user_id, "email": email}}), 201
    except Exception as e:
        return jsonify({"error": "Server error", "details": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, email, password FROM users WHERE email = ?", (email,))
        user = cur.fetchone()
        conn.close()

        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = create_token(user["id"], user["email"])
        return jsonify({"message": "Login successful", "token": token, "user": {"id": user["id"], "email": user["email"]}}), 200
    except Exception as e:
        return jsonify({"error": "Server error", "details": str(e)}), 500

@app.route("/hack-create", methods=["POST"])
@token_required
def hack_create():
    """Create a hackathon entry in Firestore"""
    data = request.get_json(silent=True) or {}
    user_email = g.user["email"]

    logger.debug("Received hackathon create request from user=%s, data=%s", user_email, data)

    # generate unique code
    hack_code = "HACK-" + uuid.uuid4().hex[:8].upper()

    # extend data with admins list + code
    hackathon_doc = data.copy()
    hackathon_doc["hackCode"] = hack_code
    hackathon_doc["admins"] = [user_email]
    hackathon_doc["createdAt"] = SERVER_TIMESTAMP

    try:
        doc_ref = hackathons_collection.document(hack_code)
        doc_ref.set(hackathon_doc)
        logger.info("Hackathon created successfully: hackCode=%s", hack_code)
        return jsonify({
            "message": "Hackathon created",
            "hackCode": hack_code,
            "id": hack_code
        }), 201
    except Exception as e:
        logger.exception("Error while inserting hackathon into Firestore")
        return jsonify({
            "error": "Firestore insert failed",
            "details": str(e),
            "event": hackathon_doc
        }), 500

@app.route("/allHacks", methods=["GET"])
def get_all_hacks():
    try:
        docs = hackathons_collection.stream()
        hacks = []
        for doc in docs:
            hack_data = doc.to_dict()
            hack_data["id"] = doc.id  # Add document ID
            hacks.append(hack_data)
        return jsonify(hacks)
    except Exception as e:
        logger.error("Error fetching hackathons: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathons", "details": str(e)}), 500

@app.route("/fetchhack", methods=["GET"])
def fetch_hack():
    hack_code = request.args.get("hackCode")  # expects ?hackCode=HACK-12345
    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400
    
    try:
        doc = hackathons_collection.document(hack_code).get()
        if not doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        
        hack = doc.to_dict()
        hack["id"] = doc.id
        return jsonify(hack)
    except Exception as e:
        logger.error("Error fetching hackathon %s: %s", hack_code, str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500


@app.route("/registerteam", methods=["POST"])
@token_required
def register_team():
    data = request.get_json(silent=True) or {}
    hack_code = data.get("hackCode")
    if not hack_code:
        return jsonify({"error": "hackathonCode is required"}), 400

    # Fetch hackathon
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    team_leader = data.get("teamLeader", {})
    team_members = data.get("teamMembers", [])
    all_members = [team_leader] + team_members
    final_members = []
    
    # validate leader first
    leader_email = (team_leader.get("email") or "").lower().strip()
    if not leader_email:
        return jsonify({"error": "Team leader email required"}), 400

    try:
        leader_doc = users_collection.document(leader_email).get()
        if leader_doc.exists:
            leader_data = leader_doc.to_dict()
            if any(h["hackCode"] == hack_code for h in leader_data.get("hackathonsRegistered", [])):
                return jsonify({"error": f"Leader {leader_email} already registered in this hackathon"}), 400
    except Exception as e:
        logger.error("Error checking leader registration: %s", str(e))
        return jsonify({"error": "Failed to validate leader", "details": str(e)}), 500

    # Generate unique teamId (before looping so we can use it for each user)
    team_id = str(uuid.uuid4())

    # check and update each member
    for member in all_members:
        email = (member.get("email") or "").lower().strip()
        if not email:
            continue
        
        try:
            user_doc = users_collection.document(email).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                if any(h["hackCode"] == hack_code for h in user_data.get("hackathonsRegistered", [])):
                    # skip member already registered
                    if email == leader_email:
                        return jsonify({"error": f"Leader {email} already registered"}), 400
                    continue
                else:
                    # add hackathon with teamId (atomic operation)
                    users_collection.document(email).update({
                        "hackathonsRegistered": ArrayUnion([{
                            "hackCode": hack_code,
                            "teamId": team_id
                        }])
                    })
            else:
                # create new user (with proper timestamp)
                users_collection.document(email).set({
                    "email": email,
                    "hackathonsRegistered": [{
                        "hackCode": hack_code,
                        "teamId": team_id
                    }],
                    "hackathonsCreated": [],
                    "createdAt": SERVER_TIMESTAMP
                })
            final_members.append(member)
        except Exception as e:
            logger.error("Error processing member %s: %s", email, str(e))
            return jsonify({"error": f"Failed to process member {email}", "details": str(e)}), 500

        # Send email notification
        try:
            creator_name = team_leader.get("name", "Your team leader")
            send_added_to_team_email(email_to=email, creator_name=creator_name)
        except Exception as e:
            logger.error(f"❌ Email failed to {email}: {str(e)}")

    if not final_members or final_members[0].get("email") != leader_email:
        return jsonify({"error": "Team leader missing or invalid after validation"}), 400

    # Construct team registration object
    team_obj = {
        "teamId": team_id,
        "teamName": data.get("teamName"),
        "teamLeader": final_members[0],
        "teamMembers": final_members[1:],  # rest after leader
        "paymentDetails": data.get("paymentDetails", {}),
    }

    # Insert into hackathon registrations
    try:
        hack_ref = hackathons_collection.document(hack_code)
        hack_data = hack_doc.to_dict()
        
        # Initialize registrations array if it doesn't exist
        if "registrations" not in hack_data:
            hack_data["registrations"] = []
        
        hack_ref.update({"registrations": ArrayUnion([team_obj])})
    except Exception as e:
        logger.error("Error updating hackathon registrations: %s", str(e))
        return jsonify({"error": "Failed to register team", "details": str(e)}), 500

    return jsonify({
        "message": "Team registered successfully",
        "team": team_obj
    }), 201


@app.route("/managehack", methods=["POST"])
@token_required
def manage_hack():
    """
    Manage a hackathon (only admins allowed).
    Payload:
    {
        "hackCode": "HACK-XXXX",
        "action": "update" | "view" | "add_admin" | "remove_admin",
        "updateFields": {...},    # for action=update
        "adminEmail": "..."       # for add/remove admin
    }
    """
    data = request.get_json(silent=True) or {}
    hack_code = data.get("hackCode")
    action = data.get("action")
    user_email = g.user["email"]

    if not hack_code or not action:
        return jsonify({"error": "hackCode and action are required"}), 400

    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # --- check if requester is admin ---
    if user_email not in hack.get("admins", []):
        return jsonify({"error": "Not authorized. Only admins can manage this hackathon."}), 403

    # --- handle actions ---
    if action == "view":
        # show hackathon details including registrations
        hack["id"] = hack_code  # make JSON safe
        return jsonify(hack), 200

    elif action == "update":
        update_fields = data.get("updateFields", {})
        if not update_fields:
            return jsonify({"error": "updateFields is required for update action"}), 400
        try:
            hackathons_collection.document(hack_code).update(update_fields)
            return jsonify({"message": "Hackathon updated successfully"}), 200
        except Exception as e:
            logger.error("Error updating hackathon: %s", str(e))
            return jsonify({"error": "Failed to update hackathon", "details": str(e)}), 500

    elif action == "add_admin":
        new_admin = (data.get("adminEmail") or "").lower().strip()
        if not new_admin:
            return jsonify({"error": "adminEmail is required"}), 400
        try:
            hack_ref = hackathons_collection.document(hack_code)
            hack_data = hack_doc.to_dict()
            hack_ref.update({"admins": ArrayUnion([new_admin])})
            return jsonify({"message": f"{new_admin} added as admin"}), 200
        except Exception as e:
            logger.error("Error adding admin: %s", str(e))
            return jsonify({"error": "Failed to add admin", "details": str(e)}), 500

    elif action == "remove_admin":
        remove_admin = (data.get("adminEmail") or "").lower().strip()
        if not remove_admin:
            return jsonify({"error": "adminEmail is required"}), 400
        if remove_admin == user_email:
            return jsonify({"error": "You cannot remove yourself"}), 400
        try:
            hack_ref = hackathons_collection.document(hack_code)
            hack_data = hack_doc.to_dict()
            hack_ref.update({"admins": ArrayRemove([remove_admin])})
            return jsonify({"message": f"{remove_admin} removed from admins"}), 200
        except Exception as e:
            logger.error("Error removing admin: %s", str(e))
            return jsonify({"error": "Failed to remove admin", "details": str(e)}), 500

    else:
        return jsonify({"error": f"Unknown action: {action}"}), 400
@app.route("/getTeamDetails", methods=["POST"])
@token_required
def get_team_details():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    hack_code = data.get("hackCode")

    if not email or not hack_code:
        return jsonify({"error": "email and hackCode are required"}), 400

    # --- Step 1: Check users collection for email ---
    try:
        user_doc_ref = users_collection.document(email)
        user_doc = user_doc_ref.get()
        if not user_doc.exists:
            return jsonify({
                "message": "User not found",
                "registrationStatus": "no",
                "team": None
            }), 200
        user_data = user_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching user: %s", str(e))
        return jsonify({"error": "Failed to fetch user", "details": str(e)}), 500

    # --- Step 2: Verify hackCode in hackathonsRegistered ---
    user_data = user_doc.to_dict()
    hackathons_registered = user_data.get("hackathonsRegistered", [])
    reg_entry = next(
        (h for h in hackathons_registered if h["hackCode"] == hack_code),
        None
    )

    if not reg_entry:
        return jsonify({
            "message": f"User {email} is not registered in hackathon {hack_code}",
            "registrationStatus": "no",
            "team": None
        }), 200

    team_id = reg_entry["teamId"]

    # --- Step 3: Fetch hackathon from Firestore ---
    try:
        hackathon_doc_ref = hackathons_collection.document(hack_code)
        hackathon_doc = hackathon_doc_ref.get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon_data = hackathon_doc.to_dict()
        hackathon_data["id"] = hackathon_doc.id
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # --- Step 4: Find team details inside hackathon.registrations ---
    team_details = next(
        (t for t in hackathon_data.get("registrations", []) if t["teamId"] == team_id),
        None
    )

    return jsonify({
        "message": "Team details fetched successfully",
        "registrationStatus": "yes",
        "hackathon": {
            "hackCode": hackathon_data.get("hackCode"),
            "eventName": hackathon_data.get("eventName"),
            "eventDescription": hackathon_data.get("eventDescription"),
            "eventStartDate": hackathon_data.get("eventStartDate"),
            "eventEndDate": hackathon_data.get("eventEndDate"),
        },
        "team": team_details
    }), 200

@app.route("/leaveTeam", methods=["POST"])
@token_required
def leave_team():
    data = request.get_json(silent=True) or {}
    hack_code = data.get("hackCode")
    email = (data.get("email") or "").strip().lower()

    if not hack_code or not email:
        return jsonify({"error": "hackCode and email are required"}), 400

    # --- Users collection ---
    try:
        user_doc_ref = users_collection.document(email)
        user_doc = user_doc_ref.get()
        if not user_doc.exists:
            return jsonify({"error": f"User {email} not found"}), 404
        user_data = user_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching user: %s", str(e))
        return jsonify({"error": "Failed to fetch user", "details": str(e)}), 500

    reg_entry = next(
        (h for h in user_data.get("hackathonsRegistered", []) if h["hackCode"] == hack_code),
        None
    )
    if not reg_entry:
        return jsonify({"error": f"User {email} not registered in hackathon {hack_code}"}), 404

    team_id = reg_entry["teamId"]

    # --- Hackathon collection ---
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    team = next((t for t in hack.get("registrations", []) if t["teamId"] == team_id), None)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # --- Remove user from team ---
    try:
        if team.get("teamLeader", {}).get("email") == email:
            # If leader leaves, promote first member if exists, else delete team
            if team.get("teamMembers"):
                new_leader = team["teamMembers"].pop(0)
                team["teamLeader"] = new_leader
                hackathons_collection.document(hack_code).update({"registrations": hack["registrations"]})
            else:
                # delete team entirely
                registrations = [r for r in hack.get("registrations", []) if r["teamId"] != team_id]
                hackathons_collection.document(hack_code).update({"registrations": registrations})
        else:
            # Remove from teamMembers
            team["teamMembers"] = [m for m in team.get("teamMembers", []) if m.get("email") != email]

            # If no members + no leader → delete team
            if not team.get("teamMembers") and not team.get("teamLeader"):
                registrations = [r for r in hack.get("registrations", []) if r["teamId"] != team_id]
                hackathons_collection.document(hack_code).update({"registrations": registrations})
            else:
                # Otherwise, update team with new members
                for i, reg in enumerate(hack.get("registrations", [])):
                    if reg["teamId"] == team_id:
                        hack["registrations"][i] = team
                        break
                hackathons_collection.document(hack_code).update({"registrations": hack["registrations"]})
    except Exception as e:
        logger.error("Error updating team: %s", str(e))
        return jsonify({"error": "Failed to update team", "details": str(e)}), 500

    # --- Remove hackathon from user's record (atomic operation) ---
    try:
        users_collection.document(email).update({
            "hackathonsRegistered": ArrayRemove([{
                "hackCode": hack_code,
                "teamId": team_id
            }])
        })
    except Exception as e:
        logger.error("Error updating user record: %s", str(e))
        return jsonify({"error": "Failed to update user record", "details": str(e)}), 500

    return jsonify({
        "message": f"{email} left team {team_id} in hackathon {hack_code} successfully"
    }), 200

@app.route("/submissions", methods=["POST"])
@token_required
def submissions():
    data = request.get_json(silent=True) or {}
    hack_code = data.get("hackCode")
    team_id = data.get("teamId")
    phase_index = data.get("phaseIndex")
    submission_content = data.get("submissions")

    if not hack_code or not team_id or phase_index is None or not submission_content:
        return jsonify({"error": "hackCode, teamId, phaseIndex and submissions are required"}), 400

    # Fetch hackathon
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # Find the team inside registrations
    team = next((t for t in hack.get("registrations", []) if t["teamId"] == team_id), None)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # Ensure submissions array exists
    if "submissions" not in team:
        team["submissions"] = []

    # Check if phaseIndex already exists
    existing = next((s for s in team["submissions"] if s["phaseId"] == phase_index), None)
    if existing:
        existing["submissions"] = submission_content
    else:
        team["submissions"].append({
            "phaseId": phase_index,
            "submissions": submission_content
        })

    # Update team in DB
    try:
        # Find and update the specific team
        for i, reg in enumerate(hack.get("registrations", [])):
            if reg["teamId"] == team_id:
                hack["registrations"][i] = team
                break
        hackathons_collection.document(hack_code).update({"registrations": hack["registrations"]})
    except Exception as e:
        logger.error("Error updating submission: %s", str(e))
        return jsonify({"error": "Failed to save submission", "details": str(e)}), 500

    return jsonify({
        "message": "Submission saved successfully",
        "teamId": team_id,
        "phaseIndex": phase_index,
        "submission": submission_content
    }), 200


@app.route("/fetchsubmissions", methods=["GET"])
@token_required
def fetch_submissions():
    hack_code = request.args.get("hackCode")
    team_id = request.args.get("teamId")

    if not hack_code or not team_id:
        return jsonify({"error": "hackCode and teamId are required"}), 400

    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    team = next((t for t in hack.get("registrations", []) if t["teamId"] == team_id), None)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    return jsonify({
        "teamId": team_id,
        "submissions": team.get("submissions", [])
    }), 200

@app.route("/announcements", methods=["POST"])
def create_announcement():
    data = request.json
    hack_code = data.get("hackCode")
    title = data.get("title")
    content = data.get("content")
    expiry_date = data.get("expiryDate")
    user_email = data.get("userEmail")

    if not hack_code or not title or not content or not expiry_date:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        expiry_datetime = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
        if expiry_datetime <= datetime.now(timezone.utc):
            return jsonify({"error": "Expiry date must be in the future"}), 400
    except ValueError:
        return jsonify({"error": "Invalid expiry date format"}), 400

    announcement = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "createdBy": user_email,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "expiryDate": expiry_date
    }

    try:
        # Fetch current hackathon data
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        
        hack_data = hack_doc.to_dict()
        
        # Initialize announcements array if it doesn't exist
        if "announcements" not in hack_data:
            hack_data["announcements"] = []
        
        hackathons_collection.document(hack_code).update({"announcements": ArrayUnion([announcement])})
        
        return jsonify({"message": "Announcement created successfully", "announcement": announcement}), 201
        
    except Exception as e:
        logger.error("Error creating announcement: %s", str(e))
        return jsonify({"error": "Failed to create announcement", "details": str(e)}), 500


@app.route("/announcements", methods=["GET"])
def get_announcements():
    hack_code = request.args.get("hackCode")
    include_expired = request.args.get("includeExpired", "false").lower() == "true"

    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400

    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    announcements = hackathon.get("announcements", [])

    if not include_expired:
        current_time = datetime.now(timezone.utc)
        active_announcements = []
        for announcement in announcements:
            try:
                expiry_datetime = datetime.fromisoformat(
                    announcement["expiryDate"].replace("Z", "+00:00")
                )
                if expiry_datetime > current_time:
                    active_announcements.append(announcement)
            except (ValueError, KeyError):
                continue
        announcements = active_announcements

    return jsonify({"announcements": announcements}), 200


@app.route("/grading", methods=["POST"])
@token_required
def grading():
    data = request.get_json(silent=True) or {}
    hack_code = data.get("hackCode")
    team_id = data.get("teamId")
    phase_id = data.get("phaseId")
    score = data.get("score")

    if not hack_code or not team_id or phase_id is None or score is None:
        return jsonify({"error": "hackCode, teamId, phaseId, and score are required"}), 400

    # Fetch hackathon
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # Find the team
    team = next((t for t in hack.get("registrations", []) if t["teamId"] == team_id), None)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # Ensure team has submissions
    if "submissions" not in team or not team["submissions"]:
        return jsonify({"error": "No submissions found for this team"}), 404

    # Find the submission for given phaseId
    submission = next((s for s in team["submissions"] if s["phaseId"] == phase_id), None)
    if not submission:
        return jsonify({"error": "Submission for this phase not found"}), 404

    # Attach/Update score
    if "score" not in submission:
        submission["score"] = score
    else:
        submission["score"] = score  # overwrite (if you only want first-time set, remove this line)

    # Save back
    try:
        # Find and update the specific team
        for i, reg in enumerate(hack.get("registrations", [])):
            if reg["teamId"] == team_id:
                hack["registrations"][i] = team
                break
        hackathons_collection.document(hack_code).update({"registrations": hack["registrations"]})
    except Exception as e:
        logger.error("Error updating score: %s", str(e))
        return jsonify({"error": "Failed to save score", "details": str(e)}), 500

    return jsonify({
        "message": "Score added successfully",
        "teamId": team_id,
        "phaseId": phase_id,
        "score": submission["score"]
    }), 200

@app.route("/eliminate", methods=["POST"])
def eliminate():
    hack_code = request.args.get("hackCode")
    phase_id = request.args.get("phaseId", type=int)
    data = request.get_json()
    cutoff_score = data.get("cutoff_score")

    if not hack_code or phase_id is None or cutoff_score is None:
        return jsonify({"error": "hackCode, phaseId, and cutoff_score required"}), 400

    # fetch hackathon
    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    updated_teams = {
        "active": [],
        "inactive": []
    }

    for team in hackathon.get("registrations", []):
        submissions = team.get("submissions", [])
        submission = next(
            (s for s in submissions if int(s.get("phaseId", -1)) == phase_id),
            None
        )
        score = submission.get("score") if submission else None

        if score is not None and score >= cutoff_score:
            team["status"] = "active"
            updated_teams["active"].append(team["teamId"])
        else:
            team["status"] = "inactive"
            updated_teams["inactive"].append(team["teamId"])

    # update registrations back in DB
    try:
        hackathons_collection.document(hack_code).update({"registrations": hackathon["registrations"]})
    except Exception as e:
        logger.error("Error updating eliminations: %s", str(e))
        return jsonify({"error": "Failed to update eliminations", "details": str(e)}), 500

    return jsonify({
        "message": "Elimination completed",
        "cutoff_score": cutoff_score,
        "updatedTeams": updated_teams
    }), 200
# Enhanced /publishresults endpoint - Replace the existing one in your app.py

@app.route("/publishresults", methods=["POST"])
@token_required
def publish_results():
    """
    Publish results for a hackathon and automatically send certificates to all participants.
    Expected JSON payload from frontend:
    {
        "eventName": "trial123 nice",
        "hackCode": "HACK-D5AE6861",
        "leaderboard": [
            {
                "teamId": "1cd0d454-3612-4c9b-9a43-b90b267db0dd",
                "teamName": "rv",
                "memberCount": 1,
                "phaseScores": [{...}, {...}],
                "totalScore": 13,
                "rank": 1
            },
            ...
        ],
        "publishedAt": "2025-08-20T10:44:03.547Z",
        "totalTeams": 3
    }
    """
    data = request.get_json(silent=True) or {}
    user_email = g.user["email"]
    
    hack_code = data.get("hackCode")
    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400
    
    # Verify user is admin of this hackathon
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500
    
    if user_email not in hack.get("admins", []):
        return jsonify({"error": "Not authorized. Only admins can publish results."}), 403
    
    # Prepare results data with the exact structure from frontend
    results = {
        "eventName": data.get("eventName", ""),
        "hackCode": hack_code,
        "leaderboard": data.get("leaderboard", []),
        "totalTeams": data.get("totalTeams", 0),
        "publishedAt": data.get("publishedAt", datetime.now().isoformat() + "Z"),
        "publishedBy": user_email
    }
    
    # Update the hackathon document in Firestore
    try:
        hackathons_collection.document(hack_code).update({"results": results})
        logger.info(f"Results published for hackathon {hack_code} by {user_email}")
        
        # 🎯 NEW: Automatically send certificates to all participants
        certificate_status = send_certificates_to_all_participants(hack_code, results["leaderboard"], hack)
        
        return jsonify({
            "message": "Results published successfully",
            "results": results,
            "certificateStatus": certificate_status
        }), 200
        
    except Exception as e:
        logger.error(f"Error publishing results: {str(e)}")
        return jsonify({"error": "Failed to publish results", "details": str(e)}), 500


def send_certificates_to_all_participants(hack_code, leaderboard, hackathon_doc):
    """
    Send certificates to all participants based on their ranking
    """
    logger.info(f"Starting certificate distribution for hackathon {hack_code}")
    
    certificate_status = {
        "total_teams": len(leaderboard),
        "certificates_sent": 0,
        "failed_sends": 0,
        "details": []
    }
    
    event_name = hackathon_doc.get("eventName", "Hackathon Event")
    organizers = hackathon_doc.get("organisers", [])
    organizer_name = organizers[0].get("name", "Event Organizer") if organizers else "Event Organizer"
    
    for team_result in leaderboard:
        team_id = team_result.get("teamId")
        rank = team_result.get("rank", 999)
        team_name = team_result.get("teamName", "Team")
        
        try:
            # Find the actual team details in registrations
            team_details = None
            for registration in hackathon_doc.get("registrations", []):
                if registration.get("teamId") == team_id:
                    team_details = registration
                    break
            
            if not team_details:
                logger.warning(f"Team details not found for teamId: {team_id}")
                certificate_status["failed_sends"] += 1
                certificate_status["details"].append({
                    "teamId": team_id,
                    "teamName": team_name,
                    "status": "failed",
                    "reason": "Team details not found"
                })
                continue
            
            # Send certificate to team leader
            team_leader = team_details.get("teamLeader", {})
            participant_email = team_leader.get("email", "")
            participant_name = team_leader.get("name", "Participant")
            
            if not participant_email:
                logger.warning(f"No email found for team leader of team {team_name}")
                certificate_status["failed_sends"] += 1
                certificate_status["details"].append({
                    "teamId": team_id,
                    "teamName": team_name,
                    "status": "failed",
                    "reason": "No email address found"
                })
                continue
            
            # Generate certificate URL
            certificate_url = f"{request.url_root}certificate?hackCode={hack_code}&teamId={team_id}&rank={rank}"
            
            # Determine achievement text based on rank
            if rank == 1:
                achievement = "🥇 First Place Winner"
                subject_prefix = "🏆 WINNER!"
            elif rank == 2:
                achievement = "🥈 Second Place Winner"
                subject_prefix = "🥈 RUNNER-UP!"
            elif rank == 3:
                achievement = "🥉 Third Place Winner"
                subject_prefix = "🥉 THIRD PLACE!"
            else:
                achievement = "Certificate of Participation"
                subject_prefix = "🎉 PARTICIPANT!"
            
            # Send email with certificate
            success = send_certificate_email(
                participant_email, 
                participant_name, 
                event_name, 
                certificate_url, 
                achievement,
                subject_prefix,
                organizer_name
            )
            
            if success:
                certificate_status["certificates_sent"] += 1
                certificate_status["details"].append({
                    "teamId": team_id,
                    "teamName": team_name,
                    "participantName": participant_name,
                    "participantEmail": participant_email,
                    "rank": rank,
                    "achievement": achievement,
                    "status": "sent",
                    "certificate_url": certificate_url
                })
                logger.info(f"Certificate sent to {participant_email} for team {team_name} (Rank: {rank})")
            else:
                certificate_status["failed_sends"] += 1
                certificate_status["details"].append({
                    "teamId": team_id,
                    "teamName": team_name,
                    "participantName": participant_name,
                    "participantEmail": participant_email,
                    "status": "failed",
                    "reason": "Email sending failed"
                })
                
        except Exception as e:
            logger.error(f"Error sending certificate to team {team_id}: {str(e)}")
            certificate_status["failed_sends"] += 1
            certificate_status["details"].append({
                "teamId": team_id,
                "teamName": team_name,
                "status": "failed",
                "reason": f"Exception: {str(e)}"
            })
    
    logger.info(f"Certificate distribution completed. Sent: {certificate_status['certificates_sent']}, Failed: {certificate_status['failed_sends']}")
    return certificate_status


def send_certificate_email(participant_email, participant_name, event_name, certificate_url, achievement, subject_prefix, organizer_name):
    """
    Send individual certificate email
    """
    try:
        subject = f"{subject_prefix} Your Certificate from {event_name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; font-size: 2.5rem; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🎉 Congratulations!
                </h1>
                <p style="color: white; font-size: 1.2rem; margin: 10px 0 0 0; opacity: 0.9;">
                    {event_name} Results
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <p style="font-size: 1.1rem; margin: 0 0 15px 0;">Dear <strong>{participant_name}</strong>,</p>
                <p style="font-size: 1rem; margin: 0 0 15px 0;">
                    The results for <strong>{event_name}</strong> have been published, and we're excited to share your achievement!
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 5px solid #27ae60;">
                    <p style="margin: 0; font-size: 1.1rem; color: #27ae60; font-weight: bold;">
                        🏆 Your Achievement: {achievement}
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 1rem; margin-bottom: 20px;">Your official certificate is ready for download:</p>
                <a href="{certificate_url}" 
                   style="background: linear-gradient(45deg, #667eea, #764ba2); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold;
                          display: inline-block;
                          font-size: 1.1rem;
                          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);">
                    📜 View & Download Your Certificate
                </a>
            </div>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #2980b9; margin: 0 0 10px 0;">📋 What you can do:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #2c3e50;">
                    <li>View your personalized certificate online</li>
                    <li>Download it as a high-quality PDF</li>
                    <li>Share it on social media and LinkedIn</li>
                    <li>Add it to your professional portfolio</li>
                </ul>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
                <p style="font-size: 1rem; margin-bottom: 10px;">
                    Thank you for your participation and congratulations once again! 🎊
                </p>
                <p style="font-size: 0.9rem; color: #7f8c8d; margin: 0;">
                    Best regards,<br>
                    <strong>{organizer_name}</strong><br>
                    {event_name} Organizing Team
                </p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <div style="text-align: center;">
                <p style="color: #7f8c8d; font-size: 0.8rem; margin: 0;">
                    This is an automated message sent upon publishing of hackathon results.<br>
                    If you have any questions, please contact the organizing team.
                </p>
            </div>
        </body>
        </html>
        """
        
        em = EmailMessage()
        em["From"] = EMAIL_ADDRESS
        em["To"] = participant_email
        em["Subject"] = subject
        em.set_content(body, subtype="html")
        
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.sendmail(EMAIL_ADDRESS, participant_email, em.as_string())
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send certificate email to {participant_email}: {str(e)}")
        return False


# Keep the existing certificate generation endpoint as well
@app.route("/certificate", methods=["GET"])
def generate_certificate():
    """
    Alternative approach using templates folder
    Place the certificate.html template in your Flask templates/ directory
    """
    hack_code = request.args.get("hackCode")
    team_id = request.args.get("teamId")
    rank = request.args.get("rank", "Participant")
    
    if not hack_code or not team_id:
        return jsonify({"error": "hackCode and teamId are required"}), 400
    
    try:
        # Same data processing logic...
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
        
        team = None
        for registration in hackathon.get("registrations", []):
            if registration.get("teamId") == team_id:
                team = registration
                break
        
        if not team:
            return jsonify({"error": "Team not found"}), 404
        
        participant_name = team.get("teamLeader", {}).get("name", "Participant")
        team_name = team.get("teamName", "Team")
        event_name = hackathon.get("eventName", "Hackathon Event")
        organizers = hackathon.get("organisers", [])
        organizer_name = organizers[0].get("name", "Event Organizer") if organizers else "Event Organizer"
        
        try:
            rank_int = int(rank)
            if rank_int == 1:
                achievement = "First Place Winner"
            elif rank_int == 2:
                achievement = "Second Place Winner"  
            elif rank_int == 3:
                achievement = "Third Place Winner"
            else:
                achievement = "Certificate of Participation"
        except:
            achievement = "Certificate of Participation"
        
        current_date = datetime.now().strftime("%B %d, %Y")
        
        template_data = {
            'participant_name': participant_name,
            'team_name': team_name,
            'event_name': event_name,
            'achievement': achievement,
            'organizer_name': organizer_name,
            'certificate_date': current_date,
            'hack_code': hack_code
        }
        
        # Use Flask's render_template for external template file
        # Make sure certificate.html is in your templates/ directory
        from flask import render_template
        return render_template('certificate.html', **template_data)
            
    except Exception as e:
        logger.error(f"Error generating certificate: {str(e)}")
        return jsonify({"error": "Failed to generate certificate", "details": str(e)}), 500

@app.route("/results", methods=["GET"])
def get_results():
    """
    Get published results for a hackathon.
    Query params: ?hackCode=HACK-XXXX
    """
    hack_code = request.args.get("hackCode")
    
    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400
    
    # Find the hackathon in Firestore
    try:
        hack_doc = hackathons_collection.document(hack_code).get()
        if not hack_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hack = hack_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500
    
    # Check if results exist
    if "results" not in hack:
        return jsonify({"error": "Results not published yet for this hackathon"}), 404
    
    return jsonify({
        "hackCode": hack_code,
        "results": hack["results"]
    }), 200

@app.route("/check-plagiarism", methods=["POST"])
def check_plagiarism():
    """Check a GitHub repository for plagiarism"""
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get('repository_url')
        
        if not repo_url:
            return jsonify({"error": "repository_url is required"}), 400
        
        # Validate GitHub URL
        if 'github.com' not in repo_url:
            return jsonify({"error": "Only GitHub repositories are supported"}), 400
        
        # Import plagiarism checker
        try:
            from plagiarism_checker import PlagiarismChecker
        except ImportError:
            logger.error("PlagiarismChecker module not found")
            return jsonify({
                "success": False,
                "error": "Plagiarism checker service unavailable",
                "message": "Internal service configuration error"
            }), 503
        
        # Initialize plagiarism checker with GitHub token
        github_token = os.getenv('GITHUB_TOKEN', '')
        if not github_token:
            logger.warning("No GitHub token provided, analysis may be limited")
        
        checker = PlagiarismChecker(github_token)
        
        # Run plagiarism check with cross-platform timeout protection
        import threading
        import time
        
        result_container = {'result': None, 'exception': None}
        thread_done = threading.Event()
        
        def run_check():
            try:
                result_container['result'] = checker.check_repository(repo_url)
            except Exception as e:
                result_container['exception'] = e
            finally:
                thread_done.set()
        
        # Start the check in a separate thread
        check_thread = threading.Thread(target=run_check)
        check_thread.daemon = True
        check_thread.start()
        
        # Wait for completion with timeout (3 minutes)
        if not thread_done.wait(timeout=180):  # 3 minutes timeout
            logger.error(f"Plagiarism check timed out for repository: {repo_url}")
            return jsonify({
                "success": False,
                "error": "Analysis timed out",
                "message": "Repository analysis took too long. Try with a smaller repository."
            }), 408
        
        # If thread completed, check for exceptions
        if result_container['exception']:
            raise result_container['exception']
        
        result = result_container['result']
        
        return jsonify({
            "success": True,
            "data": result
        })
        
    except ValueError as e:
        logger.error(f"Invalid repository URL: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Invalid repository URL",
            "message": str(e)
        }), 400
        
    except Exception as e:
        logger.error(f"Plagiarism check failed: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Analysis failed",
            "message": str(e)
        }), 500

# --- Sponsor Showcase Management Endpoints ---

@app.route("/sponsor-showcase", methods=["POST"])
@token_required
def add_sponsor_showcase():
    """
    Add or update sponsor showcase video for a hackathon.
    Only admins of the hackathon can add/update sponsor showcases.
    
    Expected payload:
    {
        "hackCode": "HACK-XXXX",
        "sponsorName": "Sponsor Name",
        "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
        "title": "Showcase Title",
        "description": "Showcase Description",
        "tier": "platinum|gold|silver|bronze", // optional
        "logo": "https://logo-url.com", // optional
        "website": "https://website.com" // optional
    }
    """
    data = request.get_json(silent=True) or {}
    user_email = g.user["email"]
    
    hack_code = data.get("hackCode")
    sponsor_name = data.get("sponsorName")
    youtube_url = data.get("youtubeUrl")
    title = data.get("title")
    description = data.get("description", "")
    tier = data.get("tier", "bronze")
    logo = data.get("logo", "")
    website = data.get("website", "")
    
    if not hack_code or not sponsor_name or not youtube_url or not title:
        return jsonify({"error": "hackCode, sponsorName, youtubeUrl, and title are required"}), 400
    
    # Validate YouTube URL
    is_valid, video_id, error_msg = validate_youtube_url(youtube_url)
    if not is_valid:
        return jsonify({"error": error_msg}), 400
    
    # Check if hackathon exists
    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # Check if user is admin
    if user_email not in hackathon.get("admins", []):
        return jsonify({"error": "Not authorized. Only admins can manage sponsor showcases."}), 403
    
    # Prepare showcase data
    showcase_data = {
        "youtubeUrl": youtube_url,
        "videoId": video_id,
        "title": title,
        "description": description,
        "uploadedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "isActive": True
    }
    
    # Find existing sponsor or create new one
    sponsors = hackathon.get("sponsors", [])
    sponsor_found = False
    
    for sponsor in sponsors:
        if sponsor.get("name", "").lower() == sponsor_name.lower():
            # Update existing sponsor
            sponsor["showcase"] = showcase_data
            if tier:
                sponsor["tier"] = tier
            if logo:
                sponsor["logo"] = logo
            if website:
                sponsor["website"] = website
            sponsor_found = True
            break
    
    if not sponsor_found:
        # Create new sponsor entry
        new_sponsor = {
            "name": sponsor_name,
            "tier": tier,
            "logo": logo,
            "website": website,
            "showcase": showcase_data
        }
        sponsors.append(new_sponsor)
    
    # Update hackathon document
    try:
        hackathons_collection.document(hack_code).update({"sponsors": sponsors})
        logger.info(f"Sponsor showcase added/updated for {sponsor_name} in hackathon {hack_code} by {user_email}")
        
        return jsonify({
            "message": "Sponsor showcase added/updated successfully",
            "sponsorName": sponsor_name,
            "videoId": video_id,
            "showcase": showcase_data
        }), 201
        
    except Exception as e:
        logger.error(f"Error updating sponsor showcase: {str(e)}")
        return jsonify({"error": "Failed to update sponsor showcase", "details": str(e)}), 500


@app.route("/sponsor-showcase", methods=["GET"])
def get_sponsor_showcases():
    """
    Get all sponsor showcases for a hackathon.
    Query params: ?hackCode=HACK-XXXX&activeOnly=true
    """
    hack_code = request.args.get("hackCode")
    active_only = request.args.get("activeOnly", "false").lower() == "true"
    
    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400
    
    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500
    
    sponsors = hackathon.get("sponsors", [])
    showcases = []
    
    # Check if we need to migrate any sponsors missing isActive field
    migration_needed = False
    for sponsor in sponsors:
        if "showcase" in sponsor and "isActive" not in sponsor["showcase"]:
            sponsor["showcase"]["isActive"] = True
            migration_needed = True
    
    # If migration was needed, update the database
    if migration_needed:
        try:
            hackathons_collection.document(hack_code).update({"sponsors": sponsors})
            logger.info(f"Migrated isActive field for sponsors in hackathon {hack_code}")
        except Exception as e:
            logger.error(f"Error migrating sponsor data: {str(e)}")
    
    for sponsor in sponsors:
        if "showcase" in sponsor:
            showcase = sponsor["showcase"]
            # Ensure isActive is always explicitly set (default to True for backwards compatibility)
            if "isActive" not in showcase:
                showcase["isActive"] = True
            
            if not active_only or showcase.get("isActive", True):
                sponsor_info = {
                    "name": sponsor.get("name", ""),
                    "tier": sponsor.get("tier", "bronze"),
                    "logo": sponsor.get("logo", ""),
                    "website": sponsor.get("website", ""),
                    "showcase": showcase
                }
                showcases.append(sponsor_info)
    
    return jsonify({
        "hackCode": hack_code,
        "eventName": hackathon.get("eventName", ""),
        "showcases": showcases,
        "total": len(showcases)
    }), 200


@app.route("/sponsor-showcase/<sponsor_name>", methods=["DELETE"])
@token_required
def remove_sponsor_showcase(sponsor_name):
    """
    Remove sponsor showcase or deactivate it.
    Query params: ?hackCode=HACK-XXXX&action=remove|deactivate
    """
    hack_code = request.args.get("hackCode")
    action = request.args.get("action", "deactivate")  # remove or deactivate
    user_email = g.user["email"]
    
    if not hack_code:
        return jsonify({"error": "hackCode is required"}), 400
    
    if action not in ["remove", "deactivate"]:
        return jsonify({"error": "action must be 'remove' or 'deactivate'"}), 400
    
    # Check if hackathon exists
    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500

    # Check if user is admin
    if user_email not in hackathon.get("admins", []):
        return jsonify({"error": "Not authorized. Only admins can manage sponsor showcases."}), 403
    
    sponsors = hackathon.get("sponsors", [])
    sponsor_found = False
    
    for sponsor in sponsors:
        if sponsor.get("name", "").lower() == sponsor_name.lower():
            if "showcase" in sponsor:
                if action == "remove":
                    del sponsor["showcase"]
                elif action == "deactivate":
                    sponsor["showcase"]["isActive"] = False
                sponsor_found = True
                break
    
    if not sponsor_found:
        return jsonify({"error": f"Sponsor '{sponsor_name}' or their showcase not found"}), 404
    
    # Update hackathon document
    try:
        hackathons_collection.document(hack_code).update({"sponsors": sponsors})
        logger.info(f"Sponsor showcase {action}d for {sponsor_name} in hackathon {hack_code} by {user_email}")
        
        return jsonify({
            "message": f"Sponsor showcase {action}d successfully",
            "sponsorName": sponsor_name,
            "action": action
        }), 200
        
    except Exception as e:
        logger.error(f"Error {action}ing sponsor showcase: {str(e)}")
        return jsonify({"error": f"Failed to {action} sponsor showcase", "details": str(e)}), 500


@app.route("/sponsor-showcase/reorder", methods=["POST"])
@token_required
def reorder_sponsor_showcases():
    """
    Reorder sponsor showcases for display priority.
    
    Expected payload:
    {
        "hackCode": "HACK-XXXX",
        "sponsorOrder": ["Sponsor1", "Sponsor2", "Sponsor3"]
    }
    """
    data = request.get_json(silent=True) or {}
    user_email = g.user["email"]
    
    hack_code = data.get("hackCode")
    sponsor_order = data.get("sponsorOrder", [])
    
    if not hack_code or not sponsor_order:
        return jsonify({"error": "hackCode and sponsorOrder are required"}), 400
    
    # Check if hackathon exists
    try:
        hackathon_doc = hackathons_collection.document(hack_code).get()
        if not hackathon_doc.exists:
            return jsonify({"error": "Hackathon not found"}), 404
        hackathon = hackathon_doc.to_dict()
    except Exception as e:
        logger.error("Error fetching hackathon: %s", str(e))
        return jsonify({"error": "Failed to fetch hackathon", "details": str(e)}), 500
    
    # Check if user is admin
    if user_email not in hackathon.get("admins", []):
        return jsonify({"error": "Not authorized. Only admins can manage sponsor showcases."}), 403
    
    sponsors = hackathon.get("sponsors", [])
    reordered_sponsors = []
    
    # Reorder sponsors based on the provided order
    for sponsor_name in sponsor_order:
        for sponsor in sponsors:
            if sponsor.get("name", "").lower() == sponsor_name.lower():
                reordered_sponsors.append(sponsor)
                break
    
    # Add any remaining sponsors not in the order list
    for sponsor in sponsors:
        sponsor_name = sponsor.get("name", "")
        if not any(s.get("name", "").lower() == sponsor_name.lower() for s in reordered_sponsors):
            reordered_sponsors.append(sponsor)
    
    # Update hackathon document
    try:
        hackathons_collection.document(hack_code).update({"sponsors": reordered_sponsors})
        logger.info(f"Sponsor showcases reordered in hackathon {hack_code} by {user_email}")
        
        return jsonify({
            "message": "Sponsor showcases reordered successfully",
            "newOrder": [s.get("name", "") for s in reordered_sponsors]
        }), 200
        
    except Exception as e:
        logger.error(f"Error reordering sponsor showcases: {str(e)}")
        return jsonify({"error": "Failed to reorder sponsor showcases", "details": str(e)}), 500
    

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
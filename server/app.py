import os
import json
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Path to the credentials file (shared with the stealth bot)
CREDS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'accounts_credentials.json'))

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": "online",
        "service": "Nexus Hub Backend",
        "version": "1.0.0"
    })

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    if not os.path.exists(CREDS_PATH):
        return jsonify({"error": "Credentials file not found"}), 404
    
    try:
        with open(CREDS_PATH, 'r', encoding='utf-8') as f:
            profiles = json.load(f)
        
        # Clean up sensitive data before sending to frontend
        safe_profiles = []
        for p in profiles:
            safe_profiles.append({
                "username": p.get("username"),
                "name": (p.get("name") or "").strip(),
                "country_id": p.get("country_id"),
                "region_id": p.get("region_id")
            })
            
        return jsonify(safe_profiles)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

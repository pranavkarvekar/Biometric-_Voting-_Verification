from flask import Flask, jsonify
import serial
import pymysql
import re
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Global variable for serial connection (initialize later)
arduino = None

# Connect to MySQL Database
db = pymysql.connect(host="localhost", user="root", password="pict123", database="voting_system")
cursor = db.cursor()

# Store IDs of voters who have already voted
voted_voters = set()

def get_fingerprint_id():
    """ Read fingerprint ID from Arduino """
    if arduino is None:
        print("❌ Serial connection not established!")
        return None

    print("Waiting for fingerprint scan...")
    arduino.write(b'START\n')  # Send command to Arduino

    while True:
        fingerprint_data = arduino.readline().decode().strip()
        if fingerprint_data:
            print(f"Received from Arduino: {fingerprint_data}")

        if "NO MATCH FOUND" in fingerprint_data:
            print("\n❌ Unregistered fingerprint detected.")
            return None

        match = re.search(r"MATCHED ID: (\d+)", fingerprint_data)
        if match:
            return int(match.group(1))  # Extracted fingerprint ID


def check_fingerprint_in_db(fingerprint_id):
    """ Compare fingerprint ID with stored data in MySQL """
    sql = "SELECT voterID, Voter_name, Assembly_name FROM voter WHERE fingerprint_id = %s"
    cursor.execute(sql, (fingerprint_id,))
    result = cursor.fetchone()

    if result:
        return {"status": "success", "voterID": result[0], "name": result[1], "assembly": result[2]}
    else:
        return {"status": "failed", "message": "Fingerprint not recognized!"}

@app.route('/scan_fingerprint', methods=['GET'])
def scan_fingerprint():
    """ API to scan fingerprint and return voter details """
    fingerprint_id = get_fingerprint_id()

    if fingerprint_id:
        if fingerprint_id in voted_voters:
            return jsonify({"status": "failed", "message": "Voter already voted!"})

        result = check_fingerprint_in_db(fingerprint_id)
        
        if result["status"] == "success":
            voted_voters.add(fingerprint_id)  # Mark voter as voted
            return jsonify({
                "status": "success",
                "voterID": result["voterID"],
                "name": result["name"],
                "assembly": result["assembly"]
            })
        else:
            return jsonify({"status": "failed", "message": "Fingerprint not recognized!"})
    
    return jsonify({"status": "failed", "message": "No fingerprint detected!"})

if __name__ == "__main__":
    if arduino is None:  # Ensure Serial is not opened twice
        try:
            arduino = serial.Serial('COM8', 9600, timeout=1)
            print("✅ Serial connection established!")
        except serial.SerialException as e:
            print(f"❌ Serial connection error: {e}")
            arduino = None

    app.run(debug=False, host="0.0.0.0", port=5000)

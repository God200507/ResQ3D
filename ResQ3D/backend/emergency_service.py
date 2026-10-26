from datetime import datetime, timezone
from pathlib import Path
import hashlib
import hmac
import json
import os
import secrets
import smtplib
from email.message import EmailMessage

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data'
INCIDENT_FILE = DATA_DIR / 'active_incident.json'
CAMERAS_FILE = DATA_DIR / 'cameras.json'

SECRET = os.getenv('RESQ3D_SECRET', 'resq3d-demo-secret-change-me').encode()

DEFAULT_CAMERAS = [
    {'camera_id':'CAM-G-01','name':'Ground Entrance','floor':0,'room':'GROUND_SECURITY','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-F1-01','name':'First Floor Corridor','floor':1,'room':'F1_LAB_01','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-F2-01','name':'Floor 2 Laboratory','floor':2,'room':'F2_LAB_01','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-F2-02','name':'Floor 2 Corridor','floor':2,'room':'F2_LAB_01','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-F3-01','name':'IoT Lab','floor':3,'room':'F3_IOT_LAB','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-F4-01','name':'Research Lab','floor':4,'room':'F4_PROJECT_LAB','stream_url':'','status':'ONLINE'},
    {'camera_id':'CAM-ST-B','name':'Emergency Stair B','floor':2,'room':'STAIR_B','stream_url':'','status':'ONLINE'},
]

def read_json(path, default):
    if not path.exists(): return default
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return default

def write_json(path, value):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding='utf-8')

def cameras():
    data = read_json(CAMERAS_FILE, None)
    if not isinstance(data, list) or not data:
        write_json(CAMERAS_FILE, DEFAULT_CAMERAS)
        return json.loads(json.dumps(DEFAULT_CAMERAS))
    return data

def cameras_for(floor=None, room=None):
    result = cameras()
    if floor is not None:
        result = [c for c in result if int(c.get('floor', -1)) == int(floor)]
    if room:
        room_upper = str(room).upper()
        matched = [c for c in result if room_upper in str(c.get('room','')).upper()]
        if matched: result = matched
    return result

def sign_token(token):
    return hmac.new(SECRET, token.encode(), hashlib.sha256).hexdigest()[:24]

def make_token():
    raw = secrets.token_urlsafe(24)
    return raw + '.' + sign_token(raw)

def valid_token(token):
    try:
        raw, sig = token.split('.', 1)
        return hmac.compare_digest(sign_token(raw), sig)
    except Exception:
        return False

def create_incident(sensor, risk=None, evacuation=None, public_url=None, recipient=None):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing = read_json(INCIDENT_FILE, None)
    if isinstance(existing, dict) and existing.get('active') and valid_token(existing.get('token','')):
        return existing

    token = make_token()
    floor = int(sensor.get('floor', 0))
    room = str(sensor.get('room', 'UNKNOWN'))
    risk_level = (risk or {}).get('level', 'CRITICAL' if sensor.get('fire_emergency') else 'HIGH')
    stair = (evacuation or {}).get('selected_stair_name') or (evacuation or {}).get('selected_stair') or 'Pending AI analysis'
    base = (public_url or os.getenv('RESQ3D_PUBLIC_URL') or 'http://127.0.0.1:5500').rstrip('/')
    link = f'{base}/emergency.html?token={token}'
    incident = {
        'incident_id': 'INC-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '-' + secrets.token_hex(2).upper(),
        'active': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'building': os.getenv('RESQ3D_BUILDING_NAME', 'ResQ3D Institutional Building'),
        'floor': floor,
        'room': room,
        'sensor_id': sensor.get('sensor_id'),
        'device_id': sensor.get('device_id'),
        'gas_value': sensor.get('gas_value'),
        'temperature': sensor.get('temperature'),
        'risk_level': risk_level,
        'recommended_stair': stair,
        'people_at_risk': (evacuation or {}).get('people_at_risk'),
        'camera_count': len(cameras_for(floor, room)),
        'token': token,
        'portal_url': link,
        'email_sent': False,
        'email_recipient': recipient or os.getenv('RESQ3D_FIREFIGHTER_EMAIL', ''),
    }
    write_json(INCIDENT_FILE, incident)
    return incident

def send_firefighter_email(incident, recipient=None):
    to = recipient or incident.get('email_recipient') or os.getenv('RESQ3D_FIREFIGHTER_EMAIL', '')
    host = os.getenv('RESQ3D_SMTP_HOST', '')
    user = os.getenv('RESQ3D_SMTP_USER', '')
    password = os.getenv('RESQ3D_SMTP_PASSWORD', '')
    port = int(os.getenv('RESQ3D_SMTP_PORT', '587'))
    sender = os.getenv('RESQ3D_SMTP_FROM', user)
    if not all([to, host, user, password, sender]):
        return False, 'SMTP/email settings are not configured.'

    msg = EmailMessage()
    msg['Subject'] = f"🚨 ResQ3D FIRE ALERT — Floor {incident['floor']} — {incident['room']}"
    msg['From'] = sender
    msg['To'] = to
    url = incident['portal_url']
    msg.set_content(
        f"RESQ3D FIRE EMERGENCY\n\n"
        f"Building: {incident['building']}\n"
        f"Location: Floor {incident['floor']} / {incident['room']}\n"
        f"Risk: {incident['risk_level']}\n"
        f"Recommended Stair: {incident['recommended_stair']}\n\n"
        f"Open the ResQ3D emergency portal:\n{url}\n"
    )
    msg.add_alternative(f'''<!doctype html><html><body style="font-family:Arial,sans-serif;background:#07101a;color:#eaf5ff;padding:24px">
    <div style="max-width:650px;margin:auto;background:#0d1825;padding:24px;border-radius:14px;border:1px solid #33485c">
    <h2 style="color:#ff6961">🚨 RESQ3D FIRE EMERGENCY</h2>
    <p><b>Building:</b> {incident['building']}</p>
    <p><b>Location:</b> Floor {incident['floor']} · {incident['room']}</p>
    <p><b>Risk:</b> <span style="color:#ff5d67">{incident['risk_level']}</span></p>
    <p><b>Recommended Stair:</b> {incident['recommended_stair']}</p>
    <p>Open the emergency portal for the 3D digital twin, incident location and available camera feeds.</p>
    <p><a href="{url}" style="display:inline-block;padding:14px 20px;background:#00bfe8;color:#00131b;text-decoration:none;border-radius:8px;font-weight:bold">OPEN RESQ3D LIVE BUILDING</a></p>
    </div></body></html>''', subtype='html')
    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
        incident['email_sent'] = True
        incident['email_recipient'] = to
        write_json(INCIDENT_FILE, incident)
        return True, 'Emergency email sent.'
    except Exception as exc:
        return False, str(exc)

def clear_incident():
    current = read_json(INCIDENT_FILE, {})
    if isinstance(current, dict):
        current['active'] = False
        current['cleared_at'] = datetime.now(timezone.utc).isoformat()
        write_json(INCIDENT_FILE, current)
    return current

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timezone
from pathlib import Path
import json, sys

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data'
DATA_FILE = DATA_DIR / 'sensor_latest.json'
HISTORY_FILE = DATA_DIR / 'sensor_history.json'
SENSORS_FILE = DATA_DIR / 'sensors.json'

sys.path.insert(0, str(BASE_DIR))
from ai.risk_engine import analyze
from ai.evacuation_engine import recommend
from ai.vision_engine import VisionEngine
from emergency_service import create_incident, send_firefighter_email, clear_incident, valid_token, cameras, cameras_for

app = Flask(__name__)
CORS(app)
vision_engine = VisionEngine()

DEFAULT_DATA = {
    'device_id':'TINKERCAD-UNO-01','sensor_id':'SENSOR-F2-LAB','gas_value':85,
    'temperature':24.78,'gas_detected':False,'high_temperature':False,
    'fire_emergency':False,'floor':2,'room':'F2_LAB_01','timestamp':None
}

DEFAULT_SENSORS = {
    'SENSOR-G-SECURITY': {'device_id':'TINKERCAD-UNO-01','floor':0,'room':'GROUND_SECURITY','gas_value':85,'temperature':24.7,'gas_detected':False,'high_temperature':False,'fire_emergency':False},
    'SENSOR-F1-LAB': {'device_id':'TINKERCAD-UNO-02','floor':1,'room':'F1_LAB_01','gas_value':85,'temperature':24.7,'gas_detected':False,'high_temperature':False,'fire_emergency':False},
    'SENSOR-F2-LAB': {'device_id':'TINKERCAD-UNO-03','floor':2,'room':'F2_LAB_01','gas_value':85,'temperature':24.7,'gas_detected':False,'high_temperature':False,'fire_emergency':False},
    'SENSOR-F3-IOT': {'device_id':'TINKERCAD-UNO-04','floor':3,'room':'F3_IOT_LAB','gas_value':85,'temperature':24.7,'gas_detected':False,'high_temperature':False,'fire_emergency':False},
    'SENSOR-F4-RESEARCH': {'device_id':'TINKERCAD-UNO-05','floor':4,'room':'F4_PROJECT_LAB','gas_value':85,'temperature':24.7,'gas_detected':False,'high_temperature':False,'fire_emergency':False},
}

def read_json(path, default):
    if not path.exists(): return default
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return default

def write_json(path, value):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding='utf-8')

def load_sensors():
    data = read_json(SENSORS_FILE, None)
    if not isinstance(data, dict) or not data:
        write_json(SENSORS_FILE, DEFAULT_SENSORS)
        return json.loads(json.dumps(DEFAULT_SENSORS))
    return data

def save_sensor(data): write_json(DATA_FILE, data)
def load_sensor():
    data=read_json(DATA_FILE,None)
    if data is None:
        save_sensor(DEFAULT_DATA); return DEFAULT_DATA.copy()
    return data

def add_history(data):
    history=read_json(HISTORY_FILE,[])
    if not isinstance(history,list): history=[]
    history.insert(0,data)
    write_json(HISTORY_FILE,history[:100])

def normalize_sensor(incoming):
    gas=float(incoming.get('gas_value',0)); temp=float(incoming.get('temperature',0))
    return {
      'device_id':incoming.get('device_id','TINKERCAD-UNO-01'),
      'sensor_id':incoming.get('sensor_id','SENSOR-F2-LAB'),
      'gas_value':gas,'temperature':temp,
      'gas_detected':gas>=200,'high_temperature':temp>=50,
      'fire_emergency':gas>=200 and temp>=50,
      'floor':int(incoming.get('floor',2)),
      'room':incoming.get('room','F2_LAB_01'),
      'timestamp':datetime.now(timezone.utc).isoformat()
    }

@app.get('/api/health')
def health(): return jsonify({'status':'online','service':'ResQ3D IoT API'})

@app.get('/api/vision/status')
def vision_status():
    return jsonify(vision_engine.status())

@app.post('/api/vision/verify')
def vision_verify():
    if 'image' not in request.files:
        return jsonify({'success':False,'verified':False,'error':'Upload an image using field name: image'}), 400
    upload = request.files['image']
    temp_dir = DATA_DIR / 'vision_uploads'
    temp_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(upload.filename or 'camera.jpg').name
    temp_path = temp_dir / safe_name
    upload.save(temp_path)
    try:
        return jsonify(vision_engine.verify_image(str(temp_path)))
    finally:
        try: temp_path.unlink()
        except OSError: pass

@app.get('/api/cameras')
def camera_list():
    return jsonify(cameras())


@app.post('/api/camera/verify-and-alert')
def camera_verify_and_alert():
    if 'image' not in request.files:
        return jsonify({'success':False,'verified':False,'error':'Upload a camera snapshot using field name: image'}), 400
    upload=request.files['image']
    camera_id=request.form.get('camera_id','')
    floor=int(request.form.get('floor','2'))
    room=request.form.get('room','F2_LAB_01')
    temp_dir=DATA_DIR/'vision_uploads'; temp_dir.mkdir(parents=True,exist_ok=True)
    safe_name=Path(upload.filename or 'camera.jpg').name
    temp_path=temp_dir/safe_name
    upload.save(temp_path)
    try:
        verification=vision_engine.verify_image(str(temp_path))
    finally:
        try: temp_path.unlink()
        except OSError: pass
    if not verification.get('success'):
        return jsonify({'success':False,'verified':False,'verification':verification}),400
    if not verification.get('verified'):
        return jsonify({'success':True,'verified':False,'verification':verification,'message':'Camera evidence did not meet the MVP visual threshold. No firefighter alert was created.'})
    sensor={'device_id':'CAMERA-AI','sensor_id':camera_id or 'CAMERA-VERIFIED','gas_value':230,'temperature':75,'gas_detected':True,'high_temperature':True,'fire_emergency':True,'floor':floor,'room':room}
    risk_data=analyze(sensor, read_json(HISTORY_FILE,[]))
    evacuation_data=recommend(floor,0,risk_data.get('level','CRITICAL'),1,10)
    incident=create_incident(sensor,risk_data,evacuation_data,request.form.get('public_url'),request.form.get('recipient'))
    send_requested=request.form.get('send_email','true').lower()!='false'
    email_ok,email_message=(send_firefighter_email(incident,request.form.get('recipient')) if send_requested else (False,'Email sending skipped.'))
    return jsonify({'success':True,'verified':True,'verification':verification,'incident':incident,'email_sent':email_ok,'email_message':email_message,'portal_url':incident['portal_url']})

@app.get('/api/emergency/current')
def current_emergency():
    incident = read_json(DATA_DIR / 'active_incident.json', {})
    return jsonify(incident if isinstance(incident, dict) else {})

@app.post('/api/emergency/create')
def create_emergency():
    incoming=request.get_json(silent=True) or {}
    sensor=load_sensor()
    sensor.update({k:v for k,v in incoming.items() if k in {'floor','room','sensor_id','device_id','gas_value','temperature','fire_emergency'}})
    risk_data=analyze(sensor, read_json(HISTORY_FILE,[]))
    evacuation_data=recommend(int(sensor.get('floor',0)), 0, risk_data.get('level','CRITICAL'), int(incoming.get('affected_rooms',1)), int(incoming.get('people_at_risk',10)))
    incident=create_incident(sensor,risk_data,evacuation_data, incoming.get('public_url'), incoming.get('recipient'))
    send_requested=bool(incoming.get('send_email', True))
    email_ok, email_message=(send_firefighter_email(incident,incoming.get('recipient')) if send_requested else (False,'Email sending skipped.'))
    return jsonify({'success':True,'incident':incident,'email_sent':email_ok,'email_message':email_message,'portal_url':incident['portal_url']})

@app.get('/api/emergency/<token>')
def emergency_portal_data(token):
    if not valid_token(token): return jsonify({'error':'Invalid or expired emergency link'}),403
    incident=read_json(DATA_DIR / 'active_incident.json',{})
    if not incident or incident.get('token') != token: return jsonify({'error':'Emergency incident not found'}),404
    cams=cameras_for(incident.get('floor'),incident.get('room'))
    return jsonify({'incident':incident,'cameras':cams})

@app.post('/api/emergency/clear')
def emergency_clear():
    return jsonify({'success':True,'incident':clear_incident()})

@app.get('/api/sensor')
def sensor(): return jsonify(load_sensor())

@app.get('/api/sensors')
def sensors():
    data=load_sensors()
    return jsonify(list(data.values()))

@app.get('/api/history')
def history(): return jsonify(read_json(HISTORY_FILE,[]))


@app.get('/api/analytics')
def analytics():
    history=read_json(HISTORY_FILE,[])
    sensors=list(load_sensors().values())
    total=len(history)
    fires=[x for x in history if x.get('fire_emergency')]
    gas=[x for x in history if x.get('gas_detected') and not x.get('fire_emergency')]
    heat=[x for x in history if x.get('high_temperature') and not x.get('fire_emergency')]
    floors={}
    rooms={}
    for x in history:
        f=str(x.get('floor','?')); r=str(x.get('room','Unknown'))
        floors[f]=floors.get(f,0)+1; rooms[r]=rooms.get(r,0)+1
    return jsonify({
      'total_events':total, 'fire_events':len(fires),
      'gas_warnings':len(gas), 'temperature_warnings':len(heat),
      'current_sensors':len(sensors),
      'active_sensors':sum(1 for x in sensors if x.get('fire_emergency') or x.get('gas_detected') or x.get('high_temperature')),
      'events_by_floor':floors, 'events_by_room':rooms,
      'last_event':history[0] if history else None,
      'first_event':history[-1] if history else None
    })

@app.get('/api/report')
def report():
    history=read_json(HISTORY_FILE,[])
    sensors=list(load_sensors().values())
    fires=[x for x in history if x.get('fire_emergency')]
    return jsonify({
      'project':'ResQ3D', 'report_type':'Emergency Incident Report',
      'generated_at':datetime.now(timezone.utc).isoformat(),
      'sensor_count':len(sensors), 'event_count':len(history),
      'fire_event_count':len(fires),
      'active_incident':any(x.get('fire_emergency') or x.get('gas_detected') or x.get('high_temperature') for x in sensors),
      'sensors':sensors, 'recent_events':history[:20]
    })

@app.get('/api/system-health')
def system_health():
    sensors=load_sensors()
    return jsonify({
      'api':'ONLINE', 'sensor_nodes':len(sensors),
      'timestamp':datetime.now(timezone.utc).isoformat(),
      'nodes':[{
        'sensor_id':k, 'device_id':v.get('device_id'),
        'floor':v.get('floor'), 'room':v.get('room'),
        'status':'ALERT' if (v.get('fire_emergency') or v.get('gas_detected') or v.get('high_temperature')) else 'NORMAL'
      } for k,v in sensors.items()]
    })

@app.post('/api/sensor')
def receive_sensor():
    data=normalize_sensor(request.get_json(silent=True) or {})
    all_sensors=load_sensors(); all_sensors[data['sensor_id']]=data
    write_json(SENSORS_FILE,all_sensors); save_sensor(data); add_history(data)
    return jsonify({'success':True,'data':data})

@app.post('/api/multisensor')
def receive_multisensor():
    incoming=request.get_json(silent=True) or {}
    events=incoming.get('sensors',[])
    if not isinstance(events,list): return jsonify({'success':False,'error':'sensors must be a list'}),400
    results=[]
    for item in events:
        data=normalize_sensor(item); results.append(data)
        all_sensors=load_sensors(); all_sensors[data['sensor_id']]=data; write_json(SENSORS_FILE,all_sensors)
        add_history(data)
    if results: save_sensor(results[-1])
    return jsonify({'success':True,'count':len(results),'sensors':results})

@app.get('/api/incident')
def incident():
    nodes=list(load_sensors().values())
    active=[x for x in nodes if x.get('fire_emergency')]
    gas=[x for x in nodes if x.get('gas_detected')]
    heat=[x for x in nodes if x.get('high_temperature')]
    return jsonify({
      'active':bool(active or gas or heat), 'fire_nodes':active,
      'gas_nodes':gas, 'heat_nodes':heat,
      'affected_floors':sorted(set(x['floor'] for x in active)),
      'active_nodes':len(active), 'total_nodes':len(nodes),
      'timestamp':datetime.now(timezone.utc).isoformat()
    })

@app.get('/api/risk')
def risk():
    current=load_sensor(); hist=read_json(HISTORY_FILE,[])
    return jsonify(analyze(current,hist))

@app.post('/api/evacuation')
def evacuation():
    incoming=request.get_json(silent=True) or {}
    return jsonify(recommend(int(incoming.get('fire_floor',0)),float(incoming.get('fire_x',0)),incoming.get('risk_level','LOW'),int(incoming.get('affected_rooms',1)),int(incoming.get('people_at_risk',10))))

@app.post('/api/reset')
def reset():
    reset=json.loads(json.dumps(DEFAULT_DATA)); reset['timestamp']=datetime.now(timezone.utc).isoformat(); save_sensor(reset)
    fresh=json.loads(json.dumps(DEFAULT_SENSORS))
    for x in fresh.values(): x['timestamp']=reset['timestamp']
    write_json(SENSORS_FILE,fresh)
    return jsonify({'success':True,'data':reset})

if __name__=='__main__':
    DATA_DIR.mkdir(parents=True,exist_ok=True)
    save_sensor(load_sensor()); load_sensors()
    print('RESQ3D IoT API: http://127.0.0.1:5000')
    print('Multi-sensor: http://127.0.0.1:5000/api/sensors')
    app.run(host='127.0.0.1',port=5000,debug=True)

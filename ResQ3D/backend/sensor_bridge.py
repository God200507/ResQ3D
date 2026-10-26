import requests, time
API='http://127.0.0.1:5000/api'
NODES={
  '1':('SENSOR-G-SECURITY',0,'GROUND_SECURITY'),
  '2':('SENSOR-F1-LAB',1,'F1_LAB_01'),
  '3':('SENSOR-F2-LAB',2,'F2_LAB_01'),
  '4':('SENSOR-F3-IOT',3,'F3_IOT_LAB'),
  '5':('SENSOR-F4-RESEARCH',4,'F4_PROJECT_LAB'),
}

def send(sensor_id,floor,room,gas,temp):
    r=requests.post(API+'/sensor',json={'sensor_id':sensor_id,'device_id':'TINKERCAD-SIM','floor':floor,'room':room,'gas_value':gas,'temperature':temp},timeout=5)
    print(r.json()['data'])

def multisensor_fire():
    events=[]
    for sid,floor,room in NODES.values():
        gas,temp=(230,75) if floor==2 else (205,58) if floor==1 else (90,25)
        events.append({'sensor_id':sid,'device_id':'TINKERCAD-MULTI','floor':floor,'room':room,'gas_value':gas,'temperature':temp})
    r=requests.post(API+'/multisensor',json={'sensors':events},timeout=5); print(r.json())

print('RESQ3D TINKERCAD BRIDGE')
while True:
    print('\n1 SAFE  2 GAS  3 HEAT  4 FIRE  5 MULTI-SENSOR FIRE  6 CUSTOM  0 EXIT')
    c=input('Select: ').strip()
    try:
      if c=='0': break
      if c=='1': send(*NODES['3'],85,25)
      elif c=='2': send(*NODES['3'],230,25)
      elif c=='3': send(*NODES['3'],90,75)
      elif c=='4': send(*NODES['3'],230,75)
      elif c=='5': multisensor_fire()
      elif c=='6':
        gas=float(input('Gas: ')); temp=float(input('Temperature: ')); key=input('Node 1-5: ').strip() or '3'
        send(*NODES.get(key,NODES['3']),gas,temp)
      else: print('Invalid option')
    except Exception as e: print('Bridge error:',e)

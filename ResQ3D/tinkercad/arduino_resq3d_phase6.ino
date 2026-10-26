// RESQ3D Phase 6 - Tinkercad Arduino Uno
// Gas sensor + TMP36 + Piezo buzzer
const int GAS=A0, TEMP=A1, BUZZER=8;
const int GAS_THRESHOLD=200;
const float TEMP_THRESHOLD=50.0;
void setup(){Serial.begin(9600);pinMode(BUZZER,OUTPUT);}
void loop(){
  int gas=analogRead(GAS); int raw=analogRead(TEMP);
  float voltage=raw*(5.0/1023.0); float temp=(voltage-0.5)*100.0;
  bool gd=gas>=GAS_THRESHOLD, ht=temp>=TEMP_THRESHOLD, fire=gd&&ht;
  if(fire) tone(BUZZER,1000); else if(gd) tone(BUZZER,700); else if(ht) tone(BUZZER,500); else noTone(BUZZER);
  Serial.print("RESQ3D,SENSOR-F2-LAB,2,F2_LAB_01,");
  Serial.print(gas); Serial.print(","); Serial.print(temp,2); Serial.print(",");
  Serial.println(fire?"FIRE":(gd?"GAS":(ht?"HEAT":"SAFE")));
  delay(1000);
}

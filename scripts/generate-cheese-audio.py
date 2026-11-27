"""Synthesize Utakt's Ost på rømmen music/cues; no third-party samples.
Source: Akademiet-ki-lab/Utakt utakt.js c20ffdd, musicBeat(index=1), addCues.
Run with python3 scripts/generate-cheese-audio.py.
"""
import math, wave, array
from pathlib import Path
rate=22050
seconds=60/116
audio=[0.0]*int((128*seconds+0.35)*rate)
def tone(when,pitch,duration,volume,kind='triangle',end=None):
    end=pitch if end is None else end
    phase=0
    for j in range(int(duration*rate)):
        index=int(when*rate)+j
        if not 0<=index<len(audio): continue
        time=j/rate
        frequency=pitch*(end/pitch)**(time/duration)
        phase=(phase+frequency/rate)%1
        value=4*abs(phase-.5)-1 if kind=='triangle' else 2*phase-1
        envelope=(.0001+(volume-.0001)*time/.005) if time<.005 else volume*(.0001/volume)**((time-.005)/max(.001,duration-.005))
        audio[index]+=value*envelope*.75
for n in range(128):
    measure=n//4;step=n%4;when=n*seconds;root=[130.81,110,98,116.54][measure%4]
    tone(when,170 if step%2 else 105,.12,.13,end=65 if step%2 else 42)
    tone(when,root*[.5,.75,1,.5][step],.19,.12)
    tone(when+.5*seconds,root*[2,2.5,3,2][step],.075,.045,'sawtooth')
    if step==3 and (measure<12 or measure>=16):tone(when+.25*seconds,root*4,.13,.045)
for bar in [2,4,6,8,10,12,14,16,18,20,22,24,25,26,27,28,29,30,31]:
    sock=bar in [12,14,18,22,25,28,30]
    for i,offset in enumerate([0,1,1.5] if sock else [0,1]):
        pitch=[490,820,1050][i]
        tone((bar*4+offset)*seconds,pitch,.09,.18,'sawtooth' if i==0 else 'triangle',pitch*.72)
    if bar in [2,12]:tone((bar*4+(2.5 if sock else 2))*seconds,360,.09,.21,end=360*.72)
path=Path('apps/mobile/assets/ost-pa-rommen.wav')
with wave.open(str(path),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
    f.writeframes(array.array('h',(round(max(-1,min(1,n))*32767) for n in audio)).tobytes())
print(path, path.stat().st_size)

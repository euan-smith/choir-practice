import { MIDIFile } from './midi';
import { MidiInstrument } from './instrument';

export class PartSource{
  static fromUrl(url){
    const SourceClass = this.getClass(url);
    return new SourceClass(url);
  }
  static getClass(url){
    if (MidiPartSource.test(url)){
      return MidiPartSource;
    } else {
      return AudioPartSource;
    } 
  }
  static canSetSpeed(url){
    return this.getClass(url).canSetSpeed;
  }
  constructor(url){
    this.url=url;
    let q;
    [this.file,q] = url.split('?');
    this.query = !q ? {} : q.split('&')
      .map(s=>s.split('='))
      .reduce((q,a)=>(q[a[0]]=a[1],q),{});
    this.bytes = 1;
    this.received = 0;
    this.onended = null;
  }

  static async chunkLoader(file, instance, cb){
    const response = await fetch(file);
    const reader = response.body.getReader();
  
    // Step 2: get total length
    instance.bytes = +response.headers.get('Content-Length');
  
    // Step 3: read the data
    instance.received = 0; // received that many bytes at the moment
    let chunks = []; // array of received binary chunks (comprises the body)
    while(true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      this.received += value.length;
      cb(instance);
    }
  
    // Step 4: concatenate chunks into single Uint8Array
    let chunksAll = new Uint8Array(instance.bytes); // (4.1)
    let position = 0;
    for(let chunk of chunks) {
      chunksAll.set(chunk, position); // (4.2)
      position += chunk.length;
    }
    return chunksAll.buffer;
  }
  
}

export class AudioPartSource extends PartSource{
  static canSetSpeed = false;
  constructor(url){
    super(url);
    this.buffer = null;
    this.decoded = false;
    this.source = null;
  }

  async load(ac,cb){
    const fileBuffer = await PartSource.chunkLoader(this.file, this, cb)
    this.buffer = await ac.decodeAudioData(fileBuffer);
  }

  start(ac, dest, when, from){
    this.source = new AudioBufferSourceNode(ac, {
      buffer: this.buffer
    });
    this.source.connect(dest);
    this.source.start(ac.currentTime+when, from);
    this.source.onended = ()=> {if (this.oneneded) this.onended()};
  }

  stop(){
    this.source.disconnect();
    this.source.stop();
    this.source = null;
  }
}


const MidiFiles = new Map();
export class MidiPartSource extends PartSource{
  static canSetSpeed = true;
  static test(url){
    return /\.mid\?/.test(url)
  }
  static async get(file, instance, cb){
    let songPromise = MidiFiles.get(file);
    if (songPromise){
      // already being downloaded elsewhere, so just put in a nominal received.
      instance.received = instance.bytes;
    } else {
      songPromise = this.load(file, instance, cb);
      MidiFiles.set(file,songPromise);  
      // songPromise.then(s=>console.log(s))
    }
    return songPromise;
  }
  static async load(file, instance, cb){
    const b = await PartSource.chunkLoader(file, instance, cb);
    const midi = new MIDIFile(b);
    return midi.parseSong();
  }
  constructor(url){
    super(url);
    console.log(url,this.query);
    this.trackIndex = +this.query.track;
    this.overrideProg = this.query.hasOwnProperty('prog');
    this.program = +this.query.prog;
    this.stopping = false;
    this.started = false;
    this._loop = Promise.resolve();
  }
  async load(ac,cb){
    this.song = await MidiPartSource.get(this.file, this, cb);
    this.track = this.song.tracks[this.trackIndex];
    this.inst = await MidiInstrument.load(ac,this.overrideProg ? this.program : this.track.program);
  }
  start(ac, dest, when, from, until, speed){
    if (this.started) return;
    this.stopping=false;
    when+=ac.currentTime;
    this._loop = this.loop(ac,dest,when,from,undefined,speed);
  }
  async loop(ac, dest, when, from, until,speed){
    if (!this.instrument)this.instrument = await MidiInstrument.player(ac,this.inst,dest);
    if (!until) until = this.song.duration;
    console.log(until);
    this.started = true;
    const offset = when*speed - from;
    let noteIdx = 0;
    const {notes} = this.track;
    while (noteIdx<notes.length && (notes[noteIdx].when+notes[noteIdx].duration)<from) noteIdx++;
    const susNotes=[];
    const play = (p,w,d)=>{
      this.instrument.play(p, w).stop(w+Math.min(d,3));
      while (this.track.program>10 && d>3){
        d-=3; w+=3;
        this.instrument.play(p, w,{attack:0.3}).stop(w+Math.min(d,3));
      }
    }
    while(!this.stopping){
      const now = ac.currentTime*speed - offset;
      if (now >= until) break;
      if (noteIdx<notes.length){
        while (noteIdx<notes.length && notes[noteIdx].when<now + 0.5) {
          let {pitch, when, duration} = notes[noteIdx];
          if (when<now){
            duration -= now-when;
            when = now;
          }
          play(pitch, (when+offset)/speed, duration/speed);
          noteIdx++;
        }
      }
      await new Promise(requestAnimationFrame);
    }
    this.started = false;
    if (this.onended) this.onended();
  }
  stop(){
    if (!this.started) return;
    this.instrument.stop();
    this.stopping = true;
  }
}

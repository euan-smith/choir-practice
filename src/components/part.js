import { MIDIFile } from './midi';
import audioLoader from 'audio-loader';
import samplePlayer from 'sample-player';
export class PartSource{
  static fromUrl(url){
    if (MidiPartSource.test(url)){
      return new MidiPartSource(url);
    } else {
      return new AudioPartSource(url);
    }
  }
  constructor(url){
    this.url=url;
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
  constructor(url){
    super(url);
    this.buffer = null;
    this.decoded = false;
    this.source = null;
  }

  async load(ac,cb){
    const fileBuffer = await PartSource.chunkLoader(this.url, this, cb)
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

const INSTRUMENTS = [
  "acoustic_grand_piano", //0
  "bright_acoustic_piano",
  "electric_grand_piano",
  "honkytonk_piano",
  "electric_piano_1",
  "electric_piano_2", //5
  "harpsichord",
  "clavinet",
  "celesta",
  "glockenspiel",
  "music_box", //10
  "vibraphone",
  "marimba",
  "xylophone",
  "tubular_bells",
  "dulcimer", //15
  "drawbar_organ",
  "percussive_organ",
  "rock_organ",
  "church_organ",
  "reed_organ", //20
  "accordion",
  "harmonica",
  "tango_accordion",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel", //25
  "electric_guitar_jazz",
  "electric_guitar_clean",
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar", //30
  "guitar_harmonics",
  "acoustic_bass",
  "electric_bass_finger",
  "electric_bass_pick",
  "fretless_bass", //35
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",
  "synth_bass_2",
  "violin", //40
  "viola",
  "cello",
  "contrabass",
  "tremolo_strings",
  "pizzicato_strings", //45
  "orchestral_harp",
  "timpani",
  "string_ensemble_1",
  "string_ensemble_2",
  "synth_strings_1", //50
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "orchestra_hit", //55
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn", //60
  "brass_section",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax", //65
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon", //70
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute", //75
  "blown_bottle",
  "shakuhachi",
  "whistle",
  "ocarina",
  "lead_1_square", //80
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice", //85
  "lead_7_fifths",
  "lead_8_bass__lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth", //90
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep", //95
  "fx_1_rain",
  "fx_2_soundtrack",
  "fx_3_crystal",
  "fx_4_atmosphere",
  "fx_5_brightness", //100
  "fx_6_goblins",
  "fx_7_echoes",
  "fx_8_scifi",
  "sitar",
  "banjo", //105
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle", //110
  "shanai",
  "tinkle_bell",
  "agogo",
  "steel_drums",
  "woodblock", //115
  "taiko_drum",
  "melodic_tom",
  "synth_drum",
  "reverse_cymbal",
  "guitar_fret_noise", //120
  "breath_noise",
  "seashore",
  "bird_tweet",
  "telephone_ring",
  "helicopter", //125
  "applause",
  "gunshot"
]
// https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/marimba-mp3.js
export class MidiInstrument{
  static buffers=new Map();
  static players=new Map();
  static async load(ac,url){
    if (typeof url === "number"){
      if (url<10) url = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${INSTRUMENTS[url]}-mp3.js`;
      else url = `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${INSTRUMENTS[url]}-mp3.js`;
    }
    let bufferPromise = this.buffers.get(url);
    if (!bufferPromise){
      bufferPromise = audioLoader(ac,url);
      this.buffers.set(url,bufferPromise);
    }
    await bufferPromise;
    return url;
  }
  static async player(ac,url,dest){
    let player = this.players.get(url);
    if (!player){
      if (!this.buffers.has(url)) throw new Error('canot create a player without loading first');
      player = samplePlayer(ac,await this.buffers.get(url),{loop:true});
      player.connect(dest);
      this.players.set(url,player);
    }
    console.log(player);
    return player;
  }
}

const MidiFiles = new Map();
export class MidiPartSource extends PartSource{
  static test(url){
    return /\.mid\?/.test(url)
  }
  static files=new Map();
  static async get(file, instance, cb){
    let songPromise = MidiFiles.get(file);
    if (songPromise){
      // already being downloaded elsewhere, so just put in a nominal received.
      instance.received = instance.bytes;
    } else {
      songPromise = this.load(file, instance, cb);
      MidiFiles.set(file,songPromise);  
      songPromise.then(s=>console.log(s))
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
    // split the URL into parts
    const [file,query] = url.split('?');
    const q = query.split('&')
      .map(s=>s.split('='))
      .reduce((q,a)=>(q[a[0]]=a[1],q),{});
    this.file = file;
    this.trackIndex = +q.track;
    this.stopping = false;
    this.started = false;
    this._loop = Promise.resolve();
  }
  async load(ac,cb){
    this.song = await MidiPartSource.get(this.file, this, cb);
    this.track = this.song.tracks[this.trackIndex];
    this.inst = await MidiInstrument.load(ac,this.track.program);
    // console.log(this.track);
  }
  start(ac, dest, when, from, until){
    if (this.started) return;
    this.stopping=false;
    when+=ac.currentTime;
    this._loop = this.loop(ac,dest,when,from);
  }
  async loop(ac, dest, when, from, until){
    if (!this.instrument)this.instrument = await MidiInstrument.player(ac,this.inst,dest);
    if (!until) until = this.song.duration;
    console.log(until);
    this.started = true;
    const offset = when - from;
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
      const now = ac.currentTime - offset;
      if (now >= until) break;
      if (noteIdx<notes.length){
        while (noteIdx<notes.length && notes[noteIdx].when<now + 0.5) {
          let {pitch, when, duration} = notes[noteIdx];
          if (when<now){
            duration -= now-when;
            when = now;
          }
          play(pitch, when+offset, duration);
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

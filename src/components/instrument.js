import audioLoader from 'audio-loader';
import samplePlayer from 'sample-player';
import WebAudioTinySynth from 'webaudio-tinysynth';

// const INSTRUMENTS = [
//   "acoustic_grand_piano", //0
//   "bright_acoustic_piano",
//   "electric_grand_piano",
//   "honkytonk_piano",
//   "electric_piano_1",
//   "electric_piano_2", //5
//   "harpsichord",
//   "clavinet",
//   "celesta",
//   "glockenspiel",
//   "music_box", //10
//   "vibraphone",
//   "marimba",
//   "xylophone",
//   "tubular_bells",
//   "dulcimer", //15
//   "drawbar_organ",
//   "percussive_organ",
//   "rock_organ",
//   "church_organ",
//   "reed_organ", //20
//   "accordion",
//   "harmonica",
//   "tango_accordion",
//   "acoustic_guitar_nylon",
//   "acoustic_guitar_steel", //25
//   "electric_guitar_jazz",
//   "electric_guitar_clean",
//   "electric_guitar_muted",
//   "overdriven_guitar",
//   "distortion_guitar", //30
//   "guitar_harmonics",
//   "acoustic_bass",
//   "electric_bass_finger",
//   "electric_bass_pick",
//   "fretless_bass", //35
//   "slap_bass_1",
//   "slap_bass_2",
//   "synth_bass_1",
//   "synth_bass_2",
//   "violin", //40
//   "viola",
//   "cello",
//   "contrabass",
//   "tremolo_strings",
//   "pizzicato_strings", //45
//   "orchestral_harp",
//   "timpani",
//   "string_ensemble_1",
//   "string_ensemble_2",
//   "synth_strings_1", //50
//   "synth_strings_2",
//   "choir_aahs",
//   "voice_oohs",
//   "synth_choir",
//   "orchestra_hit", //55
//   "trumpet",
//   "trombone",
//   "tuba",
//   "muted_trumpet",
//   "french_horn", //60
//   "brass_section",
//   "synth_brass_1",
//   "synth_brass_2",
//   "soprano_sax",
//   "alto_sax", //65
//   "tenor_sax",
//   "baritone_sax",
//   "oboe",
//   "english_horn",
//   "bassoon", //70
//   "clarinet",
//   "piccolo",
//   "flute",
//   "recorder",
//   "pan_flute", //75
//   "blown_bottle",
//   "shakuhachi",
//   "whistle",
//   "ocarina",
//   "lead_1_square", //80
//   "lead_2_sawtooth",
//   "lead_3_calliope",
//   "lead_4_chiff",
//   "lead_5_charang",
//   "lead_6_voice", //85
//   "lead_7_fifths",
//   "lead_8_bass__lead",
//   "pad_1_new_age",
//   "pad_2_warm",
//   "pad_3_polysynth", //90
//   "pad_4_choir",
//   "pad_5_bowed",
//   "pad_6_metallic",
//   "pad_7_halo",
//   "pad_8_sweep", //95
//   "fx_1_rain",
//   "fx_2_soundtrack",
//   "fx_3_crystal",
//   "fx_4_atmosphere",
//   "fx_5_brightness", //100
//   "fx_6_goblins",
//   "fx_7_echoes",
//   "fx_8_scifi",
//   "sitar",
//   "banjo", //105
//   "shamisen",
//   "koto",
//   "kalimba",
//   "bagpipe",
//   "fiddle", //110
//   "shanai",
//   "tinkle_bell",
//   "agogo",
//   "steel_drums",
//   "woodblock", //115
//   "taiko_drum",
//   "melodic_tom",
//   "synth_drum",
//   "reverse_cymbal",
//   "guitar_fret_noise", //120
//   "breath_noise",
//   "seashore",
//   "bird_tweet",
//   "telephone_ring",
//   "helicopter", //125
//   "applause",
//   "gunshot"
// ]
// https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/marimba-mp3.js
export class MidiInstrument{
  static buffers=new Map();
  static players=new Map();
  static async load(ac,url){
    if (typeof url === "number"){
      if (url===0) url='./grand_piano.js';
      // else if (url<10) url = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${INSTRUMENTS[url]}-mp3.js`;
      // else url = `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${INSTRUMENTS[url]}-mp3.js`;
    }
    let bufferPromise = this.buffers.get(url);
    if (!bufferPromise){
      if (typeof url === "number"){
        bufferPromise = SynthPlayer.synthLoader(ac,url);
      } else {
        bufferPromise = audioLoader(ac,url);
      }
      this.buffers.set(url,bufferPromise);
    }
    await bufferPromise;
    console.log(url);
    return url;
  }
  static async player(ac,url,dest){
    const b = await this.buffers.get(url)
    if (b === undefined) throw new Error('canot create a player without loading first');
    let player;
    if (typeof b === "number"){
      player = new SynthPlayer(ac, b);
      player.connect(dest);
      player.play = player.start;
    } else {
      player = this.players.get(url);
      if (!player){
        player = samplePlayer(ac, b, {loop:true, gain:4.0});
        player.connect(dest);
        this.players.set(url,player);
      }
    }   

    console.log(url, player);
    return player;
  }
}

/**
 * need an internal syth API which matches that of the player
 * 
 * - if the url is a number keep it as such - and just store a promise to the number
 * - store a promise for forms sake - it is not synchronous
 * 
 * the synth player follows
 */


class SynthPlayer{
  static synthMap = new WeakMap()
  static async synthLoader(_ac, url){
    return url;
  }
  constructor(ac,url){
    this.ac = ac;
    this.prog = url;
  }

  connect(dest){
    this.synth = SynthPlayer.synthMap.get(dest);
    if (!this.synth){
      this.synth = new WebAudioTinySynth();
      this.synth.setAudioContext(this.ac, dest);
      this.synth.setProgram(0,this.prog);
      this.synth.setChVol(0,127);
      SynthPlayer.synthMap.set(dest, this.synth);
    }
    this.dest = dest;
  }
  start(p, w){
    this.synth.noteOn(0,p,127,w)
    //returns a 
    return {stop:(w)=>this.synth.noteOff(0,p,w)}
  }
  stop(){
    //stops ALL sounds
    this.synth.allSoundOff(0);
  }

}

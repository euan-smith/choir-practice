
<script>
import PitchBendNode from './PitchBendNode';

export default {
  props:{
    parts:{
      type:Array,
      default:[]
    },
    title:{
      type:String,
      default:"Unknown"
    },
    bars:{
      type:Array,
      default:[]
    }
  },
  watch:{
    parts(){
      this.load();
    },
    bars(){
      this.parseBars();
    }
  },
  mounted(){
   this.ac = new AudioContext();
   this.load();
   this.parseBars();
  },
  data(){
    return {
      ac:null,
      pitchShift:null,
      loading:false,
      tracks:[],
      currentTime:0,
      playing:false,
      beats:[],
      beatIdx:0,
      mainVol:1,
      tempo:1,
      duration:10
    }
  },
  computed:{
    barInd(){
      const beat = this.beats[this.beatIdx];
      if (!beat) return '000/0';
      let s = ''+beat[1];
      // if (s.length<3) s='000'.slice(s.length)+s;
      if (beat[3]) s+='/'+beat[3];
      return s;
    }
  },
  methods:{
    parseBars(){
      const beats=[];//[timestamp, bar, beat, repeat]
      let time=0, beat=1, bar=1, tempo=100, timeSig=4;
      for (let b of this.bars){
        let repeat = b.repeat || 0;
        if (b.from) {bar=b.from; beat=1}
        if (b.tempo) ({tempo} = b);
        if (b.timeSig) ({timeSig} = b);
        for (let n=0; n<b.beats; n++){
          beats.push([time, bar, beat, repeat]);
          if (++beat > timeSig){
            ++bar;
            beat-=timeSig;
          }
          time+=60/tempo;
        }
      }
      this.beats = beats;
      this.duration = time;
    },
    async load(){
      const {ac} = this;
      this.loading = true;
      const decoded = await Promise.all(
        this.parts.map(
          part=>fetch(part.url)
          .then(r=>r.arrayBuffer())
          .then(b=>ac.decodeAudioData(b))
        )
      );
      this.tracks = decoded.map(buffer=>({
        buffer,
        vol:1,
        solo:false,
        mute:false,
        source:null,
        anal: new AnalyserNode(ac,{fftSize:256}),
        gainNode: new GainNode(ac),
        tempo:1,
        offset:0,
      }));
      // this.pitchShift = new PitchBendNode(this.ac);
      // this.pitchShift.connect(this.ac.destination);
      for (let track of this.tracks){
        // track.anal.connect(track.gainNode).connect(this.pitchShift);
        track.anal.connect(track.gainNode).connect(this.ac.destination);
      }
      this.loading = false;
    },
    setVol(e,i){
      this.tracks[i].vol=e.target.value;
      this.setVols();
    },
    setMute(e,i){
      this.tracks[i].mute=e.target.checked;
      this.setVols();
    },
    setSolo(e,i){
      this.tracks[i].solo=e.target.checked;
      this.setVols();
    },
    setMain(e){
      this.mainVol=e.target.value;
      this.setVols();
    },
    setTime(e){
      if (this.playing) this.pause();
      this.currentTime = e.target.value * this.duration;
      while (this.beats[this.beatIdx][0]>this.currentTime)this.beatIdx--;
      while (this.beats[this.beatIdx+1] && this.beats[this.beatIdx+1][0]<this.currentTime)this.beatIdx++;
      while (this.beats[this.beatIdx][2]>1) this.beatIdx--;
      this.currentTime = this.beats[this.beatIdx][0];
      e.target.value = this.currentTime/this.duration;
    },
    setVols(){
      const {tracks}=this;
      const isSolo = tracks.reduce((s,t)=>s||t.solo,false);
      tracks.forEach(t => {
        t.gainNode.gain.value = isSolo && !t.solo || t.mute ? 0 : t.vol * this.mainVol;
      });
    },
    setTempo(e){
      this.tempo=e.target.value;
      this.tracks.forEach(t=>{
        t.source.playbackRate.value = this.tempo;
        //t.source.detune.value = Math.log2(this.tempo) * -1200;
      });
      // this.pitchShift.transpose = Math.log2(this.tempo) * -12;
    },
    async play(){
      if (this.playing) return
      const {ac,tracks} = this;
      for (let track of tracks){
        track.source = new AudioBufferSourceNode(ac, {
          buffer:track.buffer,
          playbackRate:this.tempo,
        });
        track.source.connect(track.anal);
        track.source.start(0,this.currentTime);
      }
      this.offset = this.currentTime - ac.currentTime
      this.playing=true;
      tracks[0].source.onended=()=>this.playing=false;
      let binCount = null, data = null, ctxs=[];
      while (this.playing){
        this.currentTime = Math.min(ac.currentTime + this.offset, this.duration);
        this.$refs.time.value = this.currentTime / this.duration;
        while (this.beats[this.beatIdx][0]>this.currentTime)this.beatIdx--;
        while (this.beats[this.beatIdx+1] && this.beats[this.beatIdx+1][0]<this.currentTime)this.beatIdx++;
        for (let [i,track] of tracks.entries()){
          if (!data){
            binCount = track.anal.frequencyBinCount;
            data = new Uint8Array(binCount);
          }
          track.anal.getByteTimeDomainData(data);
          const tot = Math.max(...data);
          const lev = Math.max(0,Math.min(100,(tot-127) * 100 / 128));
          if (!ctxs[i]) ctxs[i] = this.$refs.levels[i].getContext('2d')
          const c=ctxs[i];
          c.clearRect(4,0,12,100-lev);
          c.fillStyle="#822";
          c.fillRect(4,100-lev,12,100);
        }
        await new Promise(requestAnimationFrame);
      }

    },
    rewind(){
      if (this.playing) this.pause();
      this.currentTime=0;
      this.beatIdx=0;
    },
    pause(){
      if (!this.playing) return;
      this.playing=false;
      for (let track of this.tracks){
        track.source.disconnect();
        track.source.stop();
        track.source = null;
      }
    }
  }
}

/**
 * Layout
 *                            1     2   3   4     5      6       7     8      9
 * +--100px----+-----------+--50-+-50--+50-+50-+--50-+---125----+25+--100---+-50-+
 * |  PARTS    |  mute o   | Title                                               | 60px 1
 * |           +-----------+-----+-----+-------------+-------------+-------------+
 * |           |  solo o   |Main |Tempo|    BAR                    |     BEAT    | 30px 2
 * |           +-----+-----+     |     |             |             |             |
 * |           |     |     |     |     |             |             |             | 80px 3
 * |           |     |     |     |     |             |             |             |
 * 4           |     |     |     |     |    TIME     |             |             | 30px 4
 * 0           |     |     |     |     |             |             |             | 80px 5
 * 0           |     |     |     |     |             |             |             |
 * p           |     |     |     |     +----+--------+-------------+--------+----+
 * x           |     |     |     |     | |< |                               | >. | 40 6
 * |           |     |     |     |     +----+---+----+----------+--+--------+----+
 * |           |     |     |     |     |        | A bar/rep   c | B              | 40 7
 * |           |     |     |     |     | PLAY   +---------------+----------------+
 * |           |     |     |     |     |        | C             | D              | 40 8
 * +-----------+-----+-----+-----+-----+----+---+----+----------+--+--------+----+
 * 
 * 
 * 
 * 
 */

</script>
<template>
  <div class=mixer>
    <div class=loading v-if=loading>
      <span>LOADING...</span>
    </div>
    <div class=track v-for="(part,i) of parts" :key=i>
      <div class=mute>
        <label>mute
          <input type=checkbox @change="e=>setMute(e,i)">
          <div class=light></div>
        </label>
      </div>
      <div class=solo>
        <label>
          <div>solo</div>
          <input type=checkbox @change="e=>setSolo(e,i)">
          <div class=light></div>
        </label>
      </div>
      <div class=level>
        <canvas class=indicator ref=levels width=16 height=100 />
        <div class=name>
          {{part.name}}
        </div>
      </div>
      <div class=v-ind>{{((tracks[i] && tracks[i].vol || 1)*100).toFixed(0)}} </div>
      <label class=volume>
        <input class=vol type=range min=0 max=1 step=0.01 @input="e=>setVol(e,i)">
      </label>
    </div>
    <div class=controls>
      <div class=title> {{title}} </div>
      <label class=main>
        Main
        <div class=m-ind>{{(mainVol*100).toFixed(0)}}</div>
        <input class=vol type=range min=0 max=1 step=0.001 value=1 @input="setMain">
      </label>
      <label class=tempo style="opacity:0.5">
        Tempo
        <div class=m-ind>{{(tempo*100).toFixed(0)}}</div>
        <input class=vol type=range min=0.5 max=1.5 step=0.001 value=1 @input="setTempo" disabled>
      </label>
      <div class=bar-title>Bar / Repeat</div>
      <div class=bar-background />
      <div class=bar>{{barInd}}</div>
      <div class=beat-title>Beat</div>
      <div class=beat-background />
      <div class=beat v-if=beats[beatIdx]>{{beats[beatIdx][2]}}</div>
      <div class=time-title>Time</div>
      <div class=time-background />
      <div class=time>{{currentTime.toFixed(2)}}</div>
      <div class=play><span v-if=playing @click=pause>&#x23f8;</span><span v-else @click=play>&#x23f5;</span></div>
      <label class=timeline>
        <input class=time ref=time type=range min=0 max=1 step=0.001 value=0 @input=setTime>
      </label>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: Lato;
  src: url(/Lato-Light.ttf);
}
/* .mixer *{
  border: #a00 1px solid;
} */
  .mixer{
    position:relative;
    user-select: none;
    font-family: Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color:white;
    display:flex;
    flex-direction:row;
    width:max-content;
  }
  .mixer>.loading{
    position: absolute;
    background: #333c;
    top:0;
    left:0;
    right:0;
    bottom:0;
    z-index:10;
  }
  @supports ((backdrop-filter: blur(5px)) or (-webkit-backdrop-filter: blur(5px))){
    .mixer>.loading{
      background: #3338;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
  }
  .mixer>.loading>span{
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    margin:auto;
    color:#ddd;
    font-size:60px;
    font-weight:900;
  }

  .mixer>.track{
    display:grid;
    grid-template:40px 40px 30px 250px / 50px 50px;
    width:100px;
    height:360px;
    background:#333;
    border-right: #111 2px solid;
    /* border-left: #555 2px solid; */
  }

  .mixer>.controls{
    display:grid;
    grid-template:60px 30px 90px 30px 90px 60px / 60px 60px 50px 50px 50px 125px 0px 175px 0px;
    width:570px;
    height:360px;
    background:#333;
  }

  .controls>*{
    text-align: center;
    /* border: #a00 1px solid; */
  }
  .controls>.play{
    grid-area: 6/3/7/4;
    font-size:56px;
    cursor: pointer;
    transform:translate(0,-16px)
  }
  .controls>.timeline{
    padding:12px 0;
    grid-area:6/4/7/9;
  }
  .controls>.title{
    grid-area:1/1/2/10;
    font-size:40px;
  }
  .controls>.bar-title{
    grid-area:2/3/3/8;
    font-size: 20px;
  }
  .controls>.bar-background{
    grid-area:3/3/4/8;
    border: #333 10px solid;
    border-radius:20px;
    font-size: 55px;
    background:#222722;
  }
  .controls>.bar{
    display:relative;
    grid-area:3/3/4/8;
    font-size: 55px;
    padding-top:8px;
    color:#afa;
  }
  .controls>.beat-title{
    grid-area:2/8/3/10;
    font-size: 20px;
  }
  .controls>.beat-background{
    grid-area:3/8/6/10;
    border: #333 10px solid;
    border-radius:20px;
    background:#272222;
  }
  .controls>.beat{
    grid-area:3/8/6/10;
    color:#faa;
    font-size: 130px;
    padding-top:24px;
  }
  .controls>.time-title{
    grid-area:4/3/5/8;
    font-size: 20px;
  }
  .controls>.time-background{
    grid-area:5/3/6/8;
    border: #333 10px solid;
    border-radius:20px;
    font-size: 55px;
    background:#222227;
  }
  .controls>.time{
    grid-area:5/3/6/8;
    font-size: 55px;
    padding-top:8px;
    color:#aaf;
  }

  .controls>.main{
    grid-area:2/1/9/2;
    position:relative;
  }
  .controls>.tempo{
    grid-area:2/2/9/3;
    position:relative;
  }
  .main .m-ind, .tempo .m-ind{
    position: absolute;
    width:42px;
    top:25px;
    height:20px;
    left:8px;
    background:#272727;
    border-radius:5px;
  }
  .main input, .tempo input{
    position:absolute;
    top:0;
    left:0;
    display:block;
    width:300px;
    height:24px;
    padding:2px;
    transform-origin: 168px 162px;
    transform:rotate(-90deg);
  }

  .track>.mute{
    grid-area:1/1/2/3;
  }
  .track>.solo{
    grid-area:2/1/3/3;
  }
  .track>.v-ind{
    grid-area:3/1/4/3;
    position:relative;
    margin:auto;
    width:50px;
    text-align: center;
    background:#272727;
    border-radius:5px;
    height:20px;
  }
  .track>.solo,  .track>.mute{
    color:white;
    font-size:20px;
  }
  .track label{
    display:flex;
    flex-direction:row;
    justify-content: space-around;
    align-items: center;
    width:100%;
    height:100%;
  }
  .track input[type=checkbox]{
    display:none;
  }
  .track .light{
    display: inline-block;
    margin-top:4px;
    width:24px;
    height:24px;
    border-radius: 16px;
  }
  .mute .light{
    background:#644;
  }
  .solo .light{
    background:#464;
  }
  .mute input:checked+.light{
    background:radial-gradient(circle, #f66 0%, #e66 30%, #733 80%, #622 100%);
  }
  .solo input:checked+.light{
    background:radial-gradient(circle, #6f6 0%, #6e6 30%, #373 80%, #262 100%);
  }
  .track>.level{
    position:relative;
    grid-area:4/1/5/2;
  }
  .level>.name, .level>.indicator{
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:100%;
  }
  .level>.name{
    writing-mode: vertical-lr;
    transform:rotate(180deg);
    text-align: center;
    font-size:32px;
    padding:4px;
  }
  .track>.volume{
    grid-area:4/2/5/3;
    position:relative;
  }
  input.vol{
    position:absolute;
    top:0;
    left:0;
    display:block;
    width:240px;
    height:24px;
    padding:2px;
    transform-origin: 122px 120px;
    transform:rotate(-90deg);
  }
  .controls input.vol{
    transform-origin: 149.5px 142.5px;
  }



  .list{
    display: flex;
    flex-direction: column;
  }

input.vol{
  background: repeating-linear-gradient(90deg, #333, #333 16px, #555 17px, #333 18px, #333 20.6px);
  height:40px;
  border:none;
  -webkit-appearance: none;
}

input.vol:focus {
  outline: none;
  border:none;
}
input.vol::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: none;
  background: #111;
  border-radius: 0;
  border: none;
}
input.vol:focus::-webkit-slider-runnable-track {
  background: #111;
}
input.vol::-moz-range-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: none;
  background: #111;
  border-radius: 0;
  border: none;
}
input.vol::-ms-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input.vol::-ms-fill-lower {
  background: #111;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
input.vol::-ms-fill-upper {
  background: #111;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
input.vol:focus::-ms-fill-lower {
  background: #111;
}
input.vol:focus::-ms-fill-upper {
  background: #111;
}

input.vol::-webkit-slider-thumb {
  -webkit-appearance: none;
  transform: translate(0,2.5px);
  box-shadow: none;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -11.5px;
}
input.vol::-moz-range-thumb {
  box-shadow: none;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
}
input.vol::-ms-thumb {
  margin-top: 1px;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
}

.main>input.vol::-webkit-slider-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}
.main>input.vol::-moz-range-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}
.main>input.vol::-ms-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}

.tempo>input.vol::-webkit-slider-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}
.tempo>input.vol::-moz-range-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}
.tempo>input.vol::-ms-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}

input.time{
  -webkit-appearance: none;
  width:360px;
  height:32px;
  background:#0000;
}

input.time::-moz-range-thumb{
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}
input.time::-webkit-slider-thumb {
  box-shadow: none;
  transform:translate(0,-10px);
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  -webkit-appearance: none;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}
input.time::-ms-thumb {
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}



input.time::-moz-range-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}

input.time::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}
input.time:focus::-webkit-slider-runnable-track {
  background: #111;
}

input.time::-ms-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}
input.time::-ms-fill-lower {
  background: #111;
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
input.time::-ms-fill-upper {
  background: #111;
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
input.time:focus::-ms-fill-lower {
  background: #111;
}
input.time:focus::-ms-fill-upper {
  background: #111;
}

</style>
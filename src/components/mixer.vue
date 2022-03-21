
<script>
import Volume from "./volume.vue";
export default {
  components:{
    Volume
  },
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
    },
    showNext:{
      type:Boolean,
      default:false
    },
    showPrev:{
      type:Boolean,
      default:false
    },
  },
  watch:{
    parts(){
      this.load();
    },
    bars(){
      this.parseBars();
    },
    newbar(){
      if (this.newbar === null || this.newbar === '') return;
      if (/^([0-9]+\/)?[0-9]*$/.test(this.newbar)){
        this.lastNewbar=this.newbar;
      } else {
        setTimeout(()=>this.newbar = this.lastNewbar);
      }
    }
  },
  mounted(){
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
      duration:10,
      newbar:null,
      lastNewbar:'',
      decoded:[]
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
          beats.push([time, bar, beat, repeat, beats.length]);
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
      this.ac=null;
      const ac = new AudioContext();
      this.loading = true;
      // const start=performance.now();
      this.decoded = await Promise.all(
        this.parts.map(
          part=>fetch(part.url)
          // .then(a=>(console.log(part.name,'fetch',performance.now()-start),a))
          .then(r=>r.arrayBuffer())
          // .then(a=>(console.log(part.name,'ab',performance.now()-start),a))
          .then(b=>ac.decodeAudioData(b))
          // .then(a=>(console.log(part.name,'decoded',performance.now()-start),a))
        )
      );
      if (!this.tracks || this.tracks.length !== this.decoded.length) this.tracks=this.parts.map(p=>({vol:p.volume, solo:false, mute:false}));
      console.log(this.$refs.partvol);
      for(let n=0; n<this.parts.length; n++) this.$refs.partvol[n].setTo(this.tracks[n].vol);
      this.loading = false;
    },
    setupAudio(){
      const ac = this.ac = new AudioContext();
      const {decoded} = this; 
      for(let n = 0; n<decoded.length; ++n){
        const vol = this?.tracks?.[n]?.vol || 1;
        this.tracks[n] = {
        vol,
        solo:false,
        mute:false,
        ...this.tracks[n],
        buffer:decoded[n],
        anal: new AnalyserNode(ac,{fftSize:256}),
        gainNode: new GainNode(ac),
        source:null,
        offset:0,
        }
      }
      for (let track of this.tracks){
        track.anal.connect(track.gainNode).connect(this.ac.destination);
      }
      if (this.beatIdx && this.beatIdx<this.beats.length) this.currentTime = this.beats[this.beatIdx][0];      
      this.setVols();
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
      if (!this.ac) return;
      const {tracks}=this;
      const isSolo = tracks.reduce((s,t)=>s||t.solo,false);
      tracks.forEach(t => {
        t.gainNode.gain.value = isSolo && !t.solo || t.mute ? 0 : Math.pow(t.vol * this.mainVol,1.5);
      });
    },
    async play(){
      if (this.playing) return
      if (!this.ac) this.setupAudio();
      const {ac,tracks} = this;
      for (let track of tracks){
        track.source = new AudioBufferSourceNode(ac, {
          buffer:track.buffer,
        });
        track.source.connect(track.anal);
        track.source.start(0,this.currentTime);
      }
      this.playLoop();
    },
    async playLoop(){
      const {ac,tracks} = this;
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
          const lev = Math.pow(Math.max(0,Math.min(1,(tot-128) / 127)),0.67)*100;
          if (!ctxs[i]) ctxs[i] = this.$refs.levels[i].getContext('2d')
          const c=ctxs[i];
          c.clearRect(4,0,12,100-lev);
          c.fillStyle="#822";
          c.fillRect(4,100-lev,12,100);
        }
        await new Promise(requestAnimationFrame);
      }
    },
    pause(){
      if (!this.playing) return;
      this.playing=false;
      for (let track of this.tracks){
        track.source.disconnect();
        track.source.stop();
        track.source = null;
      }
    },
    next(){
      this.pause();
      this.$emit('next');
    },
    prev(){
      this.pause();
      this.$emit('prev');
    },
    editBar(){
      this.pause();
      this.lastNewbar = this.newbar='';
      setTimeout(()=>{
        this.$refs.newbar.focus();
      },50);
    },
    editBarDone(){
      const bar = this.newbar;
      this.newbar=null;
      if (!bar) return;
      const spec = bar.split('/').map(s=>parseInt(s));
      spec.push(1);
      // first find all bars that meet the bar spec
      const beats = this.beats.filter(b=>b[1]===spec[0]&&b[2]===1)
      if (beats.legnth===0) return;
      const rpt = beats.filter(b=>b[3]===spec[1]);
      this.beatIdx = rpt?.[0]?.[4] || beats?.[0]?.[4] || this.beatIdx;
      this.currentTime = this.beats[this.beatIdx][0];
      this.$refs.time.value = this.currentTime / this.duration;
    },
    editBarQuit(){
      this.newbar=null;
    },
  }
}

/**
 * Layout
 *                            1     2   3   4     5      6       7     8      9
 * +--100px----+-----------+--50-+-50--+50-+50-+--50-+---125----+25+--100---+-50-+
 * |  PARTS    |  mute o   | Title                                               | 60px 1
 * |           +-----------+-----+-----+-------------+-------------+-------------+
 * |           |  solo o   |Main |Metro|    BAR                    |     BEAT    | 30px 2
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
    <div class=tracks>
      <div class=track v-for="(part,i) of parts" :key="i" >
        <div class=mute >
          <label>
            <div class="label">mute</div>
            <input type=checkbox @change="e=>setMute(e,i)">
            <div class=light></div>
          </label>
        </div>
        <div class=solo>
          <label>
            <div class="label">solo</div>
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
        <label class="volume">
          <volume ref="partvol" class=slider min="0" max="1" step="0.01" @input="e=>setVol(e,i)"/>
        </label>
      </div>
    </div>
    <div class=controls>
      <div class=title> {{title}} </div>
      <label class=main>
        <div class=m-title>Main</div>
        <div class=m-ind>{{(mainVol*100).toFixed(0)}}</div>
        <volume class=slider thumb="red" min=0 max=1 step=0.001 value=1 @input="setMain" />
      </label>
      <label class=tempo style="opacity:0.5">
        <div class="m-title"> Tempo </div>
        <div class=m-ind>{{(tempo*100).toFixed(0)}}</div>
        <volume class=slider thumb="blue" min=0.5 max=1.5 step=0.001 value=1  disabled />
      </label>
      <div class=bar-title>Bar / Repeat</div>
      <div class=bar-background />

      <div v-if="newbar===null" class=bar @click="editBar">{{barInd}}</div>
      <template v-else>
        <input type="text" ref="newbar" v-model="newbar" class="bar" @blur="editBarDone" @keyup.enter="editBarDone" @keyup.escape="editBarQuit">
      </template>

      <div class=beat-title>Beat</div>
      <div class=beat-background />
      <div class=beat v-if=beats[beatIdx]>{{beats[beatIdx][2]}}</div>
      <div class=time-title>Time</div>
      <div class=time-background />
      <div class=time>{{currentTime.toFixed(2)}}</div>
      <div class=play><span v-if=playing @click="pause" class="material-icons">pause</span><span v-else @click="play" class="material-icons">play_arrow</span></div>
      <label class=timeline>
        <input class=time ref=time type=range min=0 max=1 step=0.001 value=0 @input="setTime">
      </label>
      <div v-if="showNext" class="next material-icons" @click="next">skip_next</div>
      <div v-if="showPrev" class="prev material-icons" @click="prev">skip_previous</div>
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
    width:fit-content;
    max-width:calc(100vw - 20px);
    /* flex-wrap: wrap-reverse; */
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
  .mixer>.tracks{
    display:flex;
    flex-direction:row;
    width:max-content;
  }

  .tracks>.track{
    flex: 1 1 100px;
    display:grid;
    grid-template:40px 40px 30px 110px 140px / 1fr 1fr;
    width:100px;
    height:360px;
    background:#333;
    border-right: #111 2px solid;
    /* border-left: #555 2px solid; */
  }

  .mixer>.controls{
    display:grid;
    grid-template:60px 30px 90px 30px 90px 60px / 60px 60px 50px 225px 115px 60px;
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
    position:relative;
    cursor: pointer;
  }
  .play>.material-icons{
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    font-size:56px;
  }
  .controls>.next{
    grid-area: 1/6/2/7;
    font-size:56px;
    cursor:pointer;
  }
  .controls>.prev{
    grid-area: 1/1/2/2;
    font-size:56px;
    cursor:pointer;
  }
  .controls>.timeline{
    padding:14px 0;
    grid-area:6/4/7/-1;
  }
  .controls>.title{
    grid-area:1/2/2/-2;
    font-size:40px;
  }
  .controls>.bar-title{
    grid-area:2/3/3/-3;
    font-size: 20px;
  }
  .controls>.bar-background{
    grid-area:3/3/4/-3;
    border: #333 10px solid;
    border-radius:20px;
    font-size: 55px;
    background:#222722;
  }
  .controls>.bar{
    display:relative;
    grid-area:3/3/4/-3;
    font-size: 55px;
    padding-top:8px;
    color:#afa;
  }
  .controls>input.bar{
    font-family: Lato;
    background:#0000;
    border:none;
    padding-top:0px;
    margin-top:-8px;
  }
  input.bar:focus{
    outline:none;
  }
  .controls>.beat-title{
    grid-area:2/-3/3/-1;
    font-size: 20px;
  }
  .controls>.beat-background{
    grid-area:3/-3/6/-1;
    border: #333 10px solid;
    border-radius:20px;
    background:#272222;
  }
  .controls>.beat{
    grid-area:3/-3/6/-1;
    color:#faa;
    font-size: 130px;
    padding-top:24px;
  }
  .controls>.time-title{
    grid-area:4/3/5/-3;
    font-size: 20px;
  }
  .controls>.time-background{
    grid-area:5/3/6/-3;
    border: #333 10px solid;
    border-radius:20px;
    font-size: 55px;
    background:#222227;
  }
  .controls>.time{
    grid-area:5/3/6/-3;
    font-size: 55px;
    padding-top:8px;
    color:#aaf;
  }
  .controls>.tempo{
    grid-area:2/2/9/3;
  }
  .controls>.main{
    grid-area:2/1/9/2;
  }
  .controls>.main, .controls>.tempo{
    position:relative;
    display:flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .main>.m-title, .tempo>.m-title{
    flex: 0 0 1em;
    margin-bottom:0.2em;
  }
  .main>.m-ind, .tempo>.m-ind{
    flex: 0 0 1em;
    width:42px;
    background:#272727;
    border-radius:5px;
    margin: 0.2em 0;
  }
  .main>.slider, .tempo>.slider{
    flex: 1 1 0;
    position:relative;
    max-width:40px;
    width:80%;
    margin: 0.3em 0 0.5em;
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
  
  .track>.solo label, .track>.mute label{
    display:flex;
    flex-direction:row;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap-reverse;
    width:100%;
    height:100%;
    overflow:hidden;
    /* border:red 1px solid; */
  }
  .track .label{
    color:white;
    font-size:20px;
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
    grid-area:4/1/-1/2;
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
    grid-area:4/2/-1/3;
    position:relative;
    padding:4px 2px 9px;
  }
  .volume>.slider{
    width:100%;
    height:100%;
  }

  .list{
    display: flex;
    flex-direction: column;
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
@media (max-width:1400px){
  .tracks>.track{
    width:40px;
    grid-template:30px 30px 0 150px 150px / 1fr 1fr;
  }
  .track .label{
    display:none;
  }
    .track>.v-ind{
      display:none;
  }

    .track>.level{
    position:relative;
    grid-area:5/1/-1/3;
  }
  .level>.name{
    font-size:28px;
  }
  .track>.volume{
    grid-area:3/1/5/3;
  }
}
@media (max-width:1000px){
  .tracks>.track{
    width:40px;
    grid-template:23px 23px 0 140px 140px / 1fr 1fr;
    height:326px;
  }
  .track .light{
    width:20px;
    height:20px;
  }
  .mixer>.controls{
    grid-template:46px 30px 90px 30px 90px 40px / 40px 40px 40px 160px 80px 40px;
    width:400px;
    height:326px;
  }
  .play>.material-icons{
    font-size:48px;
  }
  .controls>.next{
    font-size:48px;
  }
  .controls>.prev{
    font-size:48px;
  }
  .controls>.timeline{
    padding:14px 0;
  }
  .controls>.title{
    font-size:32px;
  }
  .controls>.bar{
    font-size: 48px;
    padding-top:12px;
  }
  .controls>.beat{
    font-size: 110px;
    padding-top:33px;
  }
  .controls>.time{
    font-size: 48px;
    padding-top:12px;
  }
  .main, .tempo{
    font-size:14px;
  }
  .main>.m-ind, .tempo>.m-ind{
    display:none;
  }
  .main>.slider, .tempo>.slider{
    max-width:34px;
    width:80%;
    margin: 0.3em 0 0.5em;
    height:100%;
    top:0;
  }
  input.time{
  width:240px;
  height:24px;
  background:#0000;
  margin-top:-6px;
}

}

</style>

<script>
import Volume from "./volume.vue";
import stick4cs from "../assets/stick-4cs.mp3";
import stick4d from "../assets/stick-4d.mp3";
import {PartSource} from "./part";
const tickLeadTime = 0.053;
function barText(beat){
  if (!beat) return '000/0';
      let s = ''+beat.bar;
      // if (s.length<3) s='000'.slice(s.length)+s;
      if (beat.repeat) s+='/'+beat.repeat;
      return s;
}
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
      if (!this.canSetSpeed) this.speed=1;
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
   window.addEventListener('resize',this.resize);
  },
  unmounted(){
    window.removeEventListener('resize',this.resize);
  },
  data(){
    return {
      ac:null,
      pitchShift:null,
      loading:false,
      loaded:{data:0, decoded:0},
      tracks:[],
      currentTime:0,
      playing:false,
      firstBeat:null,
      startBeat:null,
      beat:null,
      beats:[],
      mainVol:1,
      speed:1,
      duration:10,
      newbar:null,
      newspeed:null,
      lastNewbar:'',
      decoded:[],
      duraction:0,
      sticks:[],
      metronome:{vol:1, on:false},
      playProm:null,
      recorder:null,
    }
  },
  computed:{
    barInd(){
      return barText(this.beat?.sourceBeat || this.beat);
    },
    displayTime(){
      // return typeof this?.beat?.dTime === 'number' ? this.beat.dTime : this.currentTime;
      return this.beat?.sourceBeat ? this.beat.sourceBeat.time : this.currentTime;
    },
    canSetSpeed(){
      if (!this.parts || !this.parts.length) return false
      for(let part of this.parts)
        if (!PartSource.canSetSpeed(part.url))
          return false;
      return true;
    }
  },
  methods:{
    parseBars(){
      const lastBeat = this.beat;
      const preBeat={};
      let cBeat=preBeat;
      let time=0, beat=1, bar=1, tempo=100, timeSig=4;
      for (let b of this.bars){
        let repeat = b.repeat || 0;
        if (b.from) {bar=b.from; beat=1}
        if (b.tempo) ({tempo} = b);
        if (b.timeSig) ({timeSig} = b);
        for (let n=0; n<b.beats; n++){
          cBeat = (cBeat.next = {time, bar, beat, repeat, timeSig, tempo, prev:cBeat});
          if (++beat > timeSig){
            ++bar;
            beat-=timeSig;
          }
          time+=60/tempo;
        }
      }
      this.firstBeat = preBeat.next;
      this.firstBeat.prev = null;
      this.beat = this.firstBeat;
      this.duration = time;
      if (lastBeat) this.seekBar([lastBeat.bar, lastBeat.repeat || 1]);
    },
    async load(){
      this.loaded = {data:0, decoded:0};
      this.ac=null;
      const ac = new AudioContext();
      this.loading = true;
      this.partSources = this.parts.map(p=>PartSource.fromUrl(p.url));
      // console.log('sources')
      await Promise.all(this.partSources.map(d=>d.load(ac,part=>{
        let tot=0, dl=0;
        for(let p of this.partSources){tot+=p.bytes; dl+=p.received};
        this.loaded.data = dl/tot;
      }).then(()=>this.loaded.decoded += 1/this.partSources.length)))
      // console.log('getting sticks')
      this.sticks = await Promise.all(
        [stick4cs,stick4d].map(
          file=>fetch(file)
          .then(r=>r.arrayBuffer())
          .then(b=>ac.decodeAudioData(b))
        )
      )
      // console.log('got sticks')
      if (!this.tracks || this.tracks.length !== this.partSources.length) this.tracks=this.parts.map(p=>({vol:p.volume, solo:false, mute:false}));
      for(let n=0; n<this.parts.length; n++) this.$refs.partvol[n].setTo(this.tracks[n].vol);
      this.loading = false;
    },
    setupAudio(){
      const ac = this.ac = new AudioContext();
      const {partSources,sticks} = this; 
      for(let n = 0; n<partSources.length; ++n){
        const vol = this?.tracks?.[n]?.vol || 1;
        this.tracks[n] = {
          vol,
          solo:false,
          mute:false,
          ...this.tracks[n],
          partSource:partSources[n],
          anal: new AnalyserNode(ac,{fftSize:256}),
          gainNode: new GainNode(ac),
          offset:0,
        }
      }
      this.metronome = {
        active: true,
        intro: false,
        vol:0.0,
        ...this.metronome,
        sticks,
        gainNode: new GainNode(ac),
        source: null,
      }
      for (let track of this.tracks){
        track.anal.connect(track.gainNode);
      }
      this.setOutput(this.ac.destination);
      if (this.beat) this.currentTime = this.beat.time;      
      this.setVols();
    },
    setOutput(dest){
      for (let track of this.tracks){
        track.gainNode.connect(dest);
      }
      this.metronome.gainNode.connect(dest);
    },
    unsetOutput(dest){
      for (let track of this.tracks){
        track.gainNode.disconnect(dest);
      }
      this.metronome.gainNode.disconnect(dest);
    },
    initRecorder(){
      const chunks = [];
      this.streamDest = this.ac.createMediaStreamDestination();
      this.setOutput(this.streamDest);
      this.recorder = new MediaRecorder(this.streamDest.stream);
      this.recorder.ondataavailable = e => chunks.push(e.data);
      this.recorder.onstop = e=>{
        const blob = new Blob(chunks, {type:"audio/ogg; codecs=opus"});
        const {dl} = this.$refs;
        dl.href = URL.createObjectURL(blob);
        dl.click();
      }
      this.recorder.start();
    },
    recorderDone(){
      this.unsetOutput(this.streamDest);
      this.recorder.stop();
      this.streamDest = null;
      this.recorder = null;
    },
    setMetVol(e){
      this.metronome.vol = e.target.value;
      this.setVols();
    },
    toggleMetOn(){
      this.metronome.on = !this.metronome.on;
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
      while (this.beat.time>this.currentTime) this.beat=this.beat.prev;
      while (this.beat.next && this.beat.next.time<this.currentTime)this.beat=this.beat.next;
      while (this.beat.beat>1) this.beat=this.beat.prev;
      this.currentTime = this.beat.time;
      e.target.value = this.currentTime/this.duration;
    },
    setVols(){
      if (!this.ac) return;
      const {tracks, metronome}=this;
      const isSolo = tracks.reduce((s,t)=>s||t.solo,false);
      tracks.forEach(t => {
        t.gainNode.gain.value = isSolo && !t.solo || t.mute ? 0 : Math.pow(t.vol * this.mainVol,1.5);
      });
      metronome.gainNode.gain.value = metronome.on || this.beat?.tickOn ? metronome.vol : 0;
    },
    play(rec){
      //if (rec) {console.log('record!'); return}
      if (this.playing) return
      if (!this.ac) this.setupAudio();
      if (rec) this.initRecorder();
      const {ac,tracks} = this;
      for (let track of tracks){
        track.partSource.start(ac,track.anal,0,this.currentTime,this.duration,this.speed);
      }
      const time = this.beat.time-this.currentTime;
      if (time/this.speed>=-tickLeadTime){
          const tickIdx = this.beat.bar === 1 ? 1 : 0;
          const {metronome} = this;
          metronome.source = new AudioBufferSourceNode(ac, {buffer:this.sticks[tickIdx]});
          metronome.source.connect(metronome.gainNode);
          metronome.source.start(ac.currentTime+time/this.speed+tickLeadTime,0);
      }
      this.playProm = this.playLoop(this.speed);
    },
    async prePlay(rec){
      if (rec) {console.log('record!'); return}
      if (this.playing) return
      if (!this.ac) this.setupAudio();
      // move back to the start of the current bar
      while(this.beat.beat>1 && this.beat.prev) this.beat = this.beat.prev;
      // how many beats pre the current bar
      const beatCount = this.beat.timeSig;
      // time per beat
      const period = 60/this.beat.tempo;
      let beat = this.beat;
      for (let n=beatCount; n>=1;){
        beat = {time:beat.time-period, tickOn:true, next:beat, beat:n--, sourceBeat: this.beat, timeSig:this.beat.timeSig}
      }
      const start = this.currentTime - beat.time;
      this.beat = beat;
      this.setVols();
      const {ac,tracks} = this;
      for (let track of tracks){
        track.partSource.start(ac,track.anal,start/this.speed,this.currentTime, null, this.speed);
      }
      this.currentTime-=start;
      const time = this.beat.time-this.currentTime;
      if (time/this.speed>=-tickLeadTime){
          const tickIdx = this.beat.bar > 1 ? 0 : 1;
          const {metronome} = this;
          metronome.source = new AudioBufferSourceNode(ac, {buffer:this.sticks[tickIdx]});
          metronome.source.connect(metronome.gainNode);
          metronome.source.start(ac.currentTime+time/this.speed+tickLeadTime,0);
      }
      this.playProm = this.playLoop(this.speed);
    },
    async playLoop(speed){
      const {ac,tracks,metronome} = this;
      this.offset = this.currentTime - ac.currentTime*speed
      this.playing=true;
      tracks[0].partSource.onended=()=>this.playing=false;
      let binCount = null, data = null, ctxs=[];
      while (this.playing){
        this.currentTime = Math.min(ac.currentTime*speed + this.offset, this.duration);
        this.$refs.time.value = this.displayTime / this.duration;
        const oldBeat = this.beat;
        if (this.beat.time>this.currentTime+0.0001) this.beat = this.firstBeat;
        while (this.beat.next && this.beat.next.time<this.currentTime) {
          this.beat = this.beat.next;
          this.setVols();
        }
        if (oldBeat !== this.beat){
          if (metronome.source){
          metronome.source.disconnect();
          metronome.source.stop();
          }
          const time = this.beat.time-this.currentTime;
          const tickIdx = this.beat.beat > 1 ? 0 : 1;
          metronome.source = new AudioBufferSourceNode(ac, {buffer:this.sticks[tickIdx]});
          metronome.source.connect(metronome.gainNode);
          metronome.source.start(ac.currentTime+time/speed+tickLeadTime,0);
        }
        for (let [i,track] of tracks.entries()){
          if (!data){
            binCount = track.anal.frequencyBinCount;
            data = new Uint8Array(binCount);
          }
          track.anal.getByteTimeDomainData(data);
          const tot = Math.max(...data);
          const lev = Math.pow(Math.max(0,Math.min(1,(tot-128) / 127)),0.67)*100;
          if (!ctxs[i]) ctxs[i] = this.$refs.levels[i].getContext('2d')
          else {
            const c=ctxs[i];
            c.clearRect(0,0,100,100);
            c.fillStyle="#822";
            if (c.canvas.clientWidth>c.canvas.clientHeight){
              c.fillRect(0,25,lev,75);
            } else {
              c.fillRect(25,100-lev,75,100);
            }
          }
        }
        await new Promise(requestAnimationFrame);
      }
    },
    async pause(){
      if (!this.playing) return;
      if (this.recorder) this.recorderDone();
      this.playing=false;
      await this.playProm;
      const {tracks, metronome, beat} = this;
      for (let track of tracks){
        track.partSource.stop();
      }
      metronome.source.disconnect();
      metronome.source.stop();
      metronome.source=null;
      this.currentTime = this.displayTime;
      if (beat.sourceBeat) {
        this.beat = beat.sourceBeat;
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
    reset(){
      console.log(this.$refs.mutes);
      for(let n=0; n<this.parts.length; n++) {
        this.$refs.solos[n].checked=this.tracks[n].solo=false;
        this.$refs.mutes[n].checked=this.tracks[n].mute=false;
        this.tracks[n].vol = this.parts[n].volume;
        this.$refs.partvol[n].setTo(this.tracks[n].vol);
        this.setVols();
      }
    },
    backToStart(){
      this.pause();
      console.log(this.startBeat, this.firstBeat);
      this.gotoBar(this.startBeat || this.firstBeat);
    },
    resize(){
      for(let n=0; n<this.parts.length; n++) this.$refs.partvol[n].setTo(this.tracks[n].vol);
    },
    editSpeed(){
      if (!this.canSetSpeed) return;
      this.pause();
      this.lastNewspeed = this.newspeed='';
      setTimeout(()=>{
        this.$refs.newspeed.focus();
      },50);
    },
    editSpeedDone(){
      if (this.newspeed) {
        const ns = +this.newspeed;
        if (ns>20 && ns<500) this.speed = ns/100;
      }
      this.newspeed=null;
    },
    editSpeedQuit(){
      this.newspeed=null;
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
      this.seekBar(spec);
      this.startBeat = this.beat;
    },
    seekBar(spec){
      this.gotoBar(this.findBeat(spec) || this.beat);
    },
    gotoBar(beat){
      this.beat = beat;
      this.currentTime = this.beat.time;
      this.$refs.time.value = this.currentTime / this.duration;
    },
    findBeat(spec){
      const beats = [];
      for (let b = this.firstBeat; b.next; b=b.next) if (b.bar === spec[0] && b.beat === 1) beats.push(b);

      if (beats.legnth===0) return;
      const rpt = beats.filter(b => b.repeat === spec[1]);
      return rpt?.[0] || beats?.[0];
    },
    editBarQuit(){
      this.newbar=null;
    },
  }
}

/**
 * Layout - full scale
 * 
 * v---------------------------------.mixer-(flex row)---------------------------v
 * v--.track(s)v------------------.controls-(grid)-------------------------------v
 * 
 * 
 * 
 *                    1     2     3  4    5                6           7    8 
 *        +--50-+--50-+--60-+-60--+30+50--+--------195-----+-----115---+-60-+ 1 -7
 *    40  |  mute o   | Title                                               | 60px
 *        +-----------+-----+-----+--+----+----------------+----------------+ 2 -6
 *    40  |  solo o   |Main |Tick |    BAR title           |   BEAT title   | 30px 
 *        +-----------+     |     |--+----+----------------+----------------+ 3 -5
 *    30  |   vol     |     |     |    BAR                 |     BEAT       | 90px 
 *        +-----------|     |     |                        |                |
 *        |     |     |     |     |--+----+----------------+----------------+ 4 -4
 *   110  |     |     |     |     |    TIME title          |   SPEED title  | 30px
 *        |  N  | L   |     |     |--+----+----------------+----------------+ 5 -3
 *        |  A  | E   |     |     |    TIME                |   SPEED        | 90px
 *        +  M  | V   |     |     |                        |                | 
 *        |  E  | E   |     |     +--+----+----------------+----------------+
 *   140  |     | L   |     |     |  |    |                                 | 30px 6 -2
 *        |     |     |     |     |--+    +                                 +
 *        |     |     |     |     |  |    |                                 | 30px 7 -1
 *        +-----+-----+-----+-----+--+----+----------------+----------------+
 * 
 * 
 * 
 * @media (max-width:1400px)
 * 
 *                    1     2     3  4    5                6           7    8 
 *        +20-+20-+--60-+-60--+30+50--+--------195-----+-----115---+-60-+ 1 -7
 *    30  |   o   | Title                                               | 60px
 *        +-------+-----+-----+--+----+----------------+----------------+ 2 -6
 *    30  |   o   |Main |Tick |    BAR title           |   BEAT title   | 30px 
 *        +-------+     |     |--+----+----------------+----------------+ 3 -5
 *     0  +-------+     |     |    BAR                 |     BEAT       | 90px 
 *        |   L   |     |     |                        |                |
 *        |   E   |     |     |--+----+----------------+----------------+ 4 -4
 *   150  |   V   |     |     |    TIME title          |   SPEED title  | 30px
 *        |   E   |     |     |--+----+----------------+----------------+ 5 -3
 *        |   L   |     |     |    TIME                |   SPEED        | 90px
 *        +-------+     |     |                        |                | 
 *        |   N   |     |     +--+----+----------------+----------------+
 *   150  |   A   |     |     |  |    |                                 | 30px 6 -2
 *        |   M   |     |     |--+    +                                 +
 *        |   E   |     |     |  |    |                                 | 30px 7 -1
 *        +---+---+-----+-----+--+----+----------------+----------------+
 * 
 * 
 * 

 * 
 * 
 */

</script>
<template>
  <div class=mixer>
    <div class=loading v-if=loading>
      <span>LOADING... {{((loaded.data + loaded.decoded)*50).toFixed(0)}} %</span>
    </div>
    <div class=tracks>
      <div class=track v-for="(part,i) of parts" :key="i" >
        <div class=mute >
          <label>
            <div class="label">mute</div>
            <input ref=mutes type=checkbox @change="e=>setMute(e,i)">
            <div class=light></div>
          </label>
        </div>
        <div class=solo>
          <label>
            <div class="label">solo</div>
            <input ref=solos type=checkbox @change="e=>setSolo(e,i)">
            <div class=light></div>
          </label>
        </div>
        <div class=level>
          <canvas class=indicator ref=levels width=100 height=100 />
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
      <label class=met-vol>
        <div class="m-title"> Tick </div>
        <div class=m-ind>{{(metronome.vol*100).toFixed(0)}}</div>
        <volume class=slider thumb="blue" min=0 max=1 step=0.001 value=1 @input="setMetVol" disabled />
      </label>
      <div class=bar-title>Bar / Repeat</div>
      <div class=bar-background />

      <div v-if="newbar===null" class=bar @click="editBar">{{barInd}}</div>
      <template v-else>
        <input type="text" ref="newbar" v-model="newbar" class="bar" @blur="editBarDone" @keyup.enter="editBarDone" @keyup.escape="editBarQuit">
      </template>
      
      <div class=beat-title>Beat</div>
      <div class=beat-background />
      <div class=beat v-if=beat><div class="bt" :class="{on:beat.beat>=ind}" v-for="ind of beat.timeSig" :key="ind"/></div>
      <div class=time-title>Time</div>
      <div class=time-background />
      <div class=time>{{displayTime.toFixed(2)}}</div>
      <div class=speed-title>Speed</div>
      <div class=speed-background />
      <div v-if="newspeed===null" class=speed @click="editSpeed">{{(speed*100).toFixed(0)}}</div>
      <template v-else>
        <input type="number" ref="newspeed" v-model="newspeed" class=speed @blur="editSpeedDone" @keyup.enter="editSpeedDone" @keyup.escape="editSpeedQuit">
      </template>
      <div class=play><svg class="icon" viewBox="0 0 48 48" @click.exact="playing?pause():play()" @click.ctrl="playing?pause():play(true)"><path :d="playing?'M27.4 35.4V12.6h8v22.8Zm-14.8 0V12.6h8.05v22.8Z':'M16 37.85v-28l22 14Z'"/></svg></div>
      <a download ref=dl :v-show="false"></a>
      <svg class=pre-play viewBox="-2 -2 28 28" @click.exact="prePlay()" @click.ctrl="prePlay(true)">
      <path :fill="playing?'#555':'#eee'" d="m 8.9838564,1.5166215 v 2 h 5.9999996 v -2 z m 2.9999996,3 c -4.9699996,0 -8.9999996,4.0299999 -8.9999996,8.9999995 0,4.97 4.02,9 8.9999996,9 4.98,0 9,-4.03 9,-9 0,-2.12 -0.740703,-4.0693745 -1.970703,-5.6093745 l 1.419922,-1.421875 c -0.43,-0.51 -0.900156,-0.9882031 -1.410156,-1.4082031 l -1.419922,1.4199219 c -1.55,-1.24 -3.499141,-1.9804688 -5.619141,-1.9804688 z m -1.789062,4.7480469 6,4.4999996 -6,4.5 z" />
      </svg>
      <svg class=met viewBox="-128 -128 768 768" @click="toggleMetOn">
        <path :fill="metronome?.on ? '#eee' : '#555'" d="m 463.84136,154.89339 c -6.42,-6.42 -16.83,-6.42 -23.251,0 -71.31197,70.35135 -136.61146,132.25426 -208.741,199.7 h -105.82 c 23.35495,-140.1063 67.13099,-217.59716 120.727,-318.357996 0.86,-0.803 2.209,-0.801 3.067,-10e-4 20.50653,37.383983 48.51152,88.812606 72.26194,147.190756 1.186,9.002 12.2214,17.4338 23.3242,11.71391 9.002,-1.186 11.1594,-12.2324 9.9724,-21.2344 -21.69905,-53.89113 -30.43965,-85.078342 -83.11454,-161.702266 -13.446,-12.55299965 -34.508,-12.55699965 -47.954,10e-4 C 126.80877,149.30021 96.099465,324.74626 77.091365,474.25139 c -2.829,21.473 13.907,40.535 35.543995,40.535 h 271.311 c 21.661,0 38.373,-19.087 35.544,-40.535 -8.26237,-52.34207 -14.88466,-100.7074 -24.7871,-157.02622 -6.40949,-11.78839 -8.3911,-14.9907 -17.4031,-13.8037 -9.002,1.186 -13.59751,8.0528 -12.41051,17.0548 l 5.66371,34.11712 h -83.159 c 64.35441,-63.86663 129.29308,-130.29894 176.448,-176.449 6.42,-6.42 6.42,-16.83 -10e-4,-23.251 z m -88.956,232.582 12.004,91.074 c 0.112,0.846 -0.148,1.701 -0.708,2.341 -0.566,0.645 -1.38,1.014 -2.235,1.014 h -271.311 c -0.855,0 -1.668,-0.369 -2.231,-1.011 -0.564,-0.643 -0.824,-1.499 -0.712,-2.347 l 12.003,-91.072 h 253.19 z" />
      </svg>
      <svg class=reset @click=reset fill="#eee" viewBox="0 0 48 48"><path d="M26 18.5v-3h6.5V6h3v9.5H42v3ZM32.5 42V21.5h3V42Zm-20 0v-9H6v-3h16v3h-6.5v9Zm0-15V6h3v21Z"/></svg>
      <svg class=back @click=backToStart fill="#eee" viewBox="0 0 48 48"><path d="M11 36V12h3v24Zm26 0L19.7 24 37 12Z"/></svg>
      <label class=timeline>
        <input class=time ref=time type=range min=0 max=1 step=0.001 value=0 @input="setTime">
      </label>
      <svg v-if="showNext" class="next icon" viewBox="0 0 48 48" @click="next"><path d="M34 36V12h3v24Zm-23 0V12l17.3 12Z"/></svg>
      <svg v-if="showPrev" class="prev icon" viewBox="0 0 48 48" @click="prev"><path d="M11 36V12h3v24Zm26 0L19.7 24 37 12Z"/></svg>
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
input[type='number'] {
    -moz-appearance:textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
}

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
    grid-template:60px 30px 90px 30px 90px 30px 30px / 60px 60px 30px 30px 50px 165px 115px 60px;
    width:570px;
    height:360px;
    background:#333;
  }

  .controls>*{
    text-align: center;
    /* border: #a00 1px solid; */
  }
  .controls>.play{
    grid-area: 6/5/-1/6;
    position:relative;
    cursor: pointer;
  }
  .controls>.pre-play{
    grid-area: -3/4/-2/5;
    cursor: pointer;
  }
  .controls>.met{
    grid-area: -3/3/-2/4;
    cursor: pointer;
  }
  .controls>.reset{
    grid-area: -2/3/-1/4;
    cursor: pointer;
  }
  .controls>.back{
    grid-area:-2/4/-1/5;
    cursor: pointer;
  }
  .icon{
    width:56px;
    height:56px;
    fill:white;
  }
  .play>.icon{
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
  }
  .controls>.next{
    grid-area: 1/-2/2/-1;
    cursor:pointer;
  }
  .controls>.prev{
    grid-area: 1/1/2/2;
    cursor:pointer;
  }
  .controls>.timeline{
    padding:14px 0;
    grid-area:6/6/7/-1;
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
    grid-area:3/-3/4/-1;
    border: #333 10px solid;
    border-radius:20px;
    background:#272222;
  }
  .controls>.beat{
    grid-area:3/-3/4/-1;
    color:#faa;
    font-size: 55px;
    padding:20px 15px;
    display:flex;
    flex-direction: row;
  }
  .beat>.bt{
    background:#322;
    flex:1 1 0px;
    height: calc(100% - 10px);
    margin: 5px;
  }
  .bt.on{
    background:radial-gradient(circle, #a44 0%, #933 60%, #733 90%, #622 100%);
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
  .controls>.speed-title{
    grid-area:4/-3/5/-1;
    font-size: 20px;
  }
  .controls>.speed-background{
    grid-area:5/-3/6/-1;
    border: #333 10px solid;
    border-radius:20px;
    font-size: 55px;
    background:#272722;
  }
  .controls>.speed{
    position:relative;
    grid-area:5/-3/6/-1;
    font-size: 55px;
    padding-top:8px;
    color:#ffa;
  }
  .controls>input.speed{
    font-family: Lato;
    background:#0000;
    border:none;
    padding-top:0px;
    margin-top:-8px;
  }
  input.speed:focus{
    outline:none;
  }
  .controls>.met-vol{
    grid-area:2/2/9/3;
  }
  .controls>.main{
    grid-area:2/1/9/2;
  }
  .controls>.main, .controls>.met-vol{
    position:relative;
    display:flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .main>.m-title, .met-vol>.m-title{
    flex: 0 0 1em;
    margin-bottom:0.2em;
  }
  .main>.m-ind, .met-vol>.m-ind{
    flex: 0 0 1em;
    width:42px;
    background:#272727;
    border-radius:5px;
    margin: 0.2em 0;
  }
  .main>.slider, .met-vol>.slider{
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
  width:330px;
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
    grid-template:46px 30px 90px 30px 90px 20px 20px / 40px 40px 20px 20px 40px 120px 80px 40px;
    width:400px;
    height:326px;
  }
  .icon{
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
    padding:15px;
  }
  .controls>.time{
    font-size: 48px;
    padding-top:12px;
  }
  .controls>.next, .controls>.prev{
    width:44px;
    height:44px;
  }
  .main, .met-vol{
    font-size:14px;
  }
  .main>.m-ind, .met-vol>.m-ind{
    display:none;
  }
  .main>.slider, .met-vol>.slider{
    max-width:34px;
    width:80%;
    margin: 0.3em 0 0.5em;
    height:100%;
    top:0;
  }
  input.time{
  width:220px;
  height:24px;
  margin-top:-6px;
  }
}
@media (max-width:640px), (max-height:360px){
  .mixer{
    flex-direction: column-reverse;
  }
    .mixer>.controls{
    grid-template: 46px 24px 60px 24px 60px 40px 40px 30px 30px / 30px 30px 60px 3fr 2fr 40px;
    width:calc(100vw - 40px);
    height:354px;
  }
  .controls>.title{
    grid-area:1/2/2/-2;
  }
    .controls>.next{
    grid-area:1/-2/2/-1;
    width:44px;
    height:44px;
  }
  .controls>.prev{
    grid-area:1/1/2/2;
    width:44px;
    height:44px;
  }
  .controls>.bar-title{
    grid-area:2/1/3/-3;
  }
  .controls>.bar-background, .controls>.bar{
    padding:6px 0 0;
    grid-area:3/1/4/-3;
    font-size: 36px;
  }
  .controls>input.bar, .controls>input.speed{
    padding:3px 0 0;
    width:100%;
  }
  .controls>.beat-title{
    grid-area:2/-3/3/-1;
  }
  .controls>.beat-background{
    padding:0;
    grid-area: 3/-3/4/-1;
  }
  .controls>.beat{
    padding:15px;
    grid-area: 3/-3/4/-1;
  }
  .controls>.time-title{
    grid-area: 4/1/5/-3;
  }
  .controls>.time-background, .controls>.time{
    padding:6px 0 0;
    font-size:36px;
    grid-area: 5/1/6/-3;
  }
  .controls>.speed{
    font-size:36px;
  }
  .controls>.main{
    grid-area: 6/1/7/-1;
  }
  .controls>.met-vol{
    grid-area: 7/1/8/-1;
  }
  .controls>.play{
    grid-area: 8/3/-1/4;
  }
  .controls>.pre-play{
    grid-area: 8/2/9/3;
  }
  .controls>.met{
    grid-area: 8/1/9/2;
  }
  .controls>.reset{
    grid-area: 9/1/10/2;
  }
  .controls>.back{
    grid-area:9/2/10/3;
  }
  .controls>.main, .controls>.met-vol{
    flex-direction: row;
  }
  .main>.m-title, .met-vol>.m-title{
    flex: 0 0 50px;
  }
  .main>.m-ind, .met-vol>.m-ind{
    display:none;
  }
  .main>.slider, .met-vol>.slider{
    flex: 1 1 0;
    position:relative;
    max-height:40px;
    height:80%;
    margin: 0 10px;
    max-width:none;
    width:auto;
  }
  .controls>.timeline{
    grid-area:8/4/-1/-1;
  }
  input.time{
  width:90%;
  height:24px;
  margin-top:4px;
  }

  .mixer>.tracks{
    flex-direction: column;
  }
  .tracks>.track{
    flex: 1 1 50px;
    height:40px;
    grid-template:40px/1fr 1fr 23px 23px ;
    width: calc(100vw - 40px);
    border:none;
    border-top:1.5px solid black;
  }

  .track .label{
    display:none;
  }
    .track>.v-ind{
      display:none;
  }

  .track>.level{
    grid-area:1/1/2/2;
  }
  .level>.name{
    font-size:28px;
    grid-area:1/1/2/2;
  }
  .track>.volume{
    grid-area:1/2/2/3;
  }
  .track>.solo{
    grid-area:1/-3/2/-2;
  }
  .track>.mute{
    grid-area:1/-2/2/-1;
  }
  .level>.name, .level>.indicator{
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:100%;
  }
  .level>.name{
    writing-mode:inherit;
    transform:none;
    text-align: center;
    font-size:32px;
    padding:4px;
  }
  .track>.volume{
    grid-area:1/2/-1/3;
    position:relative;
    padding:0;
  }

}

</style>
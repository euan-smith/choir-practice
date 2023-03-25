<script>
  import { MidiInstrument } from './instrument';
  function isWhite(pitch){
    const keys='wbwbwwbwbwbw';
    return keys[(pitch+120)%12]==='w';
  }

  function addKeys(pitch, keys){
    if (keys>0){
      for(let k=0;k<keys;k++){
        while(!isWhite(++pitch)) /* intentionally empty */ ;
      }
    } else {
      for(let k=0;k<-keys;k++){
        while(!isWhite(--pitch)) /* intentionally empty */ ;
      }
    }
    return pitch
  }

  export default {
    props:{
    },
    data(){
      return{
        rows: [59, 43],
        keys: 13,
        ac: null,
        inst: null,
        player: null,
        ready: false,
        sounds: {},
        size: 60,
        centreKey: 60,
        isDown: false,
      }
    },
    async mounted(){
      this.resize();
      this.ac = new AudioContext();
      this.inst = await MidiInstrument.load(this.ac,0);
      this.player = await MidiInstrument.player(this.ac,this.inst,this.ac.destination);
      this.ready=true;
      window.addEventListener('resize',this.resize);
    },
    unmounted() {
      window.removeEventListener('resize',this.resize);
    },
    computed:{
      keyMap(){
        const rtn = [];
        for(let row of this.rows){
          const black = [], white = [];
          black.push(isWhite(row-1)?null:row-1);
          for(let k=0, p=row; k<this.keys; k++){
            white.push(p++);
            if(isWhite(p)) black.push(null);
            else black.push(p++);
          }
          rtn.push([black,white]);
        }
        return rtn;
      }
    },
    methods:{
      resize(){
        const {clientWidth, clientHeight} = this.$refs.keyboard;
        this.keys = Math.floor(clientWidth/this.size);
        const rows = Math.max(Math.floor(clientHeight/this.size/4+0.5),1);
        this.rows = [];
        let key = addKeys(this.centreKey, Math.floor((this.keys-1)*(rows-2)/2));
        for (let r=rows-1; r>-rows; r-=2){
          this.rows.push(key);
          key = addKeys(key, 1-this.keys)
        }
        // console.log([...this.rows], this.keys, rows);
      },
      scale(d){
        this.size+=d*5;
        this.resize();
      },
      down(pitch){
        this.isDown=true;
        this.sound(pitch);
      },
      enter(pitch){

      },
      leave(pitch){
        if (this.isDown){
          this.stop(pitch);
        }
      },
      up(pitch){
        if (this.isDown){
          this.stop(pitch);
          this.isDown=false;
        }
      },
      sound(pitch){
        if (pitch && this.ready){
          if (this.sounds[pitch]) return;
          this.sounds[pitch] = [this.player.play(pitch,0),setTimeout(()=>this.stop(pitch),1900)];
        }
      },
      stop(pitch){
        if(this.sounds[pitch]){
          this.sounds[pitch][0].stop(this.ac.currentTime+0.1);
          clearTimeout(this.sounds[pitch][1]);
          delete this.sounds[pitch];
        }
      }
    }
  }
</script>
<template>
  <div class=keyboard ref="keyboard">
    <div class=toolbar>
      <div class=scale @click="scale(+1)"> + </div>
      <div class=close @click="$emit('close')">close</div>
      <div class=scale @click="scale(-1)"> - </div>
    </div>
    <div v-for="board of keyMap" class=board>
      <div class="blacks">
        <div class="key start" 
          :class="{hide:!board[0][0] || board[0][0]<21 || board[0][0]>108}"
          :style="`margin-right:${20/keys}%`"
          ></div>
        <div 
          v-for="key of board[0].slice(1,board[0].length-1)" 
          class="key" :class="{hide:!key || key<21 || key>108}"
          :style="`margin: 0 ${20/keys}%`"
          ><div class="touch"
            @touchstart.prevent.stop="down(key)"
            @touchend.prevent.stop="up(key)"
            @mousedown="down(key)"
            @mouseleave="leave(key)"
            @mouseenter="enter(key)"
            @mouseup="up(key)"
          ></div></div>
        <div class="key end" 
          :class="{hide:!board[0][board[0].length-1] || board[0][board[0].length-1]<21 || board[0][board[0].length-1]>108}"
          :style="`margin-left:${20/keys}%`"
          ></div>
      </div>
      <div class="whites">
        <div v-for="key of board[1]" class="white key"
          :class="{midc:key===60, hide:key<21 || key>108}"
          @touchstart.prevent.stop="down(key)"
          @touchend.prevent.stop="up(key)"
             @mousedown="down(key)"
             @mouseleave="leave(key)"
             @mouseenter="enter(key)"
             @mouseup="up(key)"
          >{{key<21 || key>108 || key%12?'':key/12-1}}</div>
      </div>
    </div>
  </div>
</template>
<style scoped>
  .toolbar{
    display:flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .close, .scale{
    color: white;
    text-align: center;
    font-size: 3em;
    font-weight: bold;
    cursor: pointer;
  }
  .keyboard{
    width:calc(100vw);
    height:calc(100vh - 10px);
    display:flex;
    flex-direction: column;
    justify-content: stretch;
    background:#333;
    user-select: none;
  }
  .board{
    flex:1 1 0;
    width:calc(100% - 20px);
    margin:10px;
    display:flex;
    flex-direction: column;
    justify-content: stretch;
  }
  .blacks, .whites{
    flex:1 1 0;
    width:100%;
    display:flex;
    flex-direction: row;
    justify-content: stretch;
  }
  .key{
    position:relative;
  }
  .blacks>.key{
    background:black;
    flex:2 2 0;
    margin:0 15px;
    z-index:1;
    cursor:pointer;
  }
  .blacks>.key.start{
    flex:1 1 0;
    margin-left:0;
    cursor:default;
  }
  .blacks>.key.end{
    flex:1 1 0;
    margin-right:0;
    cursor:default;
  }
  .hide{
    opacity:0;
  }
  .whites>.key{
    flex:1 1 0;
    border:2px solid black;
    transform:scaleY(200%);
    transform-origin:bottom center;
    z-index:0;
    background:white;
    font-size: 1.5em;
    font-weight:bold;
    cursor: pointer;
  }
  .whites>.midc{
    background:#aaa;
  }
  .touch{
    position:absolute;
    width:160%;
    height:100%;
    left:50%;
    top:0;
    transform:translateX(-50%);
    z-index:2;
  }
</style>
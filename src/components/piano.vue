<script>
  import { MidiInstrument } from './instrument';
  function isWhite(pitch){
    const keys='wbwbwwbwbwbw';
    return keys[pitch%12]==='w';
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
        sounds: {}
      }
    },
    async mounted(){
      this.ac = new AudioContext();
      this.inst = await MidiInstrument.load(this.ac,0);
      this.player = await MidiInstrument.player(this.ac,this.inst,this.ac.destination);
      this.ready=true;
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
  <div class=keyboard>
    <div @click="$emit('close')">close</div>
    <div v-for="board of keyMap" class=board>
      <div class="blacks">
        <div class="key start" 
          :class="{hide:!board[0][0]}"
          :style="`margin-right:${20/keys}%`"
          ></div>
        <div 
          v-for="key of board[0].slice(1,board[0].length-1)" 
          class="key" :class="{hide:!key}"
          :style="`margin: 0 ${20/keys}%`"
          ><div class="touch"
          @touchstart.prevent.stop="sound(key)"
          @touchend.prevent.stop="stop(key)"
          @mousedown="sound(key)"
          @mouseleave="stop(key)"
          @mouseup="stop(key)"
          ></div></div>
        <div class="key end" 
          :class="{hide:!board[0][board[0].length-1]}"
          :style="`margin-left:${20/keys}%`"
          ></div>
      </div>
      <div class="whites">
        <div v-for="key of board[1]" class="white key"
          :class="{midc:key===60}"
          @touchstart.prevent.stop="sound(key)"
          @touchend.prevent.stop="stop(key)"
          @mousedown="sound(key)"
          @mouseleave="stop(key)"
          @mouseup="stop(key)"
          ></div>
      </div>
    </div>
  </div>
</template>
<style scoped>
  .keyboard{
    width:calc(100vw);
    height:calc(100vh - 10px);
    display:flex;
    flex-direction: column;
    justify-content: stretch;
    background:#333;
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
    margin-left:0
  }
  .blacks>.key.end{
    flex:1 1 0;
    margin-right:0;
  }
  .blacks>.hide{
    opacity:0;
  }
  .whites>.key{
    flex:1 1 0;
    border:2px solid black;
    transform:scaleY(200%);
    transform-origin:bottom center;
    background:#fff8;
    z-index:0;
    background:white;
  }
  .whites>.midc{
    background:#aaa
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
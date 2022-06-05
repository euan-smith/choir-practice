<script>
/**
 * 1 if there is a score specified, and it is valid, show the score (done)
 * 2                                if it is not valid, and there is a list, say score not valid, offer other scores
 * 4 if there is no score, and there is a list, offer a selection
 * 5                     , if there is no list, say that '?score=' must be provided
 * 6 if a score is chosen and it is valid show the score (done)
 * 7 if a score is chosen and it is not valid say 'oops, that link no longer works', show the rest
 * 
 * errors:
 * 2. "score 'foo' does not seem to be valid.  The link might be old or broken."
 * <message heading>
 * <list
 */
import Mixer from './components/mixer.vue';
import { MIDIFile } from './components/midi';
export default {
  components:{
    Mixer
  },
  data(){
    return {
      error:null,
      title:'',
      scores:[],
      scoreList:{},
      index:0,
      ready:false,
    }
  },
  computed:{
    scoreNames(){
      return this.scoreList && Object.keys(this.scoreList)
    },
    score(){
      const {scores, index} = this;
      return scores && scores[index];
    },
    fullTitle(){
      const {title, scores, index} = this;
      const rtn=[title];
      if (scores?.[index]?.subtitle) rtn.push(scores[index].subtitle);
      return rtn.join(' - ');
    },
    showNext(){
      return this.scores.length > this.index + 1;
    },
    showPrev(){
      return this.index>0;
    },
    showScore(){
      return this.score && !this.error;
    }
  },
  methods:{
    readScores(){
      const s = localStorage.getItem('scores');
      try{
        this.scoreList = JSON.parse(s) || {};
      } catch(e){}
    },
    writeScores(){
      console.log({...this.scoreList});
      localStorage.setItem('scores',JSON.stringify(this.scoreList));
    },
    addScore(name, title){
      this.scoreList[name]=title;
      this.writeScores();
    },
    removeScore(name){
      delete this.scoreList[name];
      this.writeScores();
    },
    loadScore(name){
      location='?score='+name;
    }
  },
  async mounted(){
    this.readScores();
    if (window.location.search){
      const q = window.location.search.slice(1).split('&').map(s=>s.split('=')).reduce((o,d)=>Object.assign(o,{[d[0]]:d[1]}),{});
      try{
        const data = await fetch('/'+q.score+'.json').then(r=>r.json());
        if (data.parts && data.bars){
          // V1 of the file format
          this.title = data.title;
          this.scores = [{
            subtitle:'',
            ...data
          }]
          this.addScore(q.score,data.title);
        } else if (data.scores && data.title){
          this.title = data.title;
          this.scores = data.scores;
          this.addScore(q.score, data.title);
        } else this.error = [`Invlid score "${q.score}"`];
      } catch(e){
        this.error = [`Unable to load score "${q.score}"`];
        this.removeScore(q.score);
      }
    }
    this.ready=true;
  },
}
</script>

<template>
  <div v-if=showScore class=container>
    <div class=border>
      <mixer class=mixer :parts=score.parts :title=fullTitle :bars=score.bars :show-next=showNext :show-prev=showPrev @next=++index @prev=--index />
    </div>
  </div>
  <div v-else-if=!ready />
  <div v-else class="selector-container">
  <div class=selector>
    <div v-if=error class=error>
        <p :key=i v-for="(line,i) of error">{{line}}</p>
    </div>
    <div v-if="scoreNames?.length" class=list-container>
      <div class="msg">
        Load a previous score by clicking the list below.
      </div>
      <div  class=score-list >
        <div :key=i v-for="(s,i) of scoreNames" class=score @click=loadScore(s) >{{scoreList[s]}}</div>
      </div>
      <div class=msg2>
        If the score you want is not here, you need a new url link from your choir master.
      </div>
    </div>
    <div v-else>
      <div class="error">
        No score to display.
      </div>
      You don't seem to have accessed a score - you need a link to one from your choir master.
    </div>
  </div>
  </div>
</template>

<style>
@font-face {
  font-family: Lato;
  src: url(/Lato-Light.ttf);
}
html, body{
  font-family:Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;;
  width:100%;
  height:100%;
  overflow:hidden;
}
* {
  box-sizing: border-box;
  padding:0;
  margin:0;
}
div.selector-container{
  position:relative;
  background:#ccc;
  width:100vw;
  height:100vh;
}
div.selector{
  max-width: 512px;
  background:white;
  position:absolute;
  left:50%;
  top:40px;
  transform:translate(-50%,0);
  padding:1em;
  box-shadow: #0004 -3px 3px 10px;
  border-radius: 8px;
}
.msg{
  font-size: 1.2em;
  padding: 5px;
}
.score-list{
  width:100%;
  display:flex;
  flex-direction:column;
  margin: 5px 2px 8px;
}
.score-list>.score{
  font-size:1.1em;
  width:calc(100% - 20px);
  padding:2px 1em;
  margin: 2px 2px;
  border-radius: 4px;
  transition: 0.2s linear;
}
.score-list>.score:hover{
  background:#eee;
  cursor: pointer;
}
.container{
  padding:5px;
  /* background:#333; */
  height:fit-content;
  display:flex;
  flex-direction: row;
  justify-content: center;
}
.border{
  padding:10px;
  background:black;
  width:fit-content;
  background-image: repeating-linear-gradient(80deg, #4448, #5558 150px, #8888 200px, #4448 400px),
    repeating-linear-gradient(-45deg, #aaa, #666 1px, #aaa 3px);
  border-radius:10px;
}

div.error{
  font-family: Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding:16px;
  border-left:5px solid red;
}
div.error:first-child{
  font-weight:bold;
  font-size:1.2em;
  color:#300;
}

@media (max-height:360px), (max-width:640px){
  html{
    height:auto;
    overflow-y: scroll;
  }
}

</style>

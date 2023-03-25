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
import Selector from './components/selector.vue';
import Piano from './components/piano.vue';
export default {
  components:{
    Mixer,
    Selector,
    Piano,
  },
  data(){
    return {
      error:null,
      title:'',
      scores:[],
      perfList:{},
      scoreList:{},
      index:0,
      ready:false,
      showPiano:false,
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
      const p = localStorage.getItem('perfs');
      try{
        this.scoreList = JSON.parse(s) || {};
      } catch(e){}
      try{
        this.perfList = JSON.parse(p) || {};
      } catch(e){}
    },
    writeScores(){
      console.log({...this.scoreList});
      localStorage.setItem('scores',JSON.stringify(this.scoreList));
      localStorage.setItem('perfs',JSON.stringify(this.perfList));
    },
    addScore(name, title){
      this.scoreList[name]=title;
      this.writeScores();
    },
    removeScore(name){
      delete this.scoreList[name];
      this.writeScores();
    },
    addPerf(name, def){
      this.perfList[name]=def;
      this.writeScores();
    },
    removePerf(name){
      delete this.perfList[name];
      this.writeScores();
    },
    loadScore(name){
      location='?score='+name;
    },
    async readFile(file){
      let data;
      try{
        data = await fetch('/scores/'+file+'.json').then(r=>r.json());
      } catch(e){
        data = await fetch('/'+file+'.json').then(r=>r.json());
      }
      if (data.type==='score' || !data.type){
        if (data.parts && data.bars){
          data = {
            title: data.title,
            scores: [{subtitle:'', ...data}]
          }
        }
        this.addScore(file, data.title);
        return data;
      } else if (data.type==='performance'){
        this.addPerf(file, data);
        for (let score of data.scores){
          await this.readFile(score);
        }
      }
    },
  },
  async mounted(){
    this.readScores();
    if (window.location.search){
      const q = window.location.search.slice(1).split('&').map(s=>s.split('=')).reduce((o,d)=>Object.assign(o,{[d[0]]:d[1]}),{});
      if (q.score){
        try{
          const data = await this.readFile(q.score);
          if (data.scores && data.title){
            this.title = data.title;
            this.scores = data.scores;
          } else this.error = [`Invlid score "${q.score}"`];
        } catch(e){
          console.log(e);
          this.error = [`Unable to load score "${q.score}"`];
          this.removeScore(q.score);
        }
      }
    }
    this.ready=true;
  },
}
</script>

<template>
  <div v-if=showPiano class=container>
    <piano @close="showPiano=false"></piano>
  </div>
  <div v-if=showScore class=container>
    <div class=border>
      <mixer @piano="showPiano=!showPiano" class=mixer :parts=score.parts :title=fullTitle :bars=score.bars :show-next=showNext :show-prev=showPrev @next=++index @prev=--index />
    </div>
  </div>
  <div v-else-if=!ready />
  <div v-else class=container>
    <div class=border>
      <selector :scores=scoreList :perfs=perfList />
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
.msg{
  font-size: 1.2em;
  padding: 5px;
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

/* @media (max-height:360px), (max-width:640px){ */
  html{
    height:auto;
    overflow-y: scroll;
  }
/* } */

</style>

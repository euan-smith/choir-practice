<script>
import Mixer from './components/mixer.vue';
export default {
  components:{
    Mixer
  },
  data(){
    return {
      score:null,
      error:null,
    }
  },
  async mounted(){
    if (!window.location.search) return this.error = ["Unable to load a score - none specified","URL should include '?score=<score name>'"];
    const q = window.location.search.slice(1).split('&').map(s=>s.split('=')).reduce((o,d)=>Object.assign(o,{[d[0]]:d[1]}),{});
    if (!q.score) return this.error = ["Unable to load a score - none specified","URL should include '?score=<score name>'"];
    try{
    this.score = await fetch('/'+q.score+'.json').then(r=>r.json());
    } catch(e){
      this.error = [`Unable to load score "${q.score}"`];
    }
  }
}
</script>

<template>
  <div class=container>
    <div class=border>
      <mixer class=mixer v-if=score :parts=score.parts :title=score.title :bars=score.bars />
      <div v-else-if=error class=error>
        <h1 v-if=error[0]>{{error[0]}}</h1>
        <p :key=i v-for="(line,i) of error.slice(1)">{{line}}</p>
      </div>
    </div>
  </div>
</template>

<style>
@font-face {
  font-family: Lato;
  src: url(/Lato-Light.ttf);
}
* {
  box-sizing: border-box;
  padding:0;
  margin:0;
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
  background:#333;
  padding:16px;
  color:white;
}
.error>h1{
  color:#faa;
}
.error>p{
  font-weight:bold;
  font-size:1.2em;
  color:#ddd;
}

</style>

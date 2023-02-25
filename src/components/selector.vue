<script>
  export default {
    props:{
      perfs:{
        type:Object,
        default:{}
      },
      scores:{
        type:Object,
        default:{}
      },
    },
    data(){
      return {
        selected:null,
        addError:false,
        version:__APP_VERSION__,
      }
    },
    computed:{
      scoreList(){
        if (this.selected && this.perfs[this.selected]){
          const rtn={};
          for (let score of this.perfs[this.selected].scores){
            if (this.scores[score]) rtn[score] = this.scores[score];
          }
          return rtn;
        } else return this.scores;
      }
    },
    methods:{
      select(perf){
        this.selected = this.selected===perf ? null : perf;
      },
      async add(evt){
        try{
          await this.$parent.readFile(evt.target.value)
          evt.target.value='';
        } catch(e){
          console.log(e);
          this.addError=true;
        }
      },
      play(score){
        this.$parent.loadScore(score);
      }
    }
  }
</script>
<template>
  <div class=selector>
    <div class=title>Choir Practice <span style="font-size: 0.7em">v{{version}}</span></div>
    <div class=controls>
      <div class=perfs>
        <div class=title>Rehearsal</div>
        <ul class=list>
          <li v-for="p in Object.keys(perfs)" 
            :class="p===selected?'selected':''" 
            @click="select(p)"
          >{{ perfs[p].title }}</li>
          <p class=none v-if="Object.keys(perfs).length === 0">
            nothing to show.<br><br>
            load something with 'add scores...'.
          </p>
        </ul>
      </div>
      <div class=scores>
        <div class=title>Scores</div>
        <ul class=list>
          <li v-for="s in Object.keys(scoreList)"
            @click="play(s)"
          >{{ scoreList[s] }}</li>
          <p class=none v-if="Object.keys(scoreList).length === 0">
            nothing to show.<br><br>
            load something with 'add scores...'.
          </p>
        </ul>
      </div>
    </div>
    <input class=add :class="{error:addError}" type=text placeholder="add scores..." @change=add @input="addError=false">
  </div>
</template>
<style>
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
  .selector{
    position:relative;
    user-select: none;
    font-family: Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color:white;
    display:flex;
    flex-direction:column;
    align-items: center;
    width:calc(100vw - 30px);
    background: #333;

    /* flex-wrap: wrap-reverse; */
  }
  .selector>.title{
    font-size:40px;
  }
  .selector>.controls{
    display:flex;
    flex-direction:row;
    flex-wrap: wrap;
    align-content:stretch;
    width:calc(100vw - 60px)
  }
  .controls>.perfs, .controls>.scores{
    flex:1 1 0;
    display:flex;
    flex-direction:column;
    align-items: stretch;
    min-width: 300px;
  }
  .perfs>.title, .scores>.title{
    font-size: 30px;
    flex:0 0 auto;
  }

  .list{
    border: #333 10px solid;
    border-radius:20px;
    font-size: 24px;
    list-style: none;
    overflow-y:scroll;
    flex: 1 1 auto;
  }

  .perfs>.list{
    color:#afa;
    background:#222722;
  }
  .scores>.list{
    color:#ffa;
    background:#272722;
  }
  .list>li, .list>.none{
    margin:8px;
    padding:2px 6px;
    border-radius:4px;
  }
  .list>.none{
    opacity:0.5;
  }
  .list>li{
    cursor: pointer;
  }
  .perfs li.selected{
    background:#44aa44;
    color:#222;
    font-weight:bold;
  }
  .perfs li:hover{
    background:#445044;
  }
  .perfs li.selected:hover{
    background:#226622;
    color:inherit;
  }
  .scores li:hover{
    background:#505044;
  }
  .selector>.add{
    border: #333 10px solid;
    border-radius:20px;
    font-size: 24px;
    width: calc(100vw - 60px);
    background: #222;
    color: white;
    padding:4px 8px;
  }
  input.add::placeholder{
    opacity:0.4;
  }
  input.add:focus{
    outline:none;
  }
  input.add.error{
    background:#722;
  }
</style>
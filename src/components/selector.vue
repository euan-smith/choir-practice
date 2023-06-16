<script>
  import {s3, hasS3, dir, s3scores, s3sets} from './aws';
  const NONE=0, CAT=1, ADD_REHEARSAL=2, ADD_SCORE=3, ADD_MIDI=4;
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
    setup(){
      return {hasS3, s3scores, s3sets};
    },
    data(){
      return {
        selected:null,
        addError:false,
        version:__APP_VERSION__,
        state:NONE
      }
    },
    computed:{
      editing(){
        return this.state!==NONE;
      },
      perfList(){
        if (this.editing){
          return this.s3sets.map(s=>s.set);
        } else {
          return this.perfs;
        }
      },
      scoreList(){
        if (this.editing){
          const rtn={};
          for (let score of this.s3scores){
            rtn[score.file.Key]=score.score.title;
          }
          return rtn;
        } else {
          if (this.selected && this.perfs[this.selected]){
            const rtn={};
            for (let score of this.perfs[this.selected].scores){
              if (this.scores[score]) rtn[score] = this.scores[score];
            }
            return rtn;
          } else return this.scores;
        }
      },
      inPerf(){
        console.log(this.selected, this.s3sets)
        if (!this.editing || !this.s3sets[this.selected]?.set?.scores) return false;
        const perfList = this.s3sets[this.selected].set.scores.map(s=>'scores/'+s+'.json');
        const rtn={};
        for (let score of perfList) rtn[score]=true;
        return rtn;
      }
    },
    methods:{
      async toggleEdit(){
        switch(this.state){
          case NONE:
            this.state=CAT;
            await dir();
            break;
          default:
            this.state=NONE;
        }
      },
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
    <div class=title>Choir Practice <span style="font-size: 0.7em">v{{version}}</span>
      <svg
          class=edit
          :class={editing}
          v-show=hasS3 height="48"
          viewBox="-180 -1100 1320 1320" width="48" fill="#333"
          @click=toggleEdit
      >
        <path d="M811-656 656-812l41-41q21-21 52-20.5t52 21.5l52 53q21 21 20.5 51T852-697l-41 41Zm-41 41L255-99H100v-156l515-515 155 155Z"/>
      </svg>
    </div>
    <div class=controls>
      <div class=perfs>
        <div class=title>Rehearsal</div>
        <ul class=list>
          <li v-for="p in Object.keys(perfList)"
            :class="p===selected?'selected':''" 
            @click="select(p)"
          >{{ perfList[p].title }}</li>
          <li v-if=editing>
            <input class=add type=text placeholder="add a score set...">
          </li>
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
              :class={selected:inPerf[s]}
            @click="play(s)"
          >{{ scoreList[s] }}</li>
          <li v-if=editing>
            <input class=add type=text placeholder="add a score...">
          </li>
          <p class=none v-if="Object.keys(scoreList).length === 0">
            nothing to show.<br><br>
            load something with 'add scores...'.
          </p>
        </ul>
      </div>
    </div>
    <div v-if="editing" class="add">
      <span v-if="selected">{{s3sets[selected].set}}</span>
    </div>
    <input v-else class=add :class="{error:addError}" type=text placeholder="add scores..." @change=add @input="addError=false">
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
    position:relative;
    width:100%;
    text-align: center;
  }
  .title>.edit{
    position:absolute;
    height:48px;
    width:48px;
    background:#644;
    top:16px;
    right:16px;
    border-radius: 24px;
    border: none;
  }
  .title>.edit.editing{
    background:radial-gradient(circle, #f66 0%, #e66 30%, #733 80%, #622 100%);
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
  .perfs li.selected, .scores li.selected{
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
  .add{
    font-size: 24px;
    background: rgba(0,0,0,0);
    color: white;
    border:none;
    font-family: Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  .list .add{
    width:100%
  }
  .selector>.add{
    border: #333 10px solid;
    border-radius:20px;
    width: calc(100vw - 60px);
    background: #222;
    padding:4px 8px;
  }
  input.add::placeholder{
    opacity:0.4;
  }
  input.add:focus{
    outline:none;
    background: rgba(255,255,255,0.05)
  }
  input.add.error{
    background:#722;
  }
</style>
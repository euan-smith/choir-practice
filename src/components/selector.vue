<script>
  import {hasS3, musicFiles, putFile, deleteFile, getFile, dir, s3scores, s3sets} from './aws';
  import PartUrl from "./part-url.vue";
  // function to convert {[from],beats,[repeat],[timeSig],[tempo]} array
  // to {baseBar, baseBeat, baseMetre, [from], toBar, toBeat, [repeat], [timeSig], [tempo], next, reparse}
  function getBarBeat(bar, addBeat=0){
    let base;
    const metre = (bar.timeSig || bar.baseMetre);
    if (bar.from) base = bar.from*metre;
    else base = bar.baseBar*metre+bar.baseBeat-1;
    base += bar.beats - 1 + addBeat;
    return [Math.floor(base/metre), (base % metre) + 1];
  }
  const barProps={
    _:{value:{}, writable:true},
    changed:{value:false, writable:true},
    next:{value:false, writable:true},
    from:{
      get(){return this._.from;},
      set(v){this._.from=v; this.changed=true},
      enumerable: true,
    },
    beats:{
      get(){return this._.beats;},
      set(v){this._.beats=v; this.changed=true},
      enumerable: true,
    },
    timeSig:{
      get(){return this._.timeSig;},
      set(v){this._.timeSig=v; this.changed=true},
      enumerable: true,
    },
    tempo:{
      get(){return this._.tempo;},
      set(v){this._.tempo=v; this.changed=true},
      enumerable: true,
    },
    repeat:{
      get(){return this._.repeat;},
      set(v){this._.repeat=v; this.changed=true},
      enumerable: true,
    },
    baseBar:{value:1, writable:true},
    baseBeat:{value:1, writable:true},
    baseMetre:{value:4, writable:true},
    toBar:{
      get(){
        return getBarBeat(this)[0];
      },
      set(v){
        let [bar,] = getBarBeat(this);
        this.beats += (v-bar)*(this.timeSig || this.baseMetre);
      }
    },
    toBeat:{
      get(){
        return getBarBeat(this)[1];
      },
      set(v){
        let [,beat] = getBarBeat(this);
        this.beats += (v-beat);
      }
    },
    reparse:{
      value:function(){
        if (!this.next) return;
        let [bar,beat] = getBarBeat(this,1);
        this.next.baseBar = bar;
        this.next.baseBeat = beat;
        this.next.baseMetre = this.timeSig || this.baseMetre;
        this.next.reparse();
      }
    }
  }
  function parseBars(bars){
    const rtn=[];
    let last=null;
    for (let bar of bars){
      const b = Object.defineProperties({},barProps);
      b._ = bar;
      if (last) last.next=b;
      last=b;
      rtn.push(b);
    }
    rtn[0].reparse();
    return rtn;
  }

  const NONE=0, CAT=1, PERF_EDIT=2, PERF_CHANGED=3, SCORE_EDIT=4, SCORE_CHANGED=5, PERF_NEW=6;
  const NEW='*';
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
      return {hasS3, s3scores, s3sets, musicFiles};
    },
    data(){
      return {
        selected:null,
        score:null,
        addError:false,
        version:__APP_VERSION__,
        state: NONE,
        newPerfTitle: "",
        newPerfObj: null,
        inPerf: false,
        scoreObj: null,
        scoreVer:0,
        lastScoreVer:0,
      }
    },
    components:{
      PartUrl
    },
    computed:{
      editing(){
        return this.state!==NONE;
      },
      perfChanged(){
        return this.state===PERF_CHANGED;
      },
      scoreEdit(){
        return this.state===SCORE_EDIT || this.state===SCORE_CHANGED;
      },
      scoreChanged(){
        return this.state===SCORE_CHANGED;
      },
      perfList(){
        if (this.editing){
          const rtn={};
          for (let set of this.s3sets){
            rtn[set.file.Key]=set.set;
          }
          if (this.newPerfObj) rtn[NEW]=this.newPerfObj;
          return rtn;
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
    },
    methods:{
      async confirm(opts){
        return new Promise((res)=>{
          this.$confirm({...opts, callback:res});
        })
      },
      async toggleEdit(){
        switch(this.state){
          case NONE:
            this.state=CAT;
            this.selected=null;
            await dir();
            break;
          default:
            this.selected=null;
            this.state=NONE;
            this.inPerf = false;
        }
      },
      async perfClick(perf){
        console.log(perf);
        switch(this.state){
          case NONE:
            this.selected = this.selected===perf ? null : perf;
            if (this.selected) await getFile(perf);
            break;
          case CAT:
          case PERF_EDIT:
          case PERF_CHANGED:
            this.selected = this.selected===perf ? null : perf;
            this.inPerf = {};
            if (this.selected){
              this.state = PERF_EDIT;
              const perfList = this.perfList[this.selected].scores.map(s=>'scores/'+(/\.json$/.test(s)?s:s+'.json'));
              // console.log(perfList);
              for (let score of perfList) this.inPerf[score]=true;
            } else {
              this.state = CAT;
            }
            this.newPerfTitle="";
            this.newPerfObj=null;
            break;
          case PERF_NEW:
            this.state = CAT;
            break;
          default:
            console.log('error: perfClick when state='+this.state, 'resetting state to NONE');
            return this.toggleEdit();
        }
      },
      async perfDeleteClick(){
        const {title} = this.perfList[this.selected];
        if (!await this.confirm({message:`Delete "${title}" [${this.selected}], are you sure?`,button:{yes:`Yes`, no:'No'}})) return;
        if (this.selected === NEW){
          this.newPerfObj=null;
          this.newPerfTitle="";
        } else {
          await deleteFile(this.selected);
          await dir();
        }
        this.selected=null;
        this.state=CAT;
        this.inPerf = {};
      },
      async perfSaveClick(){
        //status is CHANGED
        // console.log(this.s3sets[this.selected], [...Object.keys(this.inPerf).filter(p=>this.inPerf[p])]);
        const scores = Object.keys(this.inPerf).filter(p=>this.inPerf[p]).map(s=>/\/([^/]+)\.json$/.exec(s)[1]);
        let perf;
        for (let set of this.s3sets){
          if (set.file.Key === this.selected){
            perf = set;
            break;
          }
        }
        if (!perf && this.newPerfObj){
          let Key, n=1;
          const fnames = this.s3sets.map(s=>s.file.Key);
          console.log(fnames);
          while ((!Key || fnames.indexOf(Key)>=0)&&n<100){
            Key='scores/'+this.newPerfObj.title.replace(/[^a-zA-Z0-9]/g,'')+(n>1?n:'')+'.json';
            ++n;
          }
          if (n>99) {
            console.log('Error finding free filename');
            return;
          }
          perf = {set: this.newPerfObj, file:{Key}}
        }
        const body = JSON.stringify({...perf.set, scores});
        await putFile(perf.file.Key, body);
        await dir();
        this.state = PERF_EDIT;
        const p = perf.file.Key;
        this.selected = null;
        this.perfClick(p);
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
      async scoreClick(score){
        switch(this.state){
          case NONE:
            this.play(score);
            break;
          case CAT:
          case SCORE_EDIT:
          case SCORE_CHANGED:
            //edit the score
              this.score = this.score === score ? null : score;
              if (this.score){
                this.state = SCORE_EDIT;
                this.scoreObj = JSON.parse(await getFile(this.score));
                this.scoreObj.scores.forEach(s => s.bars = parseBars(s.bars));
                this.lastScoreVer = this.scoreVer = 1;
                window._so = this.scoreObj;
              } else {
                this.state = CAT;
              }
              console.log(this.score);
            break;
          case PERF_EDIT:
          case PERF_CHANGED:
          case PERF_NEW:
            this.inPerf[score] = !this.inPerf[score];
            this.state = PERF_CHANGED;
            break;
        }
      },
      play(score){
        this.$parent.loadScore(score);
      },
      newPerfBlur(){
        if (this.state !== PERF_NEW)
          this.newPerfTitle="";
      },
      newPerfConfirm(e){
        this.selected = "*";
        this.state = PERF_NEW;
        this.inPerf={};
        this.newPerfObj={title:this.newPerfTitle, type:'performance', when:"", scores:[]};
      }
    },
    watch:{
      scoreVer(v){
        if (v==="new"){
          this.scoreObj.scores.push({subtitle:"",parts:[],beats:[]});
          this.scoreVer=this.scoreObj.scores.length;
        } else if (v==="copy"){
          this.scoreObj.scores.push(JSON.parse(JSON.stringify(this.scoreObj.scores[this.lastScoreVer-1])));
          this.scoreVer=this.scoreObj.scores.length;
          this.scoreObj.scores.forEach(s => s.bars = parseBars(s.bars));
        }
        this.lastScoreVer=this.scoreVer;
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
      <div class=perfs :class="{scoreEdit}">
        <div class=title>Rehearsal</div>
        <ul class=list>
          <li v-for="p in Object.keys(perfList)"
            :class="p===selected?'selected':''"
          >
            <span class=name @click=perfClick(p)>{{ perfList[p].title }}</span>
            <svg @click=perfSaveClick class=save v-if="p===selected&&perfChanged" viewBox="0 -960 960 960"><path d="M840-683v503q0 24-18 42t-42 18H180q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h503l157 157ZM479.765-245Q523-245 553.5-275.265q30.5-30.264 30.5-73.5Q584-392 553.735-422.5q-30.264-30.5-73.5-30.5Q437-453 406.5-422.735q-30.5 30.264-30.5 73.5Q376-306 406.265-275.5q30.264 30.5 73.5 30.5ZM233-584h358v-143H233v143Z"/></svg>
            <svg @click=perfDeleteClick class=delete v-if="p===selected&&editing" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
          </li>
          <li class=new-item v-if=editing&&!selected>
            <form class=add  @submit.prevent=newPerfConfirm>
              <input class=add type=text v-model=newPerfTitle placeholder="add a score set..." @blur="newPerfBlur" >
              <input type="submit" hidden>
            </form>
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
              :class="{selected:inPerf[s]||s===score}"
            @click="scoreClick(s)"
          >{{ s===score && scoreObj ? scoreObj.title : scoreList[s] }}</li>
          <li class=new-item v-if=editing>
            <input class=add type=text placeholder="add a score...">
          </li>
          <p class=none v-if="Object.keys(scoreList).length === 0">
            nothing to show.<br><br>
            load something with 'add scores...'.
          </p>
        </ul>
      </div>
      <div class=score v-if="scoreEdit">
        <div class=title>Score Editor</div>
          <div class=score-container v-if="scoreObj">
            <label class=score-title>title: <input type=text v-model="scoreObj.title"></label>
            <label class=versions>version: <select v-model=scoreVer>
              <option v-for="si of scoreObj.scores.length" :value=si>version {{si}} "{{scoreObj.scores[si-1].subtitle}}"</option>
              <option value=new>...new</option>
              <option value=copy>...copy</option>
            </select></label>
            <label class=score-sub>subtitle: <input type=text v-model="scoreObj.scores[scoreVer-1].subtitle"></label>
            <ul class=parts>
              <li class=part v-for="p of scoreObj.scores[scoreVer-1].parts">
                <div class=nam-vol>
                  <label>name:</label> <input class=name type=text v-model=p.name>
                  <label>vol:</label> <input class=vol type=number v-model=p.volume>
                </div>
                <div class=url>
                  <part-url class=url v-model:url=p.url />
                </div>
              </li>
              <li class=buttons>
                <button>Add...</button>
              </li>
            </ul>
            <table class=bars>
              <tr>
                <th>Bars</th>
                <th>Repeat</th>
                <th>Metre</th>
                <th>Tempo</th>
              </tr>
              <tr class=bar v-for="b of scoreObj.scores[scoreVer-1].bars">
                <td>{{b.from || b.baseBar}}{{b.from?'^1':'^'+b.baseBeat}} - {{b.toBar}}^{{b.toBeat}}</td>
                <td>{{b.repeat || ""}}</td>
                <td>{{b.timeSig || ""}}</td>
                <td>{{b.tempo || ""}}</td>
              </tr>
            </table>
          </div>
      </div>
    </div>
    <input v-if=!editing class=add :class="{error:addError}" type=text placeholder="add scores..." @change=add @input="addError=false">
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
  *{
    font-family: Lato, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  .selector{
    position:relative;
    user-select: none;
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
  .controls>.perfs, .controls>.scores, .controls>.score{
    flex:1 1 0;
    display:flex;
    flex-direction:column;
    align-items: stretch;
    min-width: 300px;
  }
  .perfs.scoreEdit{
    display:none;
  }
  .perfs>.title, .scores>.title, .score>.title{
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
  .score>.list{
    color:#aff;
    background:#222727;
  }
  .list>li, .list>.none{
    margin:8px;
    padding:2px 6px;
    border-radius:4px;
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }
  .list>li>span{
    flex:1 1 auto;
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
  .perfs li.selected > .save, .perfs li.selected > .delete{
    flex: 0 1 32px;
    margin-left:10px;
    max-height:100%;
    fill:#000;
  }
  .perfs li:hover{
    background:#445044;
  }
  .perfs li.selected:hover, .scores li.selected:hover{
    background:#226622;
    color:inherit;
  }
  .perfs li.selected > .save:hover{
    fill:white;
  }
  .perfs li.selected > .delete:hover{
    fill:red;
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
  .perfs .new-item>span{
    padding:0 6px;
    background: rgba(255,255,255,0.05);
  }
  .new-item>.yes{
    color:green;
  }
  .new-item>.no{
    color:red;
  }
  .score-container{
    margin:8px 0;
    padding:0 4px;
    max-height:800px;
    overflow-y: scroll;
    background:
      /* Shadow Cover TOP */
      linear-gradient(
          rgba(51,51,51) 30%,
          rgba(51,51,51, 0)
      ) center top,

        /* Shadow Cover BOTTOM */
      linear-gradient(
          rgba(51,51,51, 0),
          rgba(51,51,51) 70%
      ) center bottom,

        /* Shadow TOP */
      radial-gradient(
          farthest-side at 50% 0,
          rgba(0, 0,0, 0.5),
          rgba(0, 0, 0, 0)
      ) center top,

        /* Shadow BOTTOM */
      radial-gradient(
          farthest-side at 50% 100%,
          rgba(0,0,0, 0.5),
          rgba(0, 0, 0, 0)
      ) center bottom;

    background-repeat: no-repeat;
    background-size: 100% 40px, 100% 40px, 100% 14px, 100% 14px;
    background-attachment: local, local, scroll, scroll;
  }
  .score>.title{
    padding-bottom:4px;
  }
  .score label{
    font-size:26px;
    margin:4px 6px;

  }
  .score-title,.versions, .score-sub{
    display:flex;
    flex-direction: row;
  }
  .score input, .score select{
    background: #222727;
    border:none;

    color:#a0e0e0;
    border-radius:4px;
    padding:0 4px;
  }
  .score-title>input, .versions>select, .score-sub>input{
    flex:1 1 auto;
    margin-left:8px;
    font-size:24px;
  }
  .versions>select>option{
    font-size:20px;
  }
  .parts{
    padding:8px 12px;
  }
  .parts label{
    font-size: 20px;
  }
  .parts input{
    font-size:18px
  }
  .parts>.part, .parts>.buttons{
    list-style-type: none;
  }
  .parts>.part{
    margin:4px 2px;
    border-radius:4px;
    border:1px solid #0004;
    background:#fff1;
    padding:4px;
  }
  .part>.nam-vol{
    display:flex;
    flex-direction:row;
  }
  .part>div.url{
    margin-top:4px;
  }
  .url>.url{
    width:100%;
  }
  input.vol{
    width:50px;
  }
  input.name{
    flex:1 0 0;
  }
  li.buttons{
    display:flex;
    flex-direction: row;
  }
  li.buttons>button{
    width:100%;
    font-size: 18px;
    background:#fff1;
    border:none;
    border-radius:4px;
    margin:0 4px;
    color:#a0e0e0;
    cursor: pointer;
  }
  li.buttons>button:hover{
    background:#8ff3;
  }
  li.buttons>button:active{
    background:#4883;
  }


</style>
<script>
import {musicFiles} from './aws';

export default {
  name: "part-url",
  props:{
    url:String
  },
  emits:['update:url'],
  computed:{
    split:{
      get(){
        let [file,search] = this.url.split('?');
        if (file[0]==='/') file=file.slice(1);
        let q={file};
        for(let term of search.split('&')){
          const [k,v] = term.split('=');
          q[k]=v;
        }
        return q;
      },
      set(q){
        const qs=[];
        if (typeof q.track !== 'undefined') qs.push('track='+q.track);
        if (typeof q.prog !== 'undefined' && q.prog!=="") qs.push('prog='+q.prog);
        this.$emit('update:url',q.file+'?'+qs.join('&'));
      }
    },
    track:{
      get(){return this.split.track},
      set(track){this.split = {...this.split, track}}
    },
    prog:{
      get(){return this.split.prog},
      set(prog){this.split = {...this.split, prog}}
    },
    file:{
      get(){return this.split.file},
      set(file){this.split = {...this.split, file}}
    },
    files(){
      const rtn=[];
      for (let f of this.musicFiles){
        if (f[0]==='/')f=f.slice(1);
        if (/^scores/.test(f))f=f.slice(6);
        if (f[0]==='/')f=f.slice(1);
        rtn.push(f);
      }
      return rtn;
    }
  },
  setup(){
    return {musicFiles}
  }
}
</script>

<template>
  <div class=container>
    <div class=file>
      <select v-model=file>
        <option v-for="f of files" :value=f>{{f}}</option>
      </select>
    </div>
    <label>track=</label><input type=number min=0 step=1 v-model=track>
    <label>prog=</label><input type=number min=0 step=1 v-model=prog>
  </div>
</template>


<style scoped>
  div.container {
    display:flex;
    flex-direction:row;
  }
  div.file {
    flex:1 1 0;
  }
  input, select{
    height:30px;
  }
  label{
    font-size: 18px;
  }
  input{
    width: 50px;
    font-size: 18px;
  }
  select{
    font-size: 18px;
    width: 100%
  }
  option{
    font-size: 16px;
  }
</style>
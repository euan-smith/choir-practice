import {reactive} from "vue";

export default reactive({
  notes: [],
  set(notes) {
    this.notes = notes
  },
  clear(part){
    if (!part) this.set([]);
    else this.set(this.notes.filter(n=>n.part!==part));
  },
  add(part,notes){
    if (!Array.isArray(notes)) notes=[notes];
    for (let note of notes) this.notes.push({part, note})
  },
  replace(part, notes){
    this.clear(part);
    this.add(part, notes);
  }
})

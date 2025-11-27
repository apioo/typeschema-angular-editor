import {Component, effect, input, output, signal} from '@angular/core';
import {Argument} from "../../model/Argument";
import {Specification} from "../../model/Specification";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'typeschema-arguments',
  templateUrl: './argument.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./argument.component.css']
})
export class ArgumentComponent {

  data = input<Array<Argument>>([]);
  specification = input.required<Specification>();
  dataChange= output<Array<Argument>>();

  result = signal<Array<Argument>>([]);

  newName = signal<string|undefined>(undefined);
  newIn = signal<'path'|'query'|'header'|undefined>(undefined);
  newType = signal<string|undefined>('string');

  types = [
    {key: 'string', value: 'String'},
    {key: 'integer', value: 'Integer'},
    {key: 'number', value: 'Number'},
    {key: 'boolean', value: 'Boolean'},
  ];

  ins = [
    {key: 'path', value: 'Path'},
    {key: 'query', value: 'Query'},
    {key: 'header', value: 'Header'},
  ];

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) {
        const result: Array<Argument> = [];
        data.forEach((entry) => {
          result.push(entry);
        });
        this.result.set(result);
      }
    });
  }

  add() {
    const newName = this.newName();
    const newIn = this.newIn();
    const newType = this.newType();
    if (!newName || !newIn || !newType) {
      return;
    }

    this.result.update((entries) => {
      entries.push({
        name: newName,
        in: newIn,
        type: newType,
      });
      return entries;
    });

    this.newName.set(undefined);
    this.newIn.set(undefined);
    this.newType.set('string');
  }

  setName(index: number, name: string) {
    this.result.update((entries) => {
      entries[index].name = name;
      return entries;
    });
  }

  setIn(index: number, in_: 'path' | 'query' | 'header' | 'body') {
    this.result.update((entries) => {
      entries[index].in = in_;
      return entries;
    });
  }

  setType(index: number, type: string) {
    this.result.update((entries) => {
      entries[index].type = type;
      return entries;
    });
  }

  remove(name?: string) {
    this.result.update((entries) => {
      return entries.filter((row) => {
        return row.name !== name;
      });
    });
  }

  changeValue() {
    this.dataChange.emit(this.result());
  }

}

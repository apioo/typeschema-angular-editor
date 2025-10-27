import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Argument} from "../../model/Argument";
import {Specification} from "../../model/Specification";

@Component({
  selector: 'typeschema-arguments',
  templateUrl: './argument.component.html',
  styleUrls: ['./argument.component.css']
})
export class ArgumentComponent implements OnInit {

  @Input() data: Array<Argument> = [];
  @Input() specification!: Specification;
  @Output() dataChange= new EventEmitter<Array<Argument>>();

  result: Array<Argument> = [];

  newName?: string;
  newIn?: 'path' | 'query' | 'header';
  newType?: string = 'string';

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

  ngOnInit() {
    if (this.data) {
      this.result = [];
      this.data.forEach((entry) => {
        this.result.push(entry);
      });
    }
  }

  add() {
    if (!this.newName || !this.newIn || !this.newType) {
      return;
    }

    this.result.push({
      name: this.newName,
      in: this.newIn,
      type: this.newType,
    })

    this.newName = undefined;
    this.newIn = undefined;
    this.newType = 'string';
  }

  remove(name?: string) {
    this.result = this.result.filter((row) => {
      return row.name !== name;
    });
  }

  changeValue() {
    this.dataChange.emit(this.result);
  }

}

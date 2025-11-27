import {Component, effect, EventEmitter, input, Input, OnInit, output, Output, signal} from '@angular/core';
import {Specification} from "../../model/Specification";
import {Throw} from "../../model/Throw";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'typeschema-throws',
  templateUrl: './throw.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./throw.component.css']
})
export class ThrowComponent {

  data = input<Array<Throw>>([]);
  specification = input.required<Specification>();
  contentTypes = input.required<Array<{name: string, value: string}>>();
  dataChange = output<Array<Throw>>();

  result = signal<Array<Throw>>([]);

  newCode = signal<number|undefined>(undefined);
  newType = signal<string|undefined>(undefined);

  errorStatusCodes = [
    {key: 0, value: ''},
    {key: 400, value: 'Bad Request'},
    {key: 402, value: 'Payment Required'},
    {key: 403, value: 'Forbidden'},
    {key: 404, value: 'Not Found'},
    {key: 405, value: 'Method Not Allowed'},
    {key: 408, value: 'Request Timeout'},
    {key: 409, value: 'Conflict'},
    {key: 410, value: 'Gone'},
    {key: 412, value: 'Precondition Failed'},
    {key: 417, value: 'Expectation Failed'},
    {key: 422, value: 'Unprocessable Entity'},
    {key: 423, value: 'Locked'},
    {key: 424, value: 'Failed Dependency'},
    {key: 429, value: 'Too Many Requests'},
    {key: 499, value: '4xx'},
    {key: 500, value: 'Internal Server Error'},
    {key: 501, value: 'Not Implemented'},
    {key: 502, value: 'Bad Gateway'},
    {key: 503, value: 'Service Unavailable'},
    {key: 504, value: 'Gateway Timeout'},
    {key: 507, value: 'Insufficient Storage'},
    {key: 508, value: 'Loop Detected'},
    {key: 599, value: '5xx'},
    {key: 999, value: 'Any Error'},
  ]

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) {
        const result: Array<Throw> = [];
        data.forEach((entry) => {
          result.push(entry);
        });
        this.result.set(result);
      }
    });
  }

  add() {
    const newCode = this.newCode();
    const newType = this.newType();
    if (!newCode || !newType) {
      return;
    }

    this.result.update((entries) => {
      entries.push({
        code: newCode,
        type: newType
      });
      return entries;
    });

    this.newCode.set(undefined);
    this.newType.set(undefined);
  }

  removeByIndex(throwIndex: number) {
    if (!this.result()[throwIndex]) {
      return;
    }

    this.result.update((entries) => {
      entries.splice(throwIndex, 1);
      return entries;
    });
  }

  setCode(index: number, code: number) {
    this.result.update((entries) => {
      entries[index].code = code;
      return entries;
    });
  }

  setType(index: number, type: string) {
    this.result.update((entries) => {
      entries[index].type = type;
      return entries;
    });
  }

  setTypeShape(index: number, typeShape?: string) {
    this.result.update((entries) => {
      entries[index].typeShape = typeShape;
      return entries;
    });
  }

  getNotUsedCodes() {
    return this.errorStatusCodes.filter((code) => {
      const selected = this.result().find((row) => {
        return row.code === code.key;
      });
      return !selected;
    });
  }

  changeValue() {
    const result: Array<Throw> = [];
    this.result().forEach((row) => {
      result.push(row);
    });

    this.dataChange.emit(result);
  }

}
